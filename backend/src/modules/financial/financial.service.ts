import { Injectable } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkDeleteRecebimentosDto,
  CreateDespesaDto,
  CreateRecebimentoDto,
  ImportRecebimentosDto,
  ReconcileDto,
  UpdateRecebimentoDto,
} from './dto/financial.dto';

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

  listRecebimentos(periciaId?: string, search?: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const trimmedSearch = search?.trim();

    return this.prisma.recebimento.findMany({
      where: {
        tenantId,
        ...(periciaId ? { periciaId } : {}),
        ...(trimmedSearch
          ? {
              OR: [
                { descricao: { contains: trimmedSearch, mode: 'insensitive' } },
                { pericia: { autorNome: { contains: trimmedSearch, mode: 'insensitive' } } },
                {
                  pericia: {
                    OR: [
                      { processoCNJ: { contains: trimmedSearch } },
                      { processoCNJDigits: { contains: trimmedSearch.replace(/\D/g, '') } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        pericia: {
          select: {
            processoCNJ: true,
            autorNome: true,
          },
        },
      },
      orderBy: { dataRecebimento: 'desc' },
    });
  }

  async updateRecebimento(id: string, dto: UpdateRecebimentoDto) {
    return this.prisma.recebimento.update({
      where: { id },
      data: {
        ...(dto.origem ? { fontePagamento: dto.origem } : {}),
        ...(dto.dataRecebimento ? { dataRecebimento: new Date(dto.dataRecebimento) } : {}),
        ...(dto.valorLiquido !== undefined ? { valorLiquido: new Prisma.Decimal(dto.valorLiquido) } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
      },
    });
  }

  async bulkDeleteRecebimentos(dto: BulkDeleteRecebimentosDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const result = await this.prisma.recebimento.deleteMany({ where: { tenantId, id: { in: dto.ids } } });
    return { deleted: result.count };
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
      data: { matchedRecords: dto.rows.length, unmatchedRecords: 0, status: 'PROCESSED' },
    });

    return { batchId: batch.id, imported: dto.rows.length };
  }

  listImportBatches() {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.importBatch.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { recebimentos: true },
        },
      },
      orderBy: { importedAt: 'desc' },
    });
  }

  async revertBatch(batchId: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const batch = await this.prisma.importBatch.findFirst({ where: { id: batchId, tenantId } });
    if (!batch) return { reverted: false, reason: 'NOT_FOUND' };
    if (batch.status !== 'PROCESSED') return { reverted: false, reason: 'INVALID_STATUS', status: batch.status };

    const deleted = await this.prisma.recebimento.deleteMany({ where: { tenantId, importBatchId: batchId } });
    await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'REVERTED' } });
    return { reverted: true, deletedRecebimentos: deleted.count };
  }

  async deleteBatchAndRecebimentos(batchId: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const deletedRecebimentos = await this.prisma.recebimento.deleteMany({ where: { tenantId, importBatchId: batchId } });
    await this.prisma.unmatchedPayment.deleteMany({ where: { tenantId, importBatchId: batchId } });
    await this.prisma.importBatch.deleteMany({ where: { tenantId, id: batchId } });
    return { deletedBatchId: batchId, deletedRecebimentos: deletedRecebimentos.count };
  }

  async clearAllFinancialData() {
    const tenantId = this.context.get('tenantId') ?? '';
    const [deletedRecebimentos, deletedUnmatched, deletedBatches] = await this.prisma.$transaction([
      this.prisma.recebimento.deleteMany({ where: { tenantId } }),
      this.prisma.unmatchedPayment.deleteMany({ where: { tenantId } }),
      this.prisma.importBatch.deleteMany({ where: { tenantId } }),
    ]);

    return {
      deletedRecebimentos: deletedRecebimentos.count,
      deletedUnmatchedPayments: deletedUnmatched.count,
      deletedImportBatches: deletedBatches.count,
    };
  }

  unmatched() {
    return this.prisma.unmatchedPayment.findMany({ where: { matchStatus: PaymentMatchStatus.UNMATCHED }, orderBy: { createdAt: 'desc' } });
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
