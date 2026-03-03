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
      createMany: jest.fn(),
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



  it('imports unmatched transactions and reports rejected rows', async () => {
    prisma.unmatchedPayment.createMany.mockResolvedValue({ count: 1 });

    const result = await service.importUnmatched({
      rows: [
        {
          amount: 'R$ 1.234,56',
          transactionDate: '10/03/2026 14:20',
          payerName: 'Maria',
          cnj: '0000000-00.0000.0.00.0000',
          description: 'Transferência',
          source: 'OFX',
          origin: 'MANUAL_CSV',
        },
        {
          amount: 'abc',
          receivedAt: '2026-03-10',
          payerName: 'Inválido',
        },
      ],
    });

    expect(prisma.unmatchedPayment.createMany).toHaveBeenCalledTimes(1);
    expect(result.imported).toBe(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('Valor monetário inválido');
  });

  it('rejects rows when transaction date is invalid', async () => {
    const result = await service.importUnmatched({
      rows: [{ amount: 100, transactionDate: 'data-invalida' }],
    });

    expect(prisma.unmatchedPayment.createMany).not.toHaveBeenCalled();
    expect(result.imported).toBe(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('Data inválida');
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
