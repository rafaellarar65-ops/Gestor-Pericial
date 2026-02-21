import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  const prisma = {
    integrationSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cnjSync: {
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const context = {
    get: jest.fn().mockReturnValue('user-1'),
  } as any;

  let service: IntegrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegrationsService(prisma, context);
  });

  it('creates integration setting when missing (happy path)', async () => {
    prisma.integrationSettings.findFirst.mockResolvedValue(null);
    prisma.integrationSettings.create.mockResolvedValue({ id: 'cfg-1' });

    const result = await service.saveSettings({ provider: 'DATAJUD', config: { apiKey: 'x' } });

    expect(result.id).toBe('cfg-1');
  });

  it('returns cached result for repeated CNJ query (edge case)', async () => {
    prisma.cnjSync.create.mockResolvedValue({ id: 'sync-1' });
    prisma.cnjSync.update.mockResolvedValue({ id: 'sync-1', payload: { cnj: '123' } });

    const first = await service.datajudByCnj({ cnj: '00000000000000000000' });
    const second = await service.datajudByCnj({ cnj: '00000000000000000000' });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
  });
});
