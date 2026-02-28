import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDespesaDto,
  CreateRecebimentoDto,
  ImportRecebimentosDto,
  ReconcileDto,
  UpdateUnmatchedPaymentDto,
} from './dto/financial.dto';

type RawUnmatchedData = {
  cnj?: string;
  description?: string;
  source?: string;
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL' | string;
  receivedAt?: string;
  [key: string]: unknown;
};

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

  async unmatched() {
    const rows = await this.prisma.unmatchedPayment.findMany({
      where: { matchStatus: { in: [PaymentMatchStatus.UNMATCHED, PaymentMatchStatus.PARTIAL] } },
      orderBy: { transactionDate: 'desc' },
    });

    return rows
      .map((row) => {
        const raw = (row.rawData ?? {}) as RawUnmatchedData;
        const receivedAt = row.transactionDate ?? this.parseDate(raw.receivedAt) ?? row.createdAt;
        const isDiscarded = row.matchStatus === PaymentMatchStatus.PARTIAL && (row.notes ?? '').includes('[DISCARDED]');

        return {
          ...row,
          amount: row.amount ? Number(row.amount) : null,
          receivedAt,
          cnj: typeof raw.cnj === 'string' ? raw.cnj : null,
          description: typeof raw.description === 'string' ? raw.description : null,
          source: typeof raw.source === 'string' ? raw.source : null,
          origin: typeof raw.origin === 'string' ? raw.origin : 'INDIVIDUAL',
          ignored: isDiscarded,
        };
      })
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  async updateUnmatched(id: string, dto: UpdateUnmatchedPaymentDto) {
    const existing = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pagamento não vinculado não encontrado.');

    const raw = ((existing.rawData ?? {}) as RawUnmatchedData);
    const nextRaw: RawUnmatchedData = {
      ...raw,
      ...(dto.cnj !== undefined ? { cnj: dto.cnj } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
      ...(dto.receivedAt !== undefined ? { receivedAt: dto.receivedAt } : {}),
    };

    const updated = await this.prisma.unmatchedPayment.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.receivedAt !== undefined ? { transactionDate: new Date(dto.receivedAt) } : {}),
        ...(dto.payerName !== undefined ? { payerName: dto.payerName } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        rawData: nextRaw as Prisma.InputJsonValue,
      },
    });

    return { ...updated, amount: updated.amount ? Number(updated.amount) : null };
  }

  async linkUnmatched(id: string, body: { periciaId?: string; note?: string }) {
    const existing = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pagamento não vinculado não encontrado.');

    const note = body.note?.trim() || 'Vinculado manualmente';

    const updated = await this.prisma.unmatchedPayment.update({
      where: { id },
      data: {
        matchStatus: PaymentMatchStatus.MATCHED,
        notes: body.periciaId ? `${note} | periciaId:${body.periciaId}` : note,
      },
    });

    return { ...updated, amount: updated.amount ? Number(updated.amount) : null };
  }

  async discardUnmatched(id: string, note?: string) {
    const existing = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pagamento não vinculado não encontrado.');

    const updated = await this.prisma.unmatchedPayment.update({
      where: { id },
      data: {
        matchStatus: PaymentMatchStatus.PARTIAL,
        notes: `[DISCARDED] ${note?.trim() || 'Ignorado manualmente'}`,
      },
    });

    return { ...updated, amount: updated.amount ? Number(updated.amount) : null, status: 'DISCARDED' as const };
  }

  async deleteUnmatched(id: string, reason?: string) {
    const existing = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pagamento não vinculado não encontrado.');

    await this.prisma.activityLog.create({
      data: {
        tenantId: existing.tenantId,
        entityType: 'UnmatchedPayment',
        entityId: existing.id,
        action: 'DELETE',
        payloadJson: {
          reason: reason?.trim() || 'Exclusão manual',
          previous: existing,
        },
      },
    });

    await this.prisma.unmatchedPayment.delete({ where: { id } });
    return { deleted: true, id };
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

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
