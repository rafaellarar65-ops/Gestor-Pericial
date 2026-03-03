import { decryptPayload } from '../../common/crypto.util';
import { CommunicationsService } from './communications.service';

describe('CommunicationsService', () => {
  const prisma = {
    emailTemplate: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    emailConfig: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    lawyer: { create: jest.fn(), findMany: jest.fn() },
    whatsappMessage: { findMany: jest.fn() },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };
  const whatsappService = { sendTenantMessage: jest.fn() };

  let service: CommunicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_CONFIG_CRYPTO_KEY = '12345678901234567890123456789012';
    service = new CommunicationsService(prisma, context as any, whatsappService as any);
  });

  afterEach(() => {
    delete process.env.EMAIL_CONFIG_CRYPTO_KEY;
  });

  it('creates template (happy path)', async () => {
    prisma.emailTemplate.create.mockResolvedValue({ id: 'tpl-1' });
    const result = await service.createTemplate({ key: 'k1', subject: 's', bodyHtml: '<b>h</b>' });
    expect(result.id).toBe('tpl-1');
  });

  it('returns template-not-found on hub generate missing template (edge case)', async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(null);
    const result = await service.hubGenerate({ templateKey: 'missing' });
    expect(result.generated).toBe(false);
  });

  it('delegates whatsapp send to provider service', async () => {
    whatsappService.sendTenantMessage.mockResolvedValue({ queued: true, messageId: 'w-1' });
    const result = await service.sendWhatsappMessage({ to: '5511999999999', message: 'oi' });
    expect(whatsappService.sendTenantMessage).toHaveBeenCalled();
    expect(result.messageId).toBe('w-1');
  });

  it('persists encrypted credentials and does not return password in response', async () => {
    prisma.emailConfig.findFirst.mockResolvedValue(null);
    prisma.emailConfig.create.mockImplementation(async ({ data }: any) => ({
      id: 'cfg-1',
      ...data,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    }));

    const result = await service.upsertUolhostConfig({
      fromEmail: 'no-reply@example.com',
      fromName: 'Perícias',
      smtpHost: 'smtp.example.com',
      smtpPort: '465',
      imapHost: 'imap.example.com',
      imapPort: '993',
      login: 'user@example.com',
      password: 'SuperSecret#123',
      secure: true,
    });

    const savedEncryptedCreds = prisma.emailConfig.create.mock.calls[0][0].data.encryptedCreds;
    expect(savedEncryptedCreds).not.toContain('SuperSecret#123');

    const decrypted = decryptPayload<{ login: string; password: string; imapHost: string; imapPort: string }>(savedEncryptedCreds, process.env.EMAIL_CONFIG_CRYPTO_KEY);
    expect(decrypted.password).toBe('SuperSecret#123');
    expect(decrypted.login).toBe('user@example.com');

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('encryptedCreds');
  });
});
