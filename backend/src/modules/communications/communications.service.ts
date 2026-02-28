import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PericiaPaymentStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  AutomaticVaraChargeDto,
  BulkGrantOptInDto,
  BulkLinkInboundDto,
  BulkResendTemplateDto,
  CreateEmailTemplateDto,
  CreateLawyerDto,
  CreateMessageTemplateDto,
  GenerateHubEmailDto,
  InboxFilterDto,
  PreviewTemplateDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  UpdateMessageTemplateDto,
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';
import { WhatsappRulesEngine, type WhatsappConsentStatus } from './whatsapp.rules-engine';

interface WhatsappTenantConfig {
  freeformEnabled?: boolean;
  consentExceptionContactIds?: string[];
  linkedInboxContactIds?: string[];
  contactConsents?: Record<string, WhatsappConsentStatus>;
}

type Channel = 'whatsapp_template' | 'whatsapp_freeform' | 'clipboard' | 'wa_me_prefill';

@Injectable()
export class CommunicationsService {
  private readonly allowedPlaceholders = new Set([
    'tenant.nome',
    'pericia.processoCNJ',
    'pericia.autorNome',
    'pericia.reuNome',
    'pericia.periciadoNome',
    'pericia.dataAgendamento',
    'pericia.horaAgendamento',
    'contact.nome',
    'contact.telefone',
    'contact.email',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappService: WhatsappService,
  ) {}

  sendEmail(dto: SendEmailDto) {
    return {
      provider: 'smtp-server-side',
      queued: true,
      to: dto.to,
      subject: dto.subject,
      preview: dto.html.slice(0, 120),
    };
  }

  imapSync() {
    return {
      provider: 'imap-server-side',
      synced: true,
      fetched: 0,
      message: 'Leitura IMAP executada no backend.',
    };
  }

  createTemplate(dto: CreateEmailTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        key: dto.key,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        ...(dto.variables ? { variables: dto.variables as Prisma.InputJsonValue } : {}),
      },
    });
  }

  listTemplates() {
    return this.prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createLawyer(dto: CreateLawyerDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.lawyer.create({
      data: {
        tenantId,
        nome: dto.nome,
        ...(dto.oab ? { oab: dto.oab } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.telefone ? { telefone: dto.telefone } : {}),
      },
    });
  }

  listLawyers() {
    return this.prisma.lawyer.findMany({ orderBy: { nome: 'asc' } });
  }

  async hubGenerate(dto: GenerateHubEmailDto) {
    const template = await this.prisma.emailTemplate.findFirst({ where: { key: dto.templateKey } });
    if (!template) return { generated: false, reason: 'template-not-found' };

    let html = template.bodyHtml;
    let subject = template.subject;

    for (const [k, v] of Object.entries(dto.context ?? {})) {
      const token = `{{${k}}}`;
      html = html.split(token).join(v);
      subject = subject.split(token).join(v);
    }

    return { generated: true, templateKey: dto.templateKey, subject, html };
  }

  async upsertUolhostConfig(dto: UpsertUolhostEmailConfigDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const existing = await this.prisma.emailConfig.findFirst({ where: { provider: 'UOLHOST' } });

    const data = {
      tenantId,
      provider: 'UOLHOST',
      fromEmail: dto.fromEmail,
      ...(dto.fromName ? { fromName: dto.fromName } : {}),
      smtpHost: dto.smtpHost,
      smtpPort: Number(dto.smtpPort),
      secure: dto.secure ?? true,
      encryptedCreds: Buffer.from(JSON.stringify({
        login: dto.login,
        password: dto.password,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort,
      })).toString('base64'),
      active: true,
    };

    if (existing) {
      return this.prisma.emailConfig.update({ where: { id: existing.id }, data });
    }

    return this.prisma.emailConfig.create({ data });
  }

  async sendWhatsappMessage(dto: SendWhatsappMessageDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.whatsappService.sendTenantMessage({
      tenantId,
      to: dto.to,
      message: dto.message,
      periciaId: dto.periciaId,
    });
  }

  async listWhatsappMessages(periciaId?: string) {
    return this.prisma.whatsappMessage.findMany({
      where: {
        ...(periciaId ? { periciaId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async interpretWhatsappInbound(dto: InterpretWhatsappInboundDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const tenantConfig = await this.getWhatsappTenantConfig(tenantId);
    const linkedContactSet = new Set(tenantConfig.linkedInboxContactIds ?? []);

    const interpretation = this.whatsappRulesEngine.interpretInbound({
      body: dto.body,
      hasLinkedInboxItem: dto.hasLinkedInboxItem ?? linkedContactSet.has(dto.contactId),
    });

    if (interpretation.type === 'confirm_pericia' && dto.periciaId) {
      await this.prisma.pericia
        .update({
          where: { id: dto.periciaId },
          data: {
            metadata: {
              confirmedByWhatsapp: true,
              confirmedAt: new Date().toISOString(),
            },
          },
        })
        .catch(() => undefined);
    }

    if (interpretation.type === 'request_reschedule') {
      await this.prisma.agendaTask.create({
        data: {
          tenantId,
          periciaId: dto.periciaId,
          title: 'Reagendamento solicitado via WhatsApp',
          description: `Contato ${dto.contactId} respondeu "2" no WhatsApp e solicitou reagendamento.`,
          status: AgendaTaskStatus.TODO,
          metadata: {
            source: 'whatsapp',
            inboundBody: interpretation.normalizedBody,
            routing: 'central_scheduling',
          },
        },
      });
    }

    if (interpretation.type === 'triage_inbox_unlinked' || interpretation.type === 'triage_inbox_linked') {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          entityType: 'WHATSAPP_INBOUND',
          entityId: dto.periciaId ?? dto.contactId,
          action: interpretation.type === 'triage_inbox_unlinked' ? 'whatsapp_unlinked_inbound' : 'whatsapp_linked_inbound',
          payloadJson: {
            contactId: dto.contactId,
            body: interpretation.normalizedBody,
            routing: interpretation.type,
          },
        },
      });
    }

    return {
      interpreted: true,
      ...interpretation,
    };
  }

  async updateContactConsent(contactId: string, dto: UpdateWhatsappConsentDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const setting = await this.prisma.integrationSettings.findFirst({
      where: { tenantId, provider: 'WHATSAPP' },
    });

    const currentConfig = (setting?.config as WhatsappTenantConfig | null) ?? {};
    const updatedConfig: WhatsappTenantConfig = {
      ...currentConfig,
      contactConsents: {
        ...(currentConfig.contactConsents ?? {}),
        [contactId]: dto.consentStatus,
      },
    };

    if (setting) {
      await this.prisma.integrationSettings.update({
        where: { id: setting.id },
        data: { config: updatedConfig as Prisma.InputJsonValue },
      });
    } else {
      await this.prisma.integrationSettings.create({
        data: {
          tenantId,
          provider: 'WHATSAPP',
          config: updatedConfig as Prisma.InputJsonValue,
        },
      });
    }

    return {
      contactId,
      consentStatus: dto.consentStatus,
      updated: true,
    };
  }

  async automaticVaraCharge(dto: AutomaticVaraChargeDto) {
    const pendentes = await this.prisma.pericia.findMany({
      where: {
        varaId: dto.varaId,
        pagamentoStatus: { in: [PericiaPaymentStatus.PENDENTE, PericiaPaymentStatus.ATRASADO, PericiaPaymentStatus.PARCIAL] },
        ...(dto.periciaIds?.length ? { id: { in: dto.periciaIds } } : {}),
      },
      include: { vara: true },
      orderBy: { dataNomeacao: 'asc' },
    });

    const valorAberto = pendentes.reduce((acc, p) => {
      const previsto = Number(p.honorariosPrevistosJG ?? p.honorariosPrevistosPartes ?? 0);
      const recebido = Number(p.valorRecebidoTotal ?? 0);
      return acc + Math.max(previsto - recebido, 0);
    }, 0);

    return {
      varaId: dto.varaId,
      vara: pendentes[0]?.vara?.nome ?? null,
      pericias: pendentes.map((p) => ({ id: p.id, processoCNJ: p.processoCNJ, pagamentoStatus: p.pagamentoStatus })),
      totalPericias: pendentes.length,
      valorAberto,
      notifications: {
        whatsapp: { queued: pendentes.length > 0 },
        email: { queued: pendentes.length > 0 },
      },
    };
  }

  async createMessageTemplate(dto: CreateMessageTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const validation = this.validateMessageTemplate(dto.channel, dto.body, dto.placeholdersUsed, dto.variablesMapping);

    return this.prisma.messageTemplate.create({
      data: {
        tenantId,
        channel: dto.channel,
        name: dto.name,
        body: dto.body,
        placeholdersUsed: validation.placeholders as unknown as Prisma.InputJsonValue,
        variablesMapping: (dto.variablesMapping ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listMessageTemplates(channel?: Channel) {
    return this.prisma.messageTemplate.findMany({
      where: channel ? { channel } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMessageTemplate(id: string, dto: UpdateMessageTemplateDto) {
    const existing = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template não encontrado');

    const channel = dto.channel ?? (existing.channel as Channel);
    const body = dto.body ?? existing.body;
    const placeholders = dto.placeholdersUsed ?? ((existing.placeholdersUsed as string[] | null) ?? undefined);
    const mapping = dto.variablesMapping ?? ((existing.variablesMapping as Record<string, string> | null) ?? undefined);
    const validation = this.validateMessageTemplate(channel, body, placeholders, mapping);

    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(dto.channel ? { channel: dto.channel } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.body ? { body: dto.body } : {}),
        placeholdersUsed: validation.placeholders as unknown as Prisma.InputJsonValue,
        variablesMapping: (mapping ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async deleteMessageTemplate(id: string) {
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async previewMessageTemplate(id: string, dto: PreviewTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const template = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const pericia = dto.periciaId
      ? await this.prisma.pericia.findFirst({ where: { id: dto.periciaId, tenantId } })
      : null;

    const metadataContact = (pericia?.metadata as Record<string, unknown> | null)?.contact as Record<string, string> | undefined;
    const values: Record<string, string> = {
      'tenant.nome': tenant?.name ?? '',
      'pericia.processoCNJ': pericia?.processoCNJ ?? '',
      'pericia.autorNome': pericia?.autorNome ?? '',
      'pericia.reuNome': pericia?.reuNome ?? '',
      'pericia.periciadoNome': pericia?.periciadoNome ?? '',
      'pericia.dataAgendamento': pericia?.dataAgendamento?.toISOString().slice(0, 10) ?? '',
      'pericia.horaAgendamento': pericia?.horaAgendamento ?? '',
      'contact.nome': metadataContact?.nome ?? pericia?.periciadoNome ?? '',
      'contact.telefone': metadataContact?.telefone ?? '',
      'contact.email': metadataContact?.email ?? '',
    };

    const mapping = (template.variablesMapping as Record<string, string> | null) ?? {};
    let previewText = template.body;

    if (template.channel === 'whatsapp_template') {
      const vars = this.extractMetaVariables(template.body);
      vars.forEach((variable) => {
        const source = mapping[variable];
        const value = source ? values[source] ?? '' : '';
        previewText = previewText.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
      });
    } else {
      const placeholders = this.extractNamedPlaceholders(template.body);
      placeholders.forEach((placeholder) => {
        previewText = previewText.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), values[placeholder] ?? '');
      });
    }

    return {
      id: template.id,
      channel: template.channel,
      preview: previewText,
      context: values,
    };
  }

  async listInbox(dto: InboxFilterDto) {
    const logs = await this.prisma.activityLog.findMany({
      where: { entityType: 'WHATSAPP_MESSAGE' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const rows = logs.map((log) => {
      const payload = (log.payloadJson as Record<string, unknown> | null) ?? {};
      const tags = (payload.tags as string[] | undefined) ?? [];
      return {
        id: log.id,
        entityId: log.entityId,
        action: log.action,
        to: String(payload.to ?? ''),
        message: String(payload.message ?? ''),
        status: String(payload.status ?? ''),
        tags,
        linkedPericiaId: (payload.linkedPericiaId as string | undefined) ?? null,
        createdAt: log.createdAt,
      };
    });

    const byFilter = dto.filter
      ? rows.filter((row) => {
          if (dto.filter === 'nao_confirmados') return row.tags.includes('nao_confirmado');
          if (dto.filter === 'pediram_reagendamento') return row.tags.includes('reagendamento');
          if (dto.filter === 'falha_envio') return row.status === 'failed';
          if (dto.filter === 'optin_pendente') return row.tags.includes('optin_pendente');
          if (dto.filter === 'inbound_nao_vinculado') return row.action === 'INBOUND_WHATSAPP' && !row.linkedPericiaId;
          return true;
        })
      : rows;

    return byFilter;
  }

  async bulkResendTemplate(dto: BulkResendTemplateDto) {
    const template = await this.prisma.messageTemplate.findUnique({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const messages = await this.prisma.activityLog.findMany({ where: { id: { in: dto.messageIds } } });
    const created = await Promise.all(messages.map((msg) => {
      const payload = (msg.payloadJson as Record<string, unknown> | null) ?? {};
      return this.prisma.activityLog.create({
        data: {
          tenantId: msg.tenantId,
          entityType: 'WHATSAPP_MESSAGE',
          entityId: msg.entityId,
          action: 'OUTBOUND_TEMPLATE_RESEND',
          payloadJson: {
            ...payload,
            message: template.body,
            status: 'queued',
            resentFrom: msg.id,
          },
        },
      });
    }));

    return { resent: created.length };
  }

  async bulkGrantOptIn(dto: BulkGrantOptInDto) {
    await Promise.all(dto.messageIds.map(async (id) => {
      const current = await this.prisma.activityLog.findUnique({ where: { id } });
      if (!current) return null;
      const payload = (current.payloadJson as Record<string, unknown> | null) ?? {};
      const tags = new Set<string>((payload.tags as string[] | undefined) ?? []);
      tags.delete('optin_pendente');
      tags.add('optin_confirmado');
      return this.prisma.activityLog.update({
        where: { id },
        data: { payloadJson: { ...payload, tags: [...tags] } as Prisma.InputJsonValue },
      });
    }));

    return { updated: dto.messageIds.length };
  }

  async bulkLinkInbound(dto: BulkLinkInboundDto) {
    if (!dto.periciaId && !dto.processoId) {
      throw new BadRequestException('Informe periciaId ou processoId');
    }

    await Promise.all(dto.messageIds.map(async (id) => {
      const current = await this.prisma.activityLog.findUnique({ where: { id } });
      if (!current) return null;
      const payload = (current.payloadJson as Record<string, unknown> | null) ?? {};
      return this.prisma.activityLog.update({
        where: { id },
        data: {
          payloadJson: {
            ...payload,
            linkedPericiaId: dto.periciaId ?? null,
            linkedProcessoId: dto.processoId ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    }));

    return { linked: dto.messageIds.length };
  }

  private extractNamedPlaceholders(body: string): string[] {
    const matches = [...body.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)].map((m) => m[1]);
    return [...new Set(matches)];
  }

  private extractMetaVariables(body: string): string[] {
    const matches = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]);
    return [...new Set(matches)];
  }

  private validateMessageTemplate(
    channel: Channel,
    body: string,
    placeholdersUsed?: string[],
    variablesMapping?: Record<string, string>,
  ) {
    if (channel === 'whatsapp_template') {
      const vars = this.extractMetaVariables(body);
      if (vars.length === 0) {
        throw new BadRequestException('Template Meta deve possuir variáveis no formato {{1..n}}');
      }

      const ordered = vars.map((x) => Number(x)).sort((a, b) => a - b);
      for (let i = 0; i < ordered.length; i += 1) {
        if (ordered[i] !== i + 1) {
          throw new BadRequestException('Template Meta deve usar variáveis sequenciais {{1..n}} sem lacunas');
        }
      }

      if (!variablesMapping) {
        throw new BadRequestException('Template Meta exige variablesMapping obrigatório');
      }

      ordered.forEach((value) => {
        const key = String(value);
        if (!variablesMapping[key]) {
          throw new BadRequestException(`Mapeamento obrigatório para variável {{${key}}}`);
        }
        if (!this.allowedPlaceholders.has(variablesMapping[key])) {
          throw new BadRequestException(`Placeholder desconhecido no mapping: ${variablesMapping[key]}`);
        }
      });

      return { placeholders: ordered.map(String) };
    }

    const placeholders = placeholdersUsed?.length ? placeholdersUsed : this.extractNamedPlaceholders(body);
    const unknown = placeholders.filter((item) => !this.allowedPlaceholders.has(item));
    if (unknown.length) {
      throw new BadRequestException(`Placeholder desconhecido: ${unknown.join(', ')}`);
    }

    return { placeholders };
  }
}
