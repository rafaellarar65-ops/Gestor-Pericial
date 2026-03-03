import { FontePagamento, PaymentMatchStatus, Prisma } from '@prisma/client';
import { FinancialService } from './financial.service';

describe('FinancialService', () => {
  const prisma = {
    recebimento: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    bankTransaction: {
      create: jest.fn(),
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
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
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

  it('returns zero financialScore when there is no revenue (edge case)', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      { _sum: { valorLiquido: null, valorBruto: null } },
      { _sum: { valor: null } },
      0,
    ]);

    const result = await service.analytics();
    expect(result.financialScore).toBe(0);
  });

  it('links unmatched by creating recebimento and structured reconciliation reference', async () => {
    const unmatchedId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const periciaId = 'b6f7f363-fd5b-4c4d-8171-c6d65144f8d4';

    prisma.unmatchedPayment.findUnique.mockResolvedValue({
      id: unmatchedId,
      tenantId: 't-1',
      amount: new Prisma.Decimal(99.5),
      transactionDate: new Date('2026-01-05T00:00:00.000Z'),
      rawData: { source: 'manual' },
    });

    prisma.$transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        recebimento: {
          create: jest.fn().mockResolvedValue({ id: 'rec-1' }),
        },
        bankTransaction: {
          create: jest.fn(),
        },
      }),
    );

    prisma.unmatchedPayment.update.mockResolvedValue({
      id: unmatchedId,
      amount: new Prisma.Decimal(99.5),
      matchStatus: PaymentMatchStatus.MATCHED,
    });

    const result = await service.linkUnmatched(unmatchedId, {
      periciaId,
      note: 'match manual',
      createRecebimento: true,
    });

    expect(prisma.unmatchedPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchStatus: PaymentMatchStatus.MATCHED,
          rawData: expect.objectContaining({
            reconciliation: {
              type: 'RECEBIMENTO',
              id: 'rec-1',
              periciaId,
            },
          }),
        }),
      }),
    );
    expect(result.reconciledEntity).toEqual({ type: 'RECEBIMENTO', id: 'rec-1', periciaId });
    expect(result.finalStatus).toBe(PaymentMatchStatus.MATCHED);
    expect(prisma.activityLog.create).toHaveBeenCalled();
  });
});
