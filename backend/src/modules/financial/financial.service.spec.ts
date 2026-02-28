import { FontePagamento, PaymentMatchStatus } from '@prisma/client';
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
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pericia: {
      count: jest.fn(),
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



  it('links unmatched payment preserving audit trail', async () => {
    prisma.unmatchedPayment.findFirst.mockResolvedValue({
      id: 'u-1',
      tenantId: 't-1',
      importBatchId: 'b-1',
      rawData: { batch: 'L123', origem: 'TJ', descricao: 'Pagamento identificado', valorBruto: '100,50', data: '2026-02-10' },
      amount: 100.5,
      transactionDate: new Date('2026-02-10T00:00:00.000Z'),
    });

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );
    prisma.recebimento.create.mockResolvedValue({ id: 'r-2' });
    prisma.unmatchedPayment.update.mockResolvedValue({ id: 'u-1', matchStatus: 'LINKED' as PaymentMatchStatus });

    const result = await service.linkUnmatched('u-1', {
      periciaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3',
    });

    expect(prisma.recebimento.create).toHaveBeenCalled();
    expect(prisma.unmatchedPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchStatus: "LINKED" as PaymentMatchStatus,
          linkedPericiaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ recebimento: { id: 'r-2' } }));
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
});
