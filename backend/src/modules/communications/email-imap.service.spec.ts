import { NotFoundException } from '@nestjs/common';
import * as Imap from 'imap-simple';
import * as mailparser from 'mailparser';
import * as nodemailer from 'nodemailer';
import { EmailImapService } from './email-imap.service';

jest.mock('imap-simple', () => ({
  connect: jest.fn(),
}));

jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailImapService', () => {
  const prisma = {
    emailConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
  const context = { get: jest.fn().mockReturnValue('tenant-1') } as any;

  let service: EmailImapService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailImapService(prisma, context);
  });

  it('salva configuração criando registro quando não existe', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue(null);
    prisma.emailConfig.create.mockResolvedValue({ id: 'cfg-1' });

    const result = await service.saveConfig({
      fromEmail: 'from@test.com',
      smtpHost: 'smtp.test',
      smtpPort: '465',
      imapHost: 'imap.test',
      imapPort: '993',
      login: 'user',
      password: 'pass',
      secure: true,
    });

    expect(prisma.emailConfig.create).toHaveBeenCalled();
    expect(result.id).toBe('cfg-1');
  });

  it('lista inbox com conexão IMAP mockada', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue({
      smtpHost: 'smtp.test',
      smtpPort: 465,
      secure: true,
      encryptedCreds: Buffer.from(JSON.stringify({ login: 'u', password: 'p', imapHost: 'imap.test', imapPort: '993' })).toString('base64'),
    });
    const end = jest.fn();
    const openBox = jest.fn();
    const search = jest.fn().mockResolvedValue([
      {
        attributes: { uid: 42, flags: [] },
        parts: [
          { which: 'HEADER.FIELDS (FROM SUBJECT DATE)', body: { from: ['A <a@test.com>'], subject: ['Assunto'], date: ['2026-01-01'] } },
          { which: 'TEXT', body: 'Corpo de teste' },
        ],
      },
    ]);
    (Imap.connect as jest.Mock).mockResolvedValue({ openBox, search, end });

    const result = await service.listInbox();

    expect(openBox).toHaveBeenCalledWith('INBOX');
    expect(result[0]).toMatchObject({ uid: 42, subject: 'Assunto' });
  });

  it('abre email por UID e marca como lido', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue({
      smtpHost: 'smtp.test',
      smtpPort: 465,
      secure: true,
      encryptedCreds: Buffer.from(JSON.stringify({ login: 'u', password: 'p', imapHost: 'imap.test', imapPort: '993' })).toString('base64'),
    });

    const end = jest.fn();
    const openBox = jest.fn();
    const search = jest.fn().mockResolvedValue([{ parts: [{ body: 'raw-message' }] }]);
    const addFlags = jest.fn();
    (Imap.connect as jest.Mock).mockResolvedValue({ openBox, search, addFlags, end });
    (mailparser.simpleParser as jest.Mock).mockResolvedValue({ subject: 'S', from: { text: 'x@test.com' }, to: { text: 'y@test.com' }, text: 'body' });

    const opened = await service.getEmailByUid(9);
    const marked = await service.markAsRead(9);

    expect(opened.uid).toBe(9);
    expect(marked).toEqual({ uid: 9, read: true });
    expect(addFlags).toHaveBeenCalledWith(9, ['\\Seen']);
  });

  it('envia email e reply com nodemailer mockado', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue({
      smtpHost: 'smtp.test',
      smtpPort: 465,
      secure: true,
      encryptedCreds: Buffer.from(JSON.stringify({ login: 'u', password: 'p', imapHost: 'imap.test', imapPort: '993' })).toString('base64'),
    });

    const end = jest.fn();
    const openBox = jest.fn();
    const search = jest.fn().mockResolvedValue([{ parts: [{ body: 'raw-message' }] }]);
    (Imap.connect as jest.Mock).mockResolvedValue({ openBox, search, end });
    (mailparser.simpleParser as jest.Mock).mockResolvedValue({ subject: 'Original', from: { text: 'x@test.com' }, to: { text: 'y@test.com' }, text: 'body' });

    const sendMail = jest.fn().mockResolvedValue({ messageId: 'mid-1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const sent = await service.sendEmail({ from: 'a@test.com', to: 'b@test.com', subject: 'Oi', text: 'Body' });
    const replied = await service.replyEmail(10, { from: 'a@test.com', to: 'b@test.com', text: 'reply' });

    expect(sent.sent).toBe(true);
    expect(replied.sent).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('lança erro ao abrir UID inexistente', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue({
      smtpHost: 'smtp.test',
      smtpPort: 465,
      secure: true,
      encryptedCreds: Buffer.from(JSON.stringify({ login: 'u', password: 'p', imapHost: 'imap.test', imapPort: '993' })).toString('base64'),
    });
    const end = jest.fn();
    const openBox = jest.fn();
    const search = jest.fn().mockResolvedValue([]);
    (Imap.connect as jest.Mock).mockResolvedValue({ openBox, search, end });

    await expect(service.getEmailByUid(123)).rejects.toBeInstanceOf(NotFoundException);
  });
});
