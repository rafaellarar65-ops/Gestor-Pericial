import { BadRequestException } from '@nestjs/common';
import { TelepericiaService } from './telepericia.service';

describe('TelepericiaService', () => {
  const prisma = {
    telepericiaSlot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    telepericiaSlotItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    pericia: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: TelepericiaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelepericiaService(prisma, context as any);
  });

  it('creates tele slot with normalized payload', async () => {
    prisma.telepericiaSlot.create.mockResolvedValue({ id: 'slot-1' });

    const result = await service.createSlot({
      date: '2026-02-28',
      startTime: '08:00',
      durationMinutes: 120,
      appointmentDurationMinutes: 30,
      gapMinutes: 10,
    });

    expect(result.id).toBe('slot-1');
    expect(prisma.telepericiaSlot.create).toHaveBeenCalled();
  });

  it('throws when slot capacity is exceeded during assign', async () => {
    prisma.telepericiaSlot.findFirst.mockResolvedValue({
      id: 'slot-1',
      tenantId: 't-1',
      date: new Date('2026-02-28'),
      startTime: '08:00',
      durationMinutes: 30,
      appointmentDurationMinutes: 30,
      gapMinutes: 0,
      capacity: 1,
      items: [],
    });
    prisma.pericia.findFirst.mockResolvedValue({ id: 'p-1' });
    prisma.telepericiaSlotItem.findMany.mockResolvedValue([{ id: 'item-1', periciaId: 'p-2', orderIndex: 0 }]);

    await expect(service.assign('slot-1', { periciaId: 'p-1' })).rejects.toThrow(BadRequestException);
  });

  it('updates pericia scheduling at assign time', async () => {
    prisma.telepericiaSlot.findFirst.mockResolvedValue({
      id: 'slot-1',
      tenantId: 't-1',
      date: new Date('2026-02-28'),
      startTime: '08:00',
      durationMinutes: 120,
      appointmentDurationMinutes: 30,
      gapMinutes: 10,
      capacity: 3,
      items: [],
    });
    prisma.pericia.findFirst.mockResolvedValue({ id: 'p-1' });
    prisma.telepericiaSlotItem.findMany.mockResolvedValue([]);
    prisma.telepericiaSlotItem.create.mockResolvedValue({ id: 'item-1', orderIndex: 0, periciaId: 'p-1' });

    await service.assign('slot-1', { periciaId: 'p-1' });

    expect(prisma.pericia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p-1' },
        data: expect.objectContaining({ agendada: true }),
      }),
    );
  });
});
