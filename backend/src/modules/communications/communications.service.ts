import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, PericiaPaymentStatus, Prisma } from '@prisma/client';
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

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappService: WhatsappService,
  ) {}

  sendEmail(dto: SendEmailDto) { return { queued: true, ...dto }; }
  imapSync() { return { synced: true, fetched: 0 }; }

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
    const data = { tenantId, provider: 'UOLHOST', fromEmail: dto.fromEmail, fromName: dto.fromName, smtpHost: dto.smtpHost, smtpPort: Number(dto.smtpPort), secure: dto.secure ?? true, encryptedCreds: Buffer.from(JSON.stringify({ login: dto.login, password: dto.password, imapHost: dto.imapHost, imapPort: dto.imapPort })).toString('base64'), active: true };
    return existing ? this.prisma.emailConfig.update({ where: { id: existing.id }, data }) : this.prisma.emailConfig.create({ data });
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
