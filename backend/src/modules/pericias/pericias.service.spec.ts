import { NotFoundException } from '@nestjs/common';
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
});
