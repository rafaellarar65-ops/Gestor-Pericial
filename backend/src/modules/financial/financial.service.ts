import { Injectable, NotFoundException } from '@nestjs/common';
import { FontePagamento, PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDespesaDto, CreateRecebimentoDto, ImportRecebimentosDto, LinkUnmatchedPaymentDto, ReconcileDto } from './dto/financial.dto';

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

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

  unmatched() {
    return this.prisma.unmatchedPayment.findMany({ where: { matchStatus: PaymentMatchStatus.UNMATCHED }, orderBy: { createdAt: 'desc' } });
  }


  async linkUnmatched(id: string, dto: LinkUnmatchedPaymentDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const userId = this.context.get('userId') ?? null;

    const unmatched = await this.prisma.unmatchedPayment.findFirst({
      where: { id, tenantId },
    });

    if (!unmatched) {
      throw new NotFoundException('Pagamento não conciliado não encontrado.');
    }

    const rawData = (unmatched.rawData ?? {}) as Record<string, unknown>;
    const sourceBatch = this.getRawString(rawData, ['batch', 'lote', 'batchId']);
    const sourceOrigin = this.getRawString(rawData, ['origem', 'origin', 'source']);
    const sourceDescription = this.getRawString(rawData, ['descricao', 'description', 'historico']);
    const sourceGross = this.getRawNumber(rawData, ['valorBruto', 'valor', 'amount']);
    const sourceNet = this.getRawNumber(rawData, ['valorLiquido', 'netAmount']);
    const sourceDate = this.getRawDate(rawData, ['data', 'transactionDate', 'dataRecebimento']);

    const linkedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const recebimento = await tx.recebimento.create({
        data: {
          tenantId,
          periciaId: dto.periciaId,
          importBatchId: unmatched.importBatchId ?? undefined,
          fontePagamento: this.mapFontePagamento(sourceOrigin),
          dataRecebimento: unmatched.transactionDate ?? sourceDate ?? linkedAt,
          valorBruto: new Prisma.Decimal(sourceGross ?? Number(unmatched.amount ?? 0)),
          ...(sourceNet !== null ? { valorLiquido: new Prisma.Decimal(sourceNet) } : {}),
          descricao: [sourceBatch ? `Lote: ${sourceBatch}` : null, sourceDescription].filter(Boolean).join(' | ') || undefined,
          metadata: {
            linkedFromUnmatchedPaymentId: unmatched.id,
            rawData: rawData as Prisma.InputJsonValue,
          } as Prisma.InputJsonValue,
          ...(userId ? { createdBy: userId } : {}),
        },
      });

      const updatedUnmatched = await tx.unmatchedPayment.update({
        where: { id: unmatched.id },
        data: {
          matchStatus: "LINKED" as PaymentMatchStatus,
          linkedPericiaId: dto.periciaId,
          linkedAt,
          ...(userId ? { linkedBy: userId, updatedBy: userId } : {}),
        },
      });

      return { recebimento, unmatchedPayment: updatedUnmatched };
    });
  }

  private getRawString(rawData: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = rawData[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    return null;
  }

  private getRawNumber(rawData: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = rawData[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value.replace('.', '').replace(',', '.').replace(/[^\d.-]/g, ''));
        if (Number.isFinite(parsed)) return parsed;
      }
    }

    return null;
  }

  private getRawDate(rawData: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = rawData[key];
      if (typeof value !== 'string') continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }

    return null;
  }

  private mapFontePagamento(origin: string | null): FontePagamento {
    const normalized = (origin ?? '').toUpperCase();
    if (normalized.includes('TJ') || normalized.includes('TRIBUNAL')) return FontePagamento.TJ;
    if (normalized.includes('AUTOR')) return FontePagamento.PARTE_AUTORA;
    if (normalized.includes('RÉ') || normalized.includes('REU') || normalized.includes('RÉU')) return FontePagamento.PARTE_RE;
    if (normalized.includes('SEGURADORA')) return FontePagamento.SEGURADORA;
    return FontePagamento.OUTRO;
  }

  async reconcile(dto: ReconcileDto) {
    const result = await this.prisma.unmatchedPayment.updateMany({
      where: { id: { in: dto.unmatchedIds } },
      data: { matchStatus: PaymentMatchStatus.MATCHED, ...(dto.note ? { notes: dto.note } : {}) },
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
