import { CommunicationsService } from './communications.service';

describe('CommunicationsService', () => {
  const prisma = {
    emailTemplate: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    lawyer: { create: jest.fn(), findMany: jest.fn() },
    whatsappMessage: { findMany: jest.fn() },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };
  const whatsappService = { sendTenantMessage: jest.fn() };

  let service: CommunicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunicationsService(prisma, context as any, whatsappService as any);
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
});
