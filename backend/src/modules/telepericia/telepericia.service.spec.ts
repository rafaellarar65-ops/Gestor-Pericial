import { NotFoundException } from '@nestjs/common';
import { TelepericiaService } from './telepericia.service';

describe('TelepericiaService', () => {
  const prisma = {
    teleSlot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };
  const whatsappScheduler = { syncPericiaJobs: jest.fn() };

  let service: TelepericiaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelepericiaService(prisma, context as any, whatsappScheduler as any);
  });

  it('creates tele slot (happy path)', async () => {
    prisma.teleSlot.create.mockResolvedValue({ id: 'slot-1' });
    const result = await service.createSlot({ startAt: new Date().toISOString(), endAt: new Date().toISOString() });
    expect(result.id).toBe('slot-1');
  });

  it('throws NotFoundException when booking missing slot (edge case)', async () => {
    prisma.teleSlot.findFirst.mockResolvedValue(null);
    await expect(
      service.booking({ slotId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3', periciaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3' }),
    ).rejects.toThrow(NotFoundException);
  });
});
