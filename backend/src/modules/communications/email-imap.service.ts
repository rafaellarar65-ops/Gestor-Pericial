import { Injectable, NotFoundException } from '@nestjs/common';
import { simpleParser } from 'mailparser';
import * as Imap from 'imap-simple';
import * as nodemailer from 'nodemailer';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailImapConfigDto, EmailImapSendDto } from './dto/communications.dto';

type EmailInboxItem = {
  uid: number;
  subject: string;
  from: string;
  date?: string;
  seen: boolean;
  snippet: string;
};

@Injectable()
export class EmailImapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async saveConfig(dto: EmailImapConfigDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const existing = await this.prisma.emailConfig.findFirst({ where: { tenantId, provider: 'UOLHOST' } });
    const encryptedCreds = Buffer.from(
      JSON.stringify({
        login: dto.login,
        password: dto.password,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort,
      }),
    ).toString('base64');
    const data = {
      tenantId,
      provider: 'UOLHOST' as const,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName,
      smtpHost: dto.smtpHost,
      smtpPort: Number(dto.smtpPort),
      secure: dto.secure ?? true,
      encryptedCreds,
      active: true,
    };
    return existing
      ? this.prisma.emailConfig.update({ where: { id: existing.id }, data })
      : this.prisma.emailConfig.create({ data });
  }

  async listInbox(limit = 20): Promise<EmailInboxItem[]> {
    const connection = await this.createConnection();
    await connection.openBox('INBOX');
    const messages = await connection.search(['ALL'], {
      bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
      markSeen: false,
    });

    const normalized = messages.slice(-limit).reverse().map((message: any) => {
      const headerPart = message.parts.find((part: any) => part.which?.includes('HEADER.FIELDS'));
      const textPart = message.parts.find((part: any) => part.which === 'TEXT');
      const header = (headerPart?.body ?? {}) as Record<string, string[]>;
      const from = Array.isArray(header.from) ? header.from[0] : '';
      const subject = Array.isArray(header.subject) ? header.subject[0] : '(Sem assunto)';
      const date = Array.isArray(header.date) ? header.date[0] : undefined;
      return {
        uid: message.attributes.uid,
        subject,
        from,
        date,
        seen: message.attributes.flags?.includes('\\Seen') ?? false,
        snippet: String(textPart?.body ?? '').slice(0, 160),
      };
    });

    await connection.end();
    return normalized;
  }

  async getEmailByUid(uid: number) {
    const connection = await this.createConnection();
    await connection.openBox('INBOX');
    const messages = await connection.search([['UID', String(uid)]], {
      bodies: [''],
      markSeen: false,
    });

    const first = messages[0];
    if (!first) {
      await connection.end();
      throw new NotFoundException('Email não encontrado');
    }

    const raw = first.parts[0]?.body ?? '';
    const parsed = (await simpleParser(raw)) as any;
    await connection.end();

    return {
      uid,
      subject: parsed.subject ?? '(Sem assunto)',
      from: parsed.from?.text ?? '',
      to: parsed.to?.text ?? '',
      text: parsed.text ?? '',
      html: typeof parsed.html === 'string' ? parsed.html : undefined,
      date: parsed.date?.toISOString(),
    };
  }

  async markAsRead(uid: number) {
    const connection = await this.createConnection();
    await connection.openBox('INBOX');
    await connection.addFlags(uid, ['\\Seen']);
    await connection.end();
    return { uid, read: true };
  }

  async sendEmail(dto: EmailImapSendDto) {
    const transport = await this.createTransporter();
    const result = await transport.sendMail({
      from: dto.from,
      to: dto.to,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      inReplyTo: dto.inReplyTo,
      references: dto.references,
    });
    return { sent: true, messageId: result.messageId };
  }

  async replyEmail(uid: number, dto: Omit<EmailImapSendDto, 'subject'>) {
    const original = await this.getEmailByUid(uid);
    return this.sendEmail({
      ...dto,
      subject: `Re: ${original.subject}`,
      inReplyTo: `<uid-${uid}>`,
      references: [`<uid-${uid}>`],
    });
  }

  private async createConnection() {
    const creds = await this.getCreds();
    return Imap.connect({
      imap: {
        user: creds.login,
        password: creds.password,
        host: creds.imapHost,
        port: Number(creds.imapPort),
        tls: true,
        authTimeout: 3000,
      },
    });
  }

  private async createTransporter() {
    const config = await this.getConfig();
    const creds = await this.getCreds();
    return (nodemailer as any).createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort),
      secure: config.secure,
      auth: {
        user: creds.login,
        pass: creds.password,
      },
    });
  }

  private async getConfig() {
    const tenantId = this.context.get('tenantId') ?? '';
    const config = await this.prisma.emailConfig.findFirst({ where: { tenantId, provider: 'UOLHOST', active: true } });
    if (!config) throw new NotFoundException('Configuração de email não encontrada');
    return config;
  }

  private async getCreds() {
    const config = await this.getConfig();
    const encoded = config.encryptedCreds ?? '';
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8')) as {
      login: string;
      password: string;
      imapHost: string;
      imapPort: string;
    };
  }
}
