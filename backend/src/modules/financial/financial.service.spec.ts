import { FontePagamento } from '@prisma/client';
import { FinancialService } from './financial.service';

describe('FinancialService', () => {
  const prisma = {
    recebimento: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    despesa: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    importBatch: {
      create: jest.fn(),
      update: jest.fn(),
    },
    unmatchedPayment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    pericia: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    logStatus: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: FinancialService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinancialService(prisma, context as any);
  });

  it('creates recebimento (happy path)', async () => {
    prisma.recebimento.create.mockResolvedValue({ id: 'r-1' });

    const result = await service.createRecebimento({
      periciaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3',
      fontePagamento: FontePagamento.TJ,
      dataRecebimento: new Date().toISOString(),
      valorBruto: 120.5,
    });

    expect(result.id).toBe('r-1');
  });

  it('returns zero financialScore when there is no revenue (edge case)', async () => {
    prisma.$transaction.mockResolvedValue([
      { _sum: { valorLiquido: null, valorBruto: null } },
      { _sum: { valor: null } },
      0,
    ]);

    const result = await service.analytics();
    expect(result.financialScore).toBe(0);
  });

  it('returns timeline including separated unlinked revenue when enabled', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 'p-1',
          dataNomeacao: new Date('2026-01-10T10:00:00Z'),
          dataEnvioLaudo: new Date('2026-01-20T10:00:00Z'),
          honorariosPrevistosJG: 200,
          honorariosPrevistosPartes: 50,
        },
      ],
      [
        { periciaId: 'p-1', dataRecebimento: new Date('2026-01-15T10:00:00Z'), valorBruto: 100 },
        { periciaId: null, dataRecebimento: new Date('2026-01-15T11:00:00Z'), valorBruto: 30 },
      ],
      [{ periciaId: 'p-1', dataCompetencia: new Date('2026-01-16T10:00:00Z'), valor: 40 }],
      [
        { statusNovo: 'PEDIDO_ESCLARECIMENTO', createdAt: new Date('2026-01-17T10:00:00Z') },
        { statusNovo: 'RESPOSTA_ESCLARECIMENTO', createdAt: new Date('2026-01-18T10:00:00Z') },
      ],
    ]);

    const result = await service.analyticsTimeline({
      period: 'CUSTOM' as any,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      granularity: 'MONTH' as any,
      includeUnlinked: true,
    });

    expect(result.series).toHaveLength(1);
    expect(result.series[0].finance.grossRevenue).toBe(100);
    expect(result.series[0].finance.unlinkedRevenue).toBe(30);
    expect(result.series[0].finance.expenses).toBe(40);
    expect(result.series[0].production.entries).toBe(1);
    expect(result.series[0].production.exits).toBe(1);
    expect(result.series[0].workflow.clarificationRequests).toBe(1);
    expect(result.series[0].workflow.clarificationResponses).toBe(1);
  });
});
