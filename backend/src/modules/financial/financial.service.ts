import { Injectable } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDespesaDto, CreateRecebimentoDto, ImportRecebimentosDto, ReconcileDto } from './dto/financial.dto';

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  private serializeUnmatchedPayment(payment: {
    id: string;
    cnjRaw: string | null;
    cnjNormalized: string | null;
    source: string | null;
    originType: string;
    grossValue: Prisma.Decimal | null;
    discountValue: Prisma.Decimal | null;
    netValue: Prisma.Decimal | null;
    receivedAt: Date | null;
    description: string | null;
    status: PaymentMatchStatus;
    linkedPericiaId: string | null;
    linkedAt: Date | null;
    linkedBy: string | null;
    notes: string | null;
    rawData: Prisma.JsonValue;
    importBatchId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...payment,
      grossValue: payment.grossValue ? Number(payment.grossValue) : null,
      discountValue: payment.discountValue ? Number(payment.discountValue) : null,
      netValue: payment.netValue ? Number(payment.netValue) : null,
      receivedAt: payment.receivedAt?.toISOString() ?? null,
      linkedAt: payment.linkedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  createRecebimento(dto: CreateRecebimentoDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.recebimento.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        fontePagamento: dto.fontePagamento,
        dataRecebimento: new Date(dto.dataRecebimento),
        valorBruto: new Prisma.Decimal(dto.valorBruto),
        ...(dto.valorLiquido ? { valorLiquido: new Prisma.Decimal(dto.valorLiquido) } : {}),
        ...(dto.descricao ? { descricao: dto.descricao } : {}),
      },
    });
  }

  listRecebimentos(periciaId?: string) {
    return this.prisma.recebimento.findMany({
      where: periciaId ? { periciaId } : undefined,
      orderBy: { dataRecebimento: 'desc' },
    });
  }

  createDespesa(dto: CreateDespesaDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.despesa.create({
      data: {
        tenantId,
        categoria: dto.categoria,
        descricao: dto.descricao,
        valor: new Prisma.Decimal(dto.valor),
        dataCompetencia: new Date(dto.dataCompetencia),
        ...(dto.periciaId ? { periciaId: dto.periciaId } : {}),
      },
    });
  }

  listDespesas() {
    return this.prisma.despesa.findMany({ orderBy: { dataCompetencia: 'desc' } });
  }

  async importBatch(dto: ImportRecebimentosDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const batch = await this.prisma.importBatch.create({
      data: {
        tenantId,
        ...(dto.sourceFileName ? { sourceFileName: dto.sourceFileName } : {}),
        totalRecords: dto.rows.length,
        status: 'PROCESSING',
      },
    });

    await this.prisma.$transaction(
      dto.rows.map((row) =>
        this.prisma.recebimento.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            periciaId: row.periciaId,
            fontePagamento: row.fontePagamento,
            dataRecebimento: new Date(row.dataRecebimento),
            valorBruto: new Prisma.Decimal(row.valorBruto),
            ...(row.valorLiquido ? { valorLiquido: new Prisma.Decimal(row.valorLiquido) } : {}),
            ...(row.descricao ? { descricao: row.descricao } : {}),
          },
        }),
      ),
    );

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: { matchedRecords: dto.rows.length, unmatchedRecords: 0, status: 'DONE' },
    });

    return { batchId: batch.id, imported: dto.rows.length };
  }

  async unmatched() {
    const rows = await this.prisma.unmatchedPayment.findMany({
      where: { status: PaymentMatchStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.serializeUnmatchedPayment(row));
  }

  async reconcile(dto: ReconcileDto) {
    const status = dto.status ?? PaymentMatchStatus.LINKED;
    const now = new Date();
    const linkedBy = this.context.get('userId') ?? null;
    const result = await this.prisma.unmatchedPayment.updateMany({
      where: { id: { in: dto.unmatchedIds } },
      data: {
        status,
        ...(dto.note ? { notes: dto.note } : {}),
        ...(status === PaymentMatchStatus.LINKED
          ? { linkedAt: now, linkedPericiaId: dto.linkedPericiaId ?? null, linkedBy }
          : { linkedAt: null, linkedPericiaId: null, linkedBy: null }),
      },
    });

    return { reconciled: result.count };
  }

  async analytics() {
    const [totalRecebidoAgg, totalDespesaAgg, atrasados] = await this.prisma.$transaction([
      this.prisma.recebimento.aggregate({ _sum: { valorLiquido: true, valorBruto: true } }),
      this.prisma.despesa.aggregate({ _sum: { valor: true } }),
      this.prisma.pericia.count({ where: { pagamentoStatus: 'ATRASADO' } }),
    ]);

    const totalRecebido = Number(totalRecebidoAgg._sum.valorLiquido ?? totalRecebidoAgg._sum.valorBruto ?? 0);
    const totalDespesas = Number(totalDespesaAgg._sum.valor ?? 0);

    return {
      totals: { recebido: totalRecebido, despesas: totalDespesas, resultado: totalRecebido - totalDespesas },
      agingBuckets: { atrasados },
      financialScore: totalRecebido > 0 ? Math.max(0, Math.min(100, Math.round(((totalRecebido - totalDespesas) / totalRecebido) * 100))) : 0,
    };
  }

  chargeAutomation() {
    return { enqueued: true, queue: 'charge-dispatch', message: 'Cobranças automáticas enfileiradas.' };
  }
}
