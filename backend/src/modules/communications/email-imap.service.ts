import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import { EmailConfigDto } from './dto/email-config.dto';

@Injectable()
export class EmailImapService {
  private client: ImapFlow | null = null;

  async connect(config: EmailConfigDto): Promise<void> {
    await this.disconnect();

    const client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapSecure,
      auth: {
        user: config.login,
        pass: config.password,
      },
    });

    await client.connect();
    await client.mailboxOpen('INBOX');
    this.client = client;
  }

  async fetchHeaders(limit = 20, search?: string, page = 1) {
    const client = this.getClient();
    const allUids = await client.search(search?.trim() ? { text: search.trim() } : { all: true });
    const resolvedUids = Array.isArray(allUids) ? allUids : [];
    const sorted = [...resolvedUids].sort((a, b) => b - a);
    const start = Math.max(0, (Math.max(page, 1) - 1) * Math.max(limit, 1));
    const selectedUids = sorted.slice(start, start + Math.max(limit, 1));

    if (!selectedUids.length) {
      return [];
    }

    const messages = await client.fetchAll(selectedUids, {
      uid: true,
      flags: true,
      envelope: true,
      internalDate: true,
    });

    return messages.map((message) => ({
      id: message.seq,
      uid: message.uid,
      from: message.envelope?.from?.map((entry) => entry.address).filter(Boolean).join(', ') ?? null,
      subject: message.envelope?.subject ?? null,
      date: message.internalDate ?? message.envelope?.date ?? null,
      flags: Array.from(message.flags ?? []),
    }));
  }

  async fetchFullEmail(uid: number) {
    const client = this.getClient();
    const download = await client.download(uid);
    if (!download?.content) {
      throw new InternalServerErrorException('Não foi possível baixar o conteúdo do e-mail.');
    }

    const parsed: ParsedMail = await simpleParser(download.content);

    return {
      uid,
      subject: parsed.subject ?? null,
      from: parsed.from?.text ?? null,
      to: Array.isArray(parsed.to) ? parsed.to.map((entry) => entry.text).join(', ') : parsed.to?.text ?? null,
      date: parsed.date ?? null,
      html: parsed.html ? String(parsed.html) : null,
      text: parsed.text ?? null,
      attachments: parsed.attachments.map((attachment: ParsedMail['attachments'][number]) => ({
        filename: attachment.filename ?? null,
        contentType: attachment.contentType,
        size: attachment.size,
        contentDisposition: attachment.contentDisposition,
        checksum: attachment.checksum,
        contentId: attachment.cid ?? null,
      })),
    };
  }

  async markAsRead(uid: number): Promise<void> {
    const client = this.getClient();
    await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
  }

  async markAsUnread(uid: number): Promise<void> {
    const client = this.getClient();
    await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    const client = this.client;
    this.client = null;

    if (client.usable) {
      await client.logout();
    }
  }

  private getClient(): ImapFlow {
    if (!this.client?.usable) {
      throw new InternalServerErrorException('Conexão IMAP não está ativa.');
    }
    return this.client;
  }
}
