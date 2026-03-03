import { EmailImapController } from './email-imap.controller';

describe('EmailImapController', () => {
  const service = {
    saveConfig: jest.fn(),
    listInbox: jest.fn(),
    getEmailByUid: jest.fn(),
    markAsRead: jest.fn(),
    sendEmail: jest.fn(),
    replyEmail: jest.fn(),
  } as any;

  let controller: EmailImapController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EmailImapController(service);
  });

  it('salvar config', async () => {
    service.saveConfig.mockResolvedValue({ id: 'cfg-1' });
    const result = await controller.saveConfig({
      fromEmail: 'from@test.com',
      smtpHost: 'smtp.test',
      smtpPort: '465',
      imapHost: 'imap.test',
      imapPort: '993',
      login: 'user',
      password: 'pass',
    });
    expect(service.saveConfig).toHaveBeenCalled();
    expect(result.id).toBe('cfg-1');
  });

  it('listar inbox', async () => {
    service.listInbox.mockResolvedValue([{ uid: 1 }]);
    const result = await controller.listInbox('10');
    expect(service.listInbox).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
  });

  it('abrir email por UID', async () => {
    service.getEmailByUid.mockResolvedValue({ uid: 99 });
    const result = await controller.getByUid(99);
    expect(service.getEmailByUid).toHaveBeenCalledWith(99);
    expect(result.uid).toBe(99);
  });

  it('marcar lido', async () => {
    service.markAsRead.mockResolvedValue({ uid: 2, read: true });
    const result = await controller.markRead(2);
    expect(service.markAsRead).toHaveBeenCalledWith(2);
    expect(result.read).toBe(true);
  });

  it('enviar email/reply', async () => {
    service.sendEmail.mockResolvedValue({ sent: true });
    service.replyEmail.mockResolvedValue({ sent: true });

    const sent = await controller.sendEmail({ from: 'a@test.com', to: 'b@test.com', subject: 'Oi', text: 'Body' });
    const reply = await controller.replyEmail(10, { from: 'a@test.com', to: 'b@test.com', text: 'Reply' });

    expect(sent.sent).toBe(true);
    expect(reply.sent).toBe(true);
    expect(service.replyEmail).toHaveBeenCalledWith(10, expect.any(Object));
  });
});
