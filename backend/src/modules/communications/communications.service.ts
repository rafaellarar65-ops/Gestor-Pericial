import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { NotificationChannel, PericiaPaymentStatus, Prisma } from '@prisma/client';
import { decryptPayload, encryptPayload } from '../../common/crypto.util';
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
  InterpretWhatsappInboundDto,
  PreviewTemplateDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  UpdateMessageTemplateDto,
  UpdateWhatsappConsentDto,
} from './dto/communications.dto';
import { EmailConfigDto, UpsertUolhostEmailConfigDto } from './dto/email-config.dto';
import { EmailImapService } from './email-imap.service';

type UolhostCreds = {
  login: string;
  password: string;
  imapHost: string;
  imapPort: string;
};

type Channel = 'whatsapp_template' | 'whatsapp_freeform' | 'clipboard' | 'wa_me_prefill';

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
    private readonly emailImapService: EmailImapService,
  ) {}

  private mapUolhostConfigResponse(config: {
    id: string;
    provider: string;
    fromEmail: string;
    fromName: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    secure: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: config.id,
      provider: config.provider,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      smtpHost: config.smtpHost ?? '',
      smtpPort: config.smtpPort ?? 0,
      secure: config.secure,
      active: config.active,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private async getUolhostConfigWithDecryptedCreds() {
    const tenantId = this.context.get('tenantId') ?? '';
    const config = await this.prisma.emailConfig.findFirst({ where: { tenantId, provider: 'UOLHOST', active: true } });

    if (!config) {
      throw new NotFoundException('Configuração de email UOLHOST não encontrada');
    }

    try {
      if (!config.encryptedCreds) {
        throw new Error('Credenciais criptografadas ausentes');
      }
      const creds = decryptPayload<UolhostCreds>(config.encryptedCreds);
      return { config, creds };
    } catch {
      throw new InternalServerErrorException('Falha ao descriptografar credenciais de email. Verifique EMAIL_CONFIG_CRYPTO_KEY');
    }
  }

  async sendEmail(dto: SendEmailDto) {
    const { config, creds } = await this.getUolhostConfigWithDecryptedCreds();
    return { queued: true, to: dto.to, subject: dto.subject, fromEmail: config.fromEmail, smtpHost: config.smtpHost, smtpPort: config.smtpPort, secure: config.secure, login: creds.login };
  }

  async imapSync() {
    const { creds } = await this.getUolhostConfigWithDecryptedCreds();
    return { synced: true, fetched: 0, imapHost: creds.imapHost, imapPort: Number(creds.imapPort) };
  }

  createTemplate(dto: CreateEmailTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.emailTemplate.create({ data: { tenantId, key: dto.key, subject: dto.subject, bodyHtml: dto.bodyHtml, bodyText: dto.bodyText, variables: (dto.variables ?? {}) as Prisma.InputJsonValue } });
  }
  listTemplates() { return this.prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } }); }

  createLawyer(dto: CreateLawyerDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.lawyer.create({ data: { tenantId, nome: dto.nome, oab: dto.oab, email: dto.email, telefone: dto.telefone } });
  }
  listLawyers() { return this.prisma.lawyer.findMany({ orderBy: { nome: 'asc' } }); }

  async hubGenerate(dto: GenerateHubEmailDto) {
    const template = await this.prisma.emailTemplate.findFirst({ where: { key: dto.templateKey } });
    if (!template) return { generated: false };
    return { generated: true, subject: template.subject, html: template.bodyHtml };
  }

  async upsertUolhostConfig(dto: UpsertUolhostEmailConfigDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const existing = await this.prisma.emailConfig.findFirst({ where: { tenantId, provider: 'UOLHOST' } });
    const data = {
      tenantId,
      provider: 'UOLHOST',
      fromEmail: dto.fromEmail,
      fromName: dto.fromName,
      smtpHost: dto.smtpHost,
      smtpPort: Number(dto.smtpPort),
      secure: dto.secure ?? true,
      encryptedCreds: encryptPayload({ login: dto.login, password: dto.password, imapHost: dto.imapHost, imapPort: dto.imapPort }),
      active: true,
    };
    const saved = existing
      ? await this.prisma.emailConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.emailConfig.create({ data });

    return this.mapUolhostConfigResponse(saved);
  }

  sendWhatsappMessage(dto: SendWhatsappMessageDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.whatsappService.sendTenantMessage({ tenantId, to: dto.to, message: dto.message, periciaId: dto.periciaId });
  }

  async listWhatsappMessages(periciaId?: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.whatsappMessage.findMany({ where: { tenantId, ...(periciaId ? { periciaId } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  interpretWhatsappInbound(dto: InterpretWhatsappInboundDto) { return { interpreted: true, ...dto }; }
  updateContactConsent(contactId: string, dto: UpdateWhatsappConsentDto) { return { contactId, consentStatus: dto.consentStatus, updated: true }; }

  async createMessageTemplate(dto: CreateMessageTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.messageTemplate.create({ data: { tenantId, name: dto.name, channel: NotificationChannel.WHATSAPP, body: dto.body, placeholders: (dto.placeholdersUsed ?? []) as Prisma.InputJsonValue, metaMappings: (dto.variablesMapping ?? {}) as Prisma.InputJsonValue } });
  }

  listMessageTemplates(_channel?: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.messageTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async updateMessageTemplate(id: string, dto: UpdateMessageTemplateDto) {
    return this.prisma.messageTemplate.update({ where: { id }, data: { ...(dto.name ? { name: dto.name } : {}), ...(dto.body ? { body: dto.body } : {}), ...(dto.placeholdersUsed ? { placeholders: dto.placeholdersUsed as Prisma.InputJsonValue } : {}), ...(dto.variablesMapping ? { metaMappings: dto.variablesMapping as Prisma.InputJsonValue } : {}) } });
  }

  async deleteMessageTemplate(id: string) { await this.prisma.messageTemplate.delete({ where: { id } }); return { deleted: true }; }

  async previewMessageTemplate(id: string, _dto: PreviewTemplateDto) {
    const template = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    return { id: template.id, channel: template.channel, preview: template.body };
  }

  listInbox(_dto: InboxFilterDto) { return this.prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }

  async getInboxByUid(uid: string) {
    const item = await this.prisma.activityLog.findUnique({ where: { id: uid } });
    if (!item) throw new NotFoundException('Item da inbox não encontrado');
    return item;
  }
  bulkResendTemplate(dto: BulkResendTemplateDto) { return { resent: dto.messageIds.length }; }
  bulkGrantOptIn(dto: BulkGrantOptInDto) { return { updated: dto.messageIds.length }; }
  bulkLinkInbound(dto: BulkLinkInboundDto) { return { linked: dto.messageIds.length, periciaId: dto.periciaId }; }

  async automaticVaraCharge(dto: AutomaticVaraChargeDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const pericias = await this.prisma.pericia.findMany({ where: { tenantId, ...(dto.periciaIds?.length ? { id: { in: dto.periciaIds } } : {}) } });
    const charged = pericias.filter((p) => p.pagamentoStatus !== PericiaPaymentStatus.PAGO).length;
    return { varaId: dto.varaId, charged };
  }

  private signAttachmentToken(tenantId: string, attachmentId: string): string {
    const expiresAt = Date.now() + 1000 * 60 * 10;
    const payload = `${tenantId}|${attachmentId}|${expiresAt}`;
    const signature = createHmac('sha256', this.getAttachmentSecret()).update(payload).digest('hex');
    return Buffer.from(`${payload}|${signature}`, 'utf8').toString('base64url');
  }

  private verifyAttachmentToken(token: string, tenantId: string): string {
    try {
      const raw = Buffer.from(token, 'base64url').toString('utf8');
      const [tokenTenantId, attachmentId, expiresAtRaw, signature] = raw.split('|');
      const payload = `${tokenTenantId}|${attachmentId}|${expiresAtRaw}`;
      const expected = createHmac('sha256', this.getAttachmentSecret()).update(payload).digest('hex');
      if (!signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new BadRequestException('Token de download inválido.');
      }
      if (tokenTenantId !== tenantId) {
        throw new BadRequestException('Token não pertence ao tenant atual.');
      }
      if (Number(expiresAtRaw) < Date.now()) {
        throw new BadRequestException('Token de download expirado.');
      }
      return attachmentId;
    } catch {
      throw new BadRequestException('Token de download inválido.');
    }
  }

  private decodeInlinePayload(storageKey: string): Buffer {
    const INLINE_PREFIX = 'inline://base64/';
    if (!storageKey.startsWith(INLINE_PREFIX)) {
      throw new NotFoundException('Conteúdo do anexo não disponível para download.');
    }
    return Buffer.from(storageKey.slice(INLINE_PREFIX.length), 'base64');
  }

  private getAttachmentSecret(): string {
    return process.env.INBOX_ATTACHMENT_SECRET || process.env.JWT_SECRET || 'inbox-attachment-dev-secret';
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
