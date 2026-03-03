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
    bankTransaction: {
      create: jest.fn(),
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

  it('throws when split total differs from original amount', async () => {
    prisma.unmatchedPayment.findFirst.mockResolvedValue({
      id: 'u-1',
      tenantId: 't-1',
      amount: 100,
      transactionDate: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
    });

    await expect(
      service.splitUnmatched('u-1', {
        installments: [
          { periciaId: '97d799af-1ff9-46f7-8e2c-f6fe3cb4a521', amount: 60 },
          { periciaId: '907ff2cf-44e2-4f00-9b17-b4ec51f0db22', amount: 30 },
        ],
      }),
    ).rejects.toThrow('Soma das parcelas deve ser igual ao valor original.');
  });

  it('splits unmatched payment transactionally and marks as matched', async () => {
    const unmatched = {
      id: 'u-1',
      tenantId: 't-1',
      amount: 100,
      transactionDate: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
    };

    prisma.unmatchedPayment.findFirst.mockResolvedValue(unmatched);
    prisma.pericia.findMany.mockResolvedValue([
      { id: '97d799af-1ff9-46f7-8e2c-f6fe3cb4a521' },
      { id: '907ff2cf-44e2-4f00-9b17-b4ec51f0db22' },
    ]);

    const tx = {
      recebimento: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'r-1', periciaId: '97d799af-1ff9-46f7-8e2c-f6fe3cb4a521', valorBruto: 40 })
          .mockResolvedValueOnce({ id: 'r-2', periciaId: '907ff2cf-44e2-4f00-9b17-b4ec51f0db22', valorBruto: 60 }),
      },
      bankTransaction: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'b-1', periciaId: '97d799af-1ff9-46f7-8e2c-f6fe3cb4a521', amount: 40 })
          .mockResolvedValueOnce({ id: 'b-2', periciaId: '907ff2cf-44e2-4f00-9b17-b4ec51f0db22', amount: 60 }),
      },
      unmatchedPayment: {
        update: jest.fn().mockResolvedValue({ id: 'u-1', matchStatus: PaymentMatchStatus.MATCHED }),
      },
    };

    prisma.$transaction.mockImplementation(async (fn: (client: typeof tx) => unknown) => fn(tx));

    const result = await service.splitUnmatched('u-1', {
      installments: [
        { periciaId: '97d799af-1ff9-46f7-8e2c-f6fe3cb4a521', amount: 40, note: 'Parcela 1' },
        { periciaId: '907ff2cf-44e2-4f00-9b17-b4ec51f0db22', amount: 60, note: 'Parcela 2' },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(PaymentMatchStatus.MATCHED);
    expect(result.installments).toBe(2);
    expect(result.totalAmount).toBe(100);
    expect(result.recebimentos).toHaveLength(2);
    expect(result.bankTransactions).toHaveLength(2);
  });
});
