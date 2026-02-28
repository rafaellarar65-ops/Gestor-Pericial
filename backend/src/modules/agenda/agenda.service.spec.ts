import { NotFoundException } from '@nestjs/common';
import { AgendaEventStatus, AgendaEventType } from '@prisma/client';
import { AgendaService } from './agenda.service';

describe('AgendaService', () => {
  const prisma = {
    agendaEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
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
    prisma.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) => Promise.all(ops));
    service = new AgendaService(prisma, context as any);
  });

  it('creates an event with tenantId from context', async () => {
    prisma.agendaEvent.create.mockResolvedValue({ id: 'ev-1', title: 'Perícia' });

    await service.createEvent({
      title: 'Perícia',
      type: AgendaEventType.PERICIA,
      startAt: new Date().toISOString(),
    });

    expect(prisma.agendaEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't-1' }),
      }),
    );
  });

  it('lists events scoped by tenant', async () => {
    prisma.agendaEvent.findMany.mockResolvedValue([]);

    await service.listEvents();

    expect(prisma.agendaEvent.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't-1' },
      orderBy: { startAt: 'asc' },
    });
  });

  it('lists tasks scoped by tenant', async () => {
    prisma.agendaTask.findMany.mockResolvedValue([]);

    await service.listTasks();

    expect(prisma.agendaTask.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't-1' },
      orderBy: { dueAt: 'asc' },
    });
  });

  it('updates event by id + tenantId and returns updated entity', async () => {
    prisma.agendaEvent.findFirst
      .mockResolvedValueOnce({ id: 'ev-1', tenantId: 't-1' })
      .mockResolvedValueOnce({ id: 'ev-1', tenantId: 't-1', title: 'Atualizado' });
    prisma.agendaEvent.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.updateEvent('ev-1', { title: 'Atualizado' });

    expect(prisma.agendaEvent.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'ev-1', tenantId: 't-1' },
    });
    expect(prisma.agendaEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'ev-1', tenantId: 't-1' },
      data: expect.objectContaining({ title: 'Atualizado' }),
    });
    expect(result).toEqual({ id: 'ev-1', tenantId: 't-1', title: 'Atualizado' });
  });

  it('throws NotFoundException when updating missing event for tenant', async () => {
    prisma.agendaEvent.findFirst.mockResolvedValue(null);

    await expect(service.updateEvent('404', { title: 'x' })).rejects.toThrow(NotFoundException);
    expect(prisma.agendaEvent.findFirst).toHaveBeenCalledWith({
      where: { id: '404', tenantId: 't-1' },
    });
  });

  it('batch scheduling keeps tenantId in all transactional event creations', async () => {
    prisma.agendaEvent.create.mockImplementation(({ data }: { data: { title: string } }) => Promise.resolve({ id: data.title }));

    const result = await service.batchScheduling({
      items: [
        {
          title: 'Evento A',
          type: AgendaEventType.OUTRO,
          startAt: new Date().toISOString(),
        },
        {
          title: 'Evento B',
          type: AgendaEventType.OUTRO,
          startAt: new Date().toISOString(),
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.agendaEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't-1', title: 'Evento A' }),
      }),
    );
    expect(prisma.agendaEvent.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't-1', title: 'Evento B' }),
      }),
    );
    expect(result).toEqual({ created: 2 });
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
