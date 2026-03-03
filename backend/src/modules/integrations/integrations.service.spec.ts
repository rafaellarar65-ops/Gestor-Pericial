import { HttpException } from '@nestjs/common';
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
    calendarIntegration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  } as any;

  const context = {
    get: jest.fn((key: string) => {
      if (key === 'tenantId') return 'tenant-1';
      if (key === 'userId') return 'user-1';
      return null;
    }),
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

  it('disconnects google integration, revokes token and anonymizes credentials', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    prisma.calendarIntegration.findUnique.mockResolvedValue({ id: 'cal-1', accessToken: 'access-token' });
    prisma.calendarIntegration.update.mockResolvedValue({ id: 'cal-1', active: false });

    const result = await service.disconnectGoogleCalendar();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(prisma.calendarIntegration.update).toHaveBeenCalledWith({
      where: { id: 'cal-1' },
      data: expect.objectContaining({
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        selectedCalendarId: null,
        selectedCalendarName: null,
        lastSyncAt: null,
        active: false,
      }),
    });
    expect(prisma.activityLog.create).toHaveBeenCalled();
    expect(result.status).toBe('disconnected');
    expect(result.revokeStatus).toBe('revoked');

    fetchSpy.mockRestore();
  });

  it('throws not found when google integration does not exist', async () => {
    prisma.calendarIntegration.findUnique.mockResolvedValue(null);

    await expect(service.disconnectGoogleCalendar()).rejects.toThrow(HttpException);
  });
});
