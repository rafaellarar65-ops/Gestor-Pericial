import { CommunicationsService } from './communications.service';
import { WhatsappRulesEngine } from './whatsapp.rules-engine';

describe('CommunicationsService', () => {
  const prisma = {
    emailTemplate: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    lawyer: { create: jest.fn(), findMany: jest.fn() },
    integrationSettings: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    activityLog: { create: jest.fn(), findMany: jest.fn() },
    pericia: { update: jest.fn(), findMany: jest.fn() },
    agendaTask: { create: jest.fn() },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: CommunicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunicationsService(prisma, context as any, new WhatsappRulesEngine());
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

  it('blocks automation when consent is not granted and no tenant exception exists', async () => {
    prisma.integrationSettings.findFirst.mockResolvedValue({ config: { freeformEnabled: true, consentExceptionContactIds: [] } });

    const result = await service.sendWhatsappMessage({
      to: '55999999999',
      message: 'Oi',
      messageType: 'freeform',
      consentStatus: 'denied',
      isAutomation: true,
      lastInboundAt: new Date().toISOString(),
      contactId: 'c-1',
    });

    expect(result.queued).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('automation-blocked-missing-consent');
  });
});
