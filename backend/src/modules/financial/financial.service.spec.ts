import { BadRequestException } from '@nestjs/common';
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
      create: jest.fn(),
    },
    bankTransaction: {
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
    prisma.$transaction.mockResolvedValue([
      { _sum: { valorLiquido: null, valorBruto: null } },
      { _sum: { valor: null } },
      0,
    ]);

    const result = await service.analytics();
    expect(result.financialScore).toBe(0);
  });



  it('imports OFX and normalizes into unmatched + bank transactions', async () => {
    prisma.$transaction.mockResolvedValue(undefined);

    const file = {
      originalname: 'extrato.ofx',
      mimetype: 'application/ofx',
      buffer: Buffer.from(`
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20240110103000
            <TRNAMT>150.55
            <FITID>ABC123
            <NAME>TRIBUNAL
            <MEMO>Pagamento honorarios
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`),
    } as Express.Multer.File;

    const result = await service.importUnmatchedFile(file);

    expect(result.imported).toBe(1);
    expect(result.origin).toBe('OFX_IMPORT');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws clear error for invalid OFX', async () => {
    const file = {
      originalname: 'extrato.ofx',
      mimetype: 'application/ofx',
      buffer: Buffer.from('arquivo-invalido'),
    } as Express.Multer.File;

    await expect(service.importUnmatchedFile(file)).rejects.toBeInstanceOf(BadRequestException);
  });

});
