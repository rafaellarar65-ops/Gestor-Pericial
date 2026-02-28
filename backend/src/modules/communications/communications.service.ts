import { Injectable } from '@nestjs/common';
import { AgendaTaskStatus, PericiaPaymentStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutomaticVaraChargeDto,
  CreateEmailTemplateDto,
  CreateLawyerDto,
  GenerateHubEmailDto,
  InterpretWhatsappInboundDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  UpdateWhatsappConsentDto,
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';
import { WhatsappRulesEngine, type WhatsappConsentStatus } from './whatsapp.rules-engine';

interface WhatsappTenantConfig {
  freeformEnabled?: boolean;
  consentExceptionContactIds?: string[];
  linkedInboxContactIds?: string[];
  contactConsents?: Record<string, WhatsappConsentStatus>;
}

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappRulesEngine: WhatsappRulesEngine,
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
    const tenantConfig = await this.getWhatsappTenantConfig(tenantId);
    const contactConsents = tenantConfig.contactConsents ?? {};

    const consentStatus = dto.consentStatus ?? (dto.contactId ? contactConsents[dto.contactId] : undefined) ?? 'unknown';
    const evaluation = this.whatsappRulesEngine.evaluateAutomation({
      consentStatus,
      isAutomation: dto.isAutomation ?? true,
      messageType: dto.messageType ?? 'freeform',
      lastInboundAt: dto.lastInboundAt ? new Date(dto.lastInboundAt) : undefined,
      freeformEnabled: tenantConfig.freeformEnabled ?? false,
      consentExceptionContactIds: tenantConfig.consentExceptionContactIds ?? [],
      contactId: dto.contactId,
    });

    if (!evaluation.allowed) {
      return {
        queued: false,
        blocked: true,
        reason: evaluation.reason,
        serviceWindowOpen: evaluation.serviceWindowOpen,
        serviceWindowHours: evaluation.serviceWindowHours,
      };
    }

    const log = await this.prisma.activityLog.create({
      data: {
        tenantId,
        entityType: 'WHATSAPP_MESSAGE',
        entityId: dto.periciaId ?? dto.to,
        action: 'OUTBOUND_WHATSAPP_API',
        payloadJson: {
          to: dto.to,
          message: dto.message,
          provider: 'whatsapp-cloud-api',
          status: 'queued',
          sentAt: new Date().toISOString(),
          messageType: dto.messageType ?? 'freeform',
          consentStatus,
          serviceWindowOpen: evaluation.serviceWindowOpen,
          serviceWindowHours: evaluation.serviceWindowHours,
        },
      },
    });

    return {
      queued: true,
      provider: 'whatsapp-cloud-api',
      messageId: log.id,
      serviceWindowOpen: evaluation.serviceWindowOpen,
      serviceWindowHours: evaluation.serviceWindowHours,
    };
  }

  async listWhatsappMessages(periciaId?: string) {
    return this.prisma.activityLog.findMany({
      where: {
        entityType: 'WHATSAPP_MESSAGE',
        ...(periciaId ? { entityId: periciaId } : {}),
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

  private async getWhatsappTenantConfig(tenantId: string): Promise<WhatsappTenantConfig> {
    const setting = await this.prisma.integrationSettings.findFirst({
      where: { tenantId, provider: 'WHATSAPP' },
    });

    return (setting?.config as WhatsappTenantConfig | null) ?? {};
  }
}
