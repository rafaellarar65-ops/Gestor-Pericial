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
    pericia: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    unmatchedPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
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

  it('imports a consolidated batch and splits linked vs unmatched by CNJ', async () => {
    prisma.importBatch.create.mockResolvedValue({ id: 'batch-1' });
    prisma.pericia.findFirst
      .mockResolvedValueOnce({ id: 'pericia-1' })
      .mockResolvedValueOnce(null);

    const result = await service.importBatchManualCsv({
      sourceFileName: 'recebimentos.csv',
      rows: [
        {
          processoCNJ: '0000000-00.0000.0.00.0000',
          fontePagamento: FontePagamento.TJ,
          dataRecebimento: new Date().toISOString(),
          valorBruto: 100,
          valorLiquido: 90,
        },
        {
          processoCNJ: '1111111-11.1111.1.11.1111',
          fontePagamento: FontePagamento.TJ,
          dataRecebimento: new Date().toISOString(),
          valorBruto: 50,
        },
      ],
    });

    expect(prisma.recebimento.create).toHaveBeenCalledTimes(1);
    expect(prisma.unmatchedPayment.create).toHaveBeenCalledTimes(1);
    expect(prisma.importBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchedRecords: 1,
          unmatchedRecords: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      source: 'MANUAL_CSV',
      itemsLinked: 1,
      itemsUnmatched: 1,
      gross: 150,
      net: 140,
      tax: 10,
      count: 2,
    });
  });
});
