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

  it('returns zero financialScore when there is no revenue (edge case)', async () => {
    prisma.$transaction.mockResolvedValue([
      { _sum: { valorLiquido: null, valorBruto: null } },
      { _sum: { valor: null } },
      0,
    ]);

    const result = await service.analytics();
    expect(result.financialScore).toBe(0);
  });

  it('lists only pending unmatched payments with serialized decimal/date fields', async () => {
    prisma.unmatchedPayment.findMany.mockResolvedValue([
      {
        id: 'u-1',
        cnjRaw: '123',
        cnjNormalized: '123',
        source: 'csv',
        originType: 'MANUAL_CSV',
        grossValue: { toString: () => '100.50', valueOf: () => 100.5 },
        discountValue: { toString: () => '10.00', valueOf: () => 10 },
        netValue: { toString: () => '90.50', valueOf: () => 90.5 },
        receivedAt: new Date('2026-01-02T00:00:00.000Z'),
        description: 'Pagamento',
        status: PaymentMatchStatus.PENDING,
        linkedPericiaId: null,
        linkedAt: null,
        linkedBy: null,
        notes: null,
        rawData: {},
        importBatchId: null,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      },
    ]);

    const result = await service.unmatched();

    expect(prisma.unmatchedPayment.findMany).toHaveBeenCalledWith({
      where: { status: PaymentMatchStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    expect(result[0].grossValue).toBe(100.5);
    expect(result[0].receivedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('reconciles as linked by default and sets linked metadata', async () => {
    prisma.unmatchedPayment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.reconcile({ unmatchedIds: ['a6f7f363-fd5b-4c4d-8171-c6d65144f8d3'], note: 'ok' });

    expect(prisma.unmatchedPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentMatchStatus.LINKED,
          linkedBy: 't-1',
          notes: 'ok',
        }),
      }),
    );
    expect(result.reconciled).toBe(1);
  });
});
