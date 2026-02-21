import { NotificationChannel } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notificationConfig: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as any;

  const gateway = {
    broadcast: jest.fn(),
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma, gateway as any, context as any);
  });

  it('returns realtime payload (happy path)', () => {
    const result = service.realtime({ title: 'Novo evento', message: 'Perícia agendada' });
    expect(result.delivered).toBe(true);
    expect(gateway.broadcast).toHaveBeenCalledWith('notification:new', expect.any(Object));
  });

  it('creates notification rule when missing (edge case)', async () => {
    prisma.notificationConfig.findFirst.mockResolvedValue(null);
    prisma.notificationConfig.create.mockResolvedValue({ id: 'n-1' });

    const result = await service.rules({ channel: NotificationChannel.EMAIL });
    expect(result.id).toBe('n-1');
  });
});
