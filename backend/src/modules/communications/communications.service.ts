import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
} from './dto/communications.dto';
import { EmailConfigDto, UpsertUolhostEmailConfigDto } from './dto/email-config.dto';
import { EmailImapService } from './email-imap.service';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappService: WhatsappService,
    private readonly emailImapService: EmailImapService,
  ) {}

  sendEmail(dto: SendEmailDto) { return { queued: true, ...dto }; }

  async imapSync() {
    const config = await this.getTenantEmailConfig();

    try {
      await this.emailImapService.connect(config);
      const headers = await this.emailImapService.fetchHeaders(20);
      return { synced: true, fetched: headers.length, headers };
    } catch (error) {
      throw new BadGatewayException(`Falha ao sincronizar IMAP: ${this.getErrorMessage(error)}`);
    } finally {
      await this.emailImapService.disconnect();
    }
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
    const data = { tenantId, provider: 'UOLHOST', fromEmail: dto.fromEmail, fromName: dto.fromName, smtpHost: dto.smtpHost, smtpPort: dto.smtpPort, secure: dto.smtpSecure, encryptedCreds: Buffer.from(JSON.stringify({ login: dto.login, password: dto.password, imapHost: dto.imapHost, imapPort: dto.imapPort, imapSecure: dto.imapSecure })).toString('base64'), active: true };
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

  private async getTenantEmailConfig(): Promise<EmailConfigDto> {
    const tenantId = this.context.get('tenantId') ?? '';
    const config = await this.prisma.emailConfig.findFirst({ where: { tenantId, provider: 'UOLHOST', active: true } });

    if (!config) {
      throw new NotFoundException('Configuração de e-mail não encontrada para o tenant.');
    }

    let credentials: Record<string, unknown>;
    try {
      if (!config.encryptedCreds) {
        throw new BadRequestException('Credenciais IMAP não configuradas.');
      }
      credentials = JSON.parse(Buffer.from(config.encryptedCreds, 'base64').toString('utf8')) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Credenciais de e-mail inválidas ou corrompidas.');
    }

    const login = credentials.login;
    const password = credentials.password;
    const imapHost = credentials.imapHost;
    const imapPort = credentials.imapPort;
    const imapSecure = credentials.imapSecure;

    if (!login || !password || !imapHost || !imapPort) {
      throw new BadRequestException('Configuração IMAP incompleta.');
    }

    if (!config.smtpHost || !config.smtpPort) {
      throw new BadRequestException('Configuração SMTP incompleta.');
    }

    return {
      smtpHost: config.smtpHost ?? "",
      smtpPort: Number(config.smtpPort),
      smtpSecure: Boolean(config.secure),
      imapHost: String(imapHost),
      imapPort: Number(imapPort),
      imapSecure: typeof imapSecure === 'boolean' ? imapSecure : true,
      login: String(login),
      password: String(password),
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'erro desconhecido';
  }

}
