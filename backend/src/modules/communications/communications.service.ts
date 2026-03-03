import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, PericiaPaymentStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Response } from 'express';
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

  async listInbox(dto: InboxFilterDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const take = Math.min(dto.limit ?? 20, 100);
    const where: Prisma.EmailInboxMessageWhereInput = {
      tenantId,
      ...(dto.from ? { from: { contains: dto.from, mode: 'insensitive' } } : {}),
      ...(dto.subject ? { subject: { contains: dto.subject, mode: 'insensitive' } } : {}),
    };

    if (dto.cursor) {
      const [cursorDate, cursorId] = dto.cursor.split('|');
      const parsedDate = new Date(cursorDate);
      if (!cursorId || Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Cursor inválido. Use o formato <dateISO>|<id>.');
      }
      where.OR = [
        { date: { lt: parsedDate } },
        { date: parsedDate, id: { lt: cursorId } },
      ];
    }

    const page = dto.page ?? 1;
    const skip = dto.cursor ? 0 : (page - 1) * take;
    const rows = await this.prisma.emailInboxMessage.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip,
      take: take + 1,
    });

    const hasNextPage = rows.length > take;
    const items = rows.slice(0, take);
    const nextCursor = hasNextPage ? `${items[items.length - 1].date.toISOString()}|${items[items.length - 1].id}` : null;
    return {
      items,
      page,
      limit: take,
      nextCursor,
      hasNextPage,
    };
  }

  async fetchFullEmail(id: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const message = await this.prisma.emailInboxMessage.findFirst({
      where: { id, tenantId },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    });

    if (!message) throw new NotFoundException('Email não encontrado');

    return {
      ...message,
      attachments: message.attachments.map((att) => ({
        id: att.id,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        downloadUrl: `/api/communications/inbox/attachments/download?token=${this.signAttachmentToken(tenantId, att.id)}`,
      })),
    };
  }

  async downloadInboxAttachment(token: string, res: Response) {
    const tenantId = this.context.get('tenantId') ?? '';
    const attachmentId = this.verifyAttachmentToken(token, tenantId);
    const attachment = await this.prisma.emailInboxAttachment.findFirst({ where: { id: attachmentId, tenantId } });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    const payload = this.decodeInlinePayload(attachment.storageKey);
    res.setHeader('Content-Type', attachment.contentType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
    res.setHeader('Content-Length', payload.length.toString());
    return payload;
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
}
