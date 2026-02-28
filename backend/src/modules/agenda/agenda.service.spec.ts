import { NotFoundException } from '@nestjs/common';
import { AgendaEventStatus, AgendaEventType } from '@prisma/client';
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

  const context = {
    get: jest.fn((key: string) => (key === 'tenantId' ? 't-1' : 'u-1')),
  };

  let service: AgendaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgendaService(prisma, context as any);
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

  it('appends status history when status changes', async () => {
    prisma.agendaEvent.findFirst.mockResolvedValue({
      id: 'ev-1',
      status: AgendaEventStatus.AGENDADA,
      statusHistory: [],
    });
    prisma.agendaEvent.update.mockResolvedValue({ id: 'ev-1' });

    await service.updateEvent('ev-1', {
      status: AgendaEventStatus.CANCELADA,
      statusChangeReason: 'Paciente não compareceu',
    });

    expect(prisma.agendaEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AgendaEventStatus.CANCELADA,
          statusHistory: [
            expect.objectContaining({
              from: AgendaEventStatus.AGENDADA,
              to: AgendaEventStatus.CANCELADA,
              reason: 'Paciente não compareceu',
              changedBy: 'u-1',
            }),
          ],
        }),
      }),
    );
  });
});
