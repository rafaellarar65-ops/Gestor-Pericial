import { NotFoundException } from '@nestjs/common';
import { AgendaEventType } from '@prisma/client';
import { AgendaService } from './agenda.service';

describe('AgendaService', () => {
  const prisma = {
    agendaEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    agendaTask: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: AgendaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgendaService(prisma);
  });

  it('creates an event (happy path)', async () => {
    prisma.agendaEvent.create.mockResolvedValue({ id: 'ev-1', title: 'Perícia' });

    const result = await service.createEvent({
      title: 'Perícia',
      type: AgendaEventType.PERICIA,
      startAt: new Date().toISOString(),
    });

    expect(result.id).toBe('ev-1');
  });

  it('throws NotFoundException when updating missing event (edge case)', async () => {
    prisma.agendaEvent.findFirst.mockResolvedValue(null);
    await expect(service.updateEvent('404', { title: 'x' })).rejects.toThrow(NotFoundException);
  });
});
