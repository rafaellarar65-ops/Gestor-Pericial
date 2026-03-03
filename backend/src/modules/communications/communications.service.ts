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
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';

type UolhostCreds = {
  login: string;
  password: string;
  imapHost: string;
  imapPort: string;
};

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappService: WhatsappService,
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
}
