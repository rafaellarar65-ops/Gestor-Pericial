import { NotFoundException } from '@nestjs/common';
import { AgendaEventStatus, AgendaEventType, AgendaTaskStatus } from '@prisma/client';
import { AgendaService } from './agenda.service';

describe('AgendaService', () => {
  const context = {
    get: jest.fn((key: string) => (key === 'tenantId' ? 't-1' : 'u-1')),
  };

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
    pericia: {
      update: jest.fn(),
    },
    schedulingBatch: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: AgendaService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
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

  it('updates event by id + tenantId and returns updated entity', async () => {
    prisma.agendaEvent.findFirst.mockResolvedValue({ id: 'ev-1', tenantId: 't-1', status: AgendaEventStatus.AGENDADA });
    prisma.agendaEvent.update.mockResolvedValue({ id: 'ev-1', tenantId: 't-1', title: 'Atualizado' });

    const result = await service.updateEvent('ev-1', { title: 'Atualizado' });

    expect(prisma.agendaEvent.findFirst).toHaveBeenCalledWith({
      where: { id: 'ev-1', tenantId: 't-1' },
    });
    expect(prisma.agendaEvent.update).toHaveBeenCalledWith({
      where: { id: 'ev-1' },
      data: expect.objectContaining({ title: 'Atualizado' }),
    });
    expect(result).toEqual({ id: 'ev-1', tenantId: 't-1', title: 'Atualizado' });
  });

  it('throws NotFoundException when updating missing event for tenant', async () => {
    prisma.agendaEvent.findFirst.mockResolvedValue(null);

    await expect(service.updateEvent('404', { title: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('batch scheduling runs in one transaction and returns summary after commit', async () => {
    prisma.agendaEvent.create
      .mockResolvedValueOnce({ id: 'event-1', periciaId: 'pericia-1' })
      .mockResolvedValueOnce({ id: 'event-2', periciaId: null });
    prisma.pericia.update.mockResolvedValue({ id: 'pericia-1' });
    prisma.agendaTask.create.mockResolvedValue({ id: 'task-1' });
    prisma.schedulingBatch.create.mockResolvedValue({ id: 'batch-1' });

    const result = await service.batchScheduling({
      items: [
        {
          title: 'Evento A',
          type: AgendaEventType.OUTRO,
          periciaId: 'pericia-1',
          startAt: '2026-01-02T09:00:00.000Z',
        },
        {
          title: 'Evento B',
          type: AgendaEventType.OUTRO,
          startAt: '2026-01-02T10:00:00.000Z',
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.agendaEvent.create).toHaveBeenCalledTimes(2);
    expect(prisma.pericia.update).toHaveBeenCalledWith({
      where: { id: 'pericia-1' },
      data: expect.objectContaining({ agendada: true }),
    });
    expect(prisma.agendaTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't-1',
          periciaId: 'pericia-1',
          status: AgendaTaskStatus.TODO,
        }),
      }),
    );
    expect(prisma.schedulingBatch.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      createdEventsCount: 2,
      updatedPericiasCount: 1,
      createdTasksCount: 1,
      eventIds: ['event-1', 'event-2'],
      updatedPericiaIds: ['pericia-1'],
      taskIds: ['task-1'],
    });
  });

  it('rolls back entire batch when a transactional operation fails (forced integration-style error)', async () => {
    const db = {
      events: [] as string[],
      pericias: [] as string[],
      tasks: [] as string[],
      batches: [] as string[],
    };

    prisma.$transaction.mockImplementation(async (cb: (tx: any) => unknown) => {
      const staged = {
        events: [...db.events],
        pericias: [...db.pericias],
        tasks: [...db.tasks],
        batches: [...db.batches],
      };

      const tx = {
        agendaEvent: {
          create: async ({ data }: { data: { title: string } }) => {
            const id = `event-${staged.events.length + 1}`;
            staged.events.push(id);
            return { id, periciaId: data.title.includes('com-pericia') ? 'pericia-1' : null };
          },
        },
        pericia: {
          update: async () => {
            staged.pericias.push('pericia-1');
            return { id: 'pericia-1' };
          },
        },
        agendaTask: {
          create: async () => {
            throw new Error('FORCED_TASK_ERROR');
          },
        },
        schedulingBatch: {
          create: async () => {
            staged.batches.push('batch-1');
            return { id: 'batch-1' };
          },
        },
      };

      try {
        const result = await cb(tx);
        db.events = staged.events;
        db.pericias = staged.pericias;
        db.tasks = staged.tasks;
        db.batches = staged.batches;
        return result;
      } catch (error) {
        throw error;
      }
    });

    await expect(
      service.batchScheduling({
        items: [
          {
            title: 'evento-com-pericia',
            periciaId: 'pericia-1',
            type: AgendaEventType.OUTRO,
            startAt: '2026-01-02T09:00:00.000Z',
          },
        ],
      }),
    ).rejects.toThrow('FORCED_TASK_ERROR');

    expect(db.events).toHaveLength(0);
    expect(db.pericias).toHaveLength(0);
    expect(db.tasks).toHaveLength(0);
    expect(db.batches).toHaveLength(0);
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
