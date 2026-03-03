import { NotFoundException } from '@nestjs/common';
import { Pericia, Prisma } from '@prisma/client';
import { PericiasService } from './pericias.service';

describe('PericiasService', () => {
  const prisma = {
    pericia: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    status: {
      findMany: jest.fn(),
    },
    logStatus: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    cidade: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    recebimento: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };
  const stageFilter = {
    buildWhere: jest.fn(),
  };

  let service: PericiasService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
    service = new PericiasService(prisma, context as any, stageFilter as any);
  });

  it('creates a pericia (happy path)', async () => {
    prisma.pericia.create.mockResolvedValue({ id: 'p-1', processoCNJ: '123' });

    const result = await service.create({ processoCNJ: '123' } as any);

    expect(result.id).toBe('p-1');
    expect(prisma.pericia.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when pericia does not exist (edge case)', async () => {
    prisma.pericia.findFirst.mockResolvedValue(null);
    await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
  });

  it('contract: nomeacoes total equals sum of grouped items', async () => {
    stageFilter.buildWhere.mockResolvedValue({ finalizada: false });
    prisma.pericia.findMany.mockResolvedValue([
      { id: '1', processoCNJ: 'A', autorNome: 'Autor A', cidade: { nome: 'C1' }, status: { codigo: 'AVALIAR' }, dataNomeacao: new Date('2025-01-01') },
      { id: '2', processoCNJ: 'B', autorNome: 'Autor B', cidade: { nome: 'C1' }, status: { codigo: 'ACEITE_HONORARIOS' }, dataNomeacao: new Date('2025-01-02') },
      { id: '3', processoCNJ: 'C', autorNome: 'Autor C', cidade: { nome: 'C2' }, status: { codigo: 'A_MAJORAR' }, dataNomeacao: new Date('2025-01-03') },
      { id: '4', processoCNJ: 'D', autorNome: 'Autor D', cidade: { nome: 'C2' }, status: { codigo: 'OUTRO' }, extraObservation: 'obs', dataNomeacao: new Date('2025-01-04') },
    ]);

    const result = await service.nomeacoes();

    const groupedCount = result.groups.reduce((acc, group) => acc + group.items.length, 0);
    expect(result.total).toBe(groupedCount);
  });

  it('contract: fila por cidade total equals sum of city items', async () => {
    stageFilter.buildWhere.mockResolvedValue({ dataAgendamento: null });
    prisma.pericia.findMany.mockResolvedValue([
      { id: '1', processoCNJ: 'A', autorNome: 'Autor A', cidade: { nome: 'Natal' }, status: { codigo: 'NOVA_NOMEACAO' }, dataNomeacao: new Date('2025-01-01') },
      { id: '2', processoCNJ: 'B', autorNome: 'Autor B', cidade: { nome: 'Natal' }, status: { codigo: 'NOVA_NOMEACAO' }, dataNomeacao: new Date('2025-01-02') },
      { id: '3', processoCNJ: 'C', autorNome: 'Autor C', cidade: { nome: 'Mossoró' }, status: { codigo: 'AVALIAR' }, dataNomeacao: new Date('2025-01-03') },
    ]);

    const result = await service.filaAgendamentoPorCidade();

    const groupedCount = result.cities.reduce((acc, city) => acc + city.items.length, 0);
    expect(result.total).toBe(groupedCount);
  });

  it('dashboard: conta cada bucket com critérios exclusivos por status oficial', async () => {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const statuses = [
      { id: 's-avaliar', codigo: 'AVALIAR' },
      { id: 's-majorar', codigo: 'MAJORAR' },
      { id: 's-agendar', codigo: 'AGENDAR_DATA' },
      { id: 's-tele', codigo: 'TELEPERICIA' },
      { id: 's-data-agendada', codigo: 'DATA_AGENDADA' },
      { id: 's-enviar-laudo', codigo: 'ENVIAR_LAUDO' },
      { id: 's-esclarecimentos', codigo: 'ESCLARECIMENTOS' },
      { id: 's-aguardando-pag', codigo: 'AGUARDANDO_PAG' },
      { id: 's-ausente', codigo: 'AUSENTE' },
      { id: 's-ausencia-informada', codigo: 'AUSENCIA_INFORMADA' },
    ];

    type Fixture = Pick<Pericia, 'id' | 'statusId' | 'finalizada' | 'dataAgendamento' | 'createdAt'> & {
      processoCNJ: string;
      autorNome: string | null;
      cidade?: { nome: string };
      status?: { codigo: string };
    };

    const fixtures: Fixture[] = [
      { id: 'p1', processoCNJ: '111', autorNome: 'Triagem 1', statusId: 's-avaliar', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-01') },
      { id: 'p2', processoCNJ: '112', autorNome: 'Triagem 2', statusId: 's-majorar', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-02') },
      { id: 'p3', processoCNJ: '113', autorNome: 'Agendar 1', statusId: 's-agendar', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-03') },
      { id: 'p4', processoCNJ: '114', autorNome: 'Agendar 2', statusId: 's-tele', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-04') },
      { id: 'p5', processoCNJ: '115', autorNome: 'Proxima', statusId: 's-data-agendada', finalizada: false, dataAgendamento: in3Days, createdAt: new Date('2025-01-05') },
      { id: 'p6', processoCNJ: '116', autorNome: 'Nao Proxima', statusId: 's-data-agendada', finalizada: false, dataAgendamento: in10Days, createdAt: new Date('2025-01-06') },
      { id: 'p7', processoCNJ: '117', autorNome: 'Laudo', statusId: 's-enviar-laudo', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-07') },
      { id: 'p8', processoCNJ: '118', autorNome: 'Esclarecer', statusId: 's-esclarecimentos', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-08') },
      { id: 'p9', processoCNJ: '119', autorNome: 'Receber', statusId: 's-aguardando-pag', finalizada: false, dataAgendamento: null, createdAt: new Date('2025-01-09') },
      {
        id: 'p10',
        processoCNJ: '120',
        autorNome: 'Ausente',
        statusId: 's-ausente',
        finalizada: false,
        dataAgendamento: null,
        createdAt: new Date('2025-01-10'),
        cidade: { nome: 'Natal' },
        status: { codigo: 'AUSENTE' },
      },
      {
        id: 'p11',
        processoCNJ: '121',
        autorNome: 'Ausência Informada',
        statusId: 's-ausencia-informada',
        finalizada: false,
        dataAgendamento: null,
        createdAt: new Date('2025-01-11'),
        cidade: { nome: 'Mossoró' },
        status: { codigo: 'AUSENCIA_INFORMADA' },
      },
    ];

    const matchesWhere = (record: Fixture, where?: Prisma.PericiaWhereInput) => {
      if (!where) return true;

      const statusFilter = where.statusId as Prisma.StringFilter | string | undefined;
      if (statusFilter && typeof statusFilter === 'object' && 'in' in statusFilter) {
        const ids = statusFilter.in ?? [];
        if (!ids.includes(record.statusId ?? '')) return false;
      }

      if (where.finalizada !== undefined && record.finalizada !== where.finalizada) {
        return false;
      }

      if (where.dataAgendamento === null && record.dataAgendamento !== null) {
        return false;
      }

      if (where.dataAgendamento && typeof where.dataAgendamento === 'object' && 'gte' in where.dataAgendamento) {
        const date = record.dataAgendamento;
        const gte = where.dataAgendamento.gte;
        const lte = where.dataAgendamento.lte;
        if (!date || !gte || !lte || date < gte || date > lte) return false;
      }

      return true;
    };

    prisma.status.findMany.mockResolvedValue(statuses);
    prisma.pericia.count.mockImplementation(({ where }: { where?: Prisma.PericiaWhereInput } = {}) =>
      Promise.resolve(fixtures.filter((record) => matchesWhere(record, where)).length),
    );

    prisma.pericia.findMany.mockImplementation(({ where, take }: { where?: Prisma.PericiaWhereInput; take?: number }) => {
      const filtered = fixtures
        .filter((record) => matchesWhere(record, where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take ?? 50)
        .map((record) => ({
          ...record,
          cidade: record.cidade ?? null,
          status: record.status ?? null,
        }));

      return Promise.resolve(filtered);
    });

    const result = await service.dashboard();

    const byKey = Object.fromEntries(result.kpis.map((item) => [item.key, Number(item.value)]));
    expect(byKey.total).toBe(fixtures.length);
    expect(byKey.novas_nomeacoes).toBe(2);
    expect(byKey.agendar_data).toBe(2);
    expect(byKey.proximas_pericias).toBe(1);
    expect(byKey.enviar_laudos).toBe(1);
    expect(byKey.esclarecimentos).toBe(1);
    expect(byKey.a_receber).toBe(1);

    expect(result.critical).toHaveLength(2);
    expect(result.critical.every((item) => ['AUSENTE', 'AUSENCIA_INFORMADA'].includes(item.status))).toBe(true);
  });
});
