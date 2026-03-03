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
    schedulingBatch: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pericia: {
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
    prisma.schedulingBatch.create.mockResolvedValue({ id: 'batch-1' });
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
    prisma.agendaEvent.findFirst.mockResolvedValueOnce({ id: 'ev-1', tenantId: 't-1', status: AgendaEventStatus.AGENDADA });
    prisma.agendaEvent.update.mockResolvedValue({ id: 'ev-1', tenantId: 't-1', title: 'Atualizado' });

    const result = await service.updateEvent('ev-1', { title: 'Atualizado' });

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

  it('batch scheduling keeps tenantId and creates metadata in scheduling batch', async () => {
    prisma.agendaEvent.create.mockImplementation(({ data }: { data: { title: string } }) => Promise.resolve({ id: data.title }));

    const result = await service.batchScheduling({
      items: [
        { title: 'Evento A', type: AgendaEventType.OUTRO, startAt: new Date().toISOString() },
        { title: 'Evento B', type: AgendaEventType.OUTRO, startAt: new Date().toISOString() },
      ],
      metadata: { date: '2026-01-01', cityNames: ['A'] },
    });

    expect(prisma.schedulingBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't-1',
          criteriaJson: expect.objectContaining({ batchSize: 2 }),
        }),
      }),
    );
    expect(result).toEqual({ created: 2 });
  });

  it('suggests batch slots grouped by city and without agenda conflicts', async () => {
    prisma.agendaEvent.findMany.mockResolvedValue([
      {
        startAt: new Date('2026-03-20T09:00:00.000Z'),
        endAt: new Date('2026-03-20T10:00:00.000Z'),
      },
    ]);

    const result = await service.suggestBatchScheduling({
      date: '2026-03-20',
      startTime: '09:00',
      intervalMinutes: 10,
      defaultDurationMinutes: 60,
      modalidadeDurationMinutes: { online: 45 },
      items: [
        { periciaId: 'e95c48be-a1da-4444-8ff2-65e0864f8b51', cidade: 'Curitiba', modalidade: 'online' },
        { periciaId: 'a4c6290f-f1a3-4d0d-a292-40fb4a7f337d', cidade: 'Araucária' },
      ],
    });

    expect(result.groupedByCity).toEqual(['Araucária', 'Curitiba']);
    expect(result.suggestions).toHaveLength(2);
    expect(new Date(result.suggestions[0].startAt).toISOString()).toBe('2026-03-20T10:05:00.000Z');
    expect(result.suggestions[1].estimatedDurationMinutes).toBe(45);
  });

  it('exports batch scheduling pdf and updates batch metadata', async () => {
    prisma.schedulingBatch.findFirst.mockResolvedValue({
      id: 'batch-1',
      dateRef: new Date('2026-03-20T00:00:00.000Z'),
      criteriaJson: { cityNames: ['Curitiba'] },
      resultJson: {
        status: 'CONFIRMADO',
        items: [{ periciaId: 'p-1', scheduledAt: '2026-03-20T10:00:00.000Z', city: 'Curitiba' }],
      },
    });
    prisma.pericia.findMany.mockResolvedValue([
      { id: 'p-1', processoCNJ: '111', autorNome: 'Fulano', cidade: { nome: 'Curitiba' } },
    ]);
    prisma.schedulingBatch.update.mockResolvedValue({ id: 'batch-1' });

    const result = await service.exportBatchSchedulingPdf('batch-1', { includeRoute: true });

    expect(result.fileName).toContain('batch-1');
    expect(result.mimeType).toBe('application/pdf');
    expect(prisma.schedulingBatch.update).toHaveBeenCalled();
  });
});
