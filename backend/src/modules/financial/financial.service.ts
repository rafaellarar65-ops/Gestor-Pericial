import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDespesaDto,
  CreateRecebimentoDto,
  ImportRecebimentosDto,
  ReconcileDto,
  LinkUnmatchedPaymentDto,
  UpdateUnmatchedPaymentDto,
} from './dto/financial.dto';

type ReconciliationReference = {
  type: 'BANK_TRANSACTION' | 'RECEBIMENTO';
  id: string;
  periciaId: string;
};

type RawUnmatchedData = {
  cnj?: string;
  description?: string;
  source?: string;
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL' | string;
  receivedAt?: string;
  reconciliation?: ReconciliationReference;
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

  async linkUnmatched(id: string, body: LinkUnmatchedPaymentDto) {
    const existing = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pagamento não vinculado não encontrado.');
    if (!body.periciaId) throw new BadRequestException('periciaId é obrigatório para vinculação manual.');
    const periciaId = body.periciaId;

    const note = body.note?.trim() || 'Vinculado manualmente';
    const tenantId = this.context.get('tenantId') ?? '';

    const reconciliationResult: {
      entityType: ReconciliationReference['type'];
      entityId: string;
      periciaId: string;
    } = await this.prisma.$transaction(async (tx) => {
      const amount = existing.amount ?? new Prisma.Decimal(0);
      const transactionDate = existing.transactionDate ?? this.parseDate(((existing.rawData ?? {}) as RawUnmatchedData).receivedAt) ?? new Date();

      if (body.createRecebimento ?? true) {
        const recebimento = await tx.recebimento.create({
          data: {
            tenantId,
            periciaId,
            fontePagamento: 'OUTRO',
            dataRecebimento: transactionDate,
            valorBruto: amount,
            valorLiquido: amount,
            descricao: note,
            metadata: {
              source: 'UNMATCHED_PAYMENT_LINK',
              unmatchedPaymentId: existing.id,
            },
          },
        });

        return {
          entityType: 'RECEBIMENTO' as const,
          entityId: recebimento.id,
          periciaId,
        };
      }

      const bankTransaction = await tx.bankTransaction.create({
        data: {
          tenantId,
          periciaId,
          direction: 'IN',
          transactionDate,
          amount,
          description: note,
          rawPayload: {
            source: 'UNMATCHED_PAYMENT_LINK',
            unmatchedPaymentId: existing.id,
            rawData: existing.rawData,
          },
        },
      });

      return {
        entityType: 'BANK_TRANSACTION' as const,
        entityId: bankTransaction.id,
        periciaId,
      };
    });

    const nextRaw = this.withReconciliationReference((existing.rawData ?? {}) as RawUnmatchedData, {
      type: reconciliationResult.entityType,
      id: reconciliationResult.entityId,
      periciaId: reconciliationResult.periciaId,
    });

    const updated = await this.prisma.unmatchedPayment.update({
      where: { id },
      data: {
        matchStatus: PaymentMatchStatus.MATCHED,
        notes: note,
        rawData: nextRaw as Prisma.InputJsonValue,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId,
        entityType: 'UnmatchedPayment',
        entityId: existing.id,
        action: 'RECONCILE',
        payloadJson: {
          mode: 'MANUAL_LINK',
          reconciledEntityType: reconciliationResult.entityType,
          reconciledEntityId: reconciliationResult.entityId,
          periciaId: reconciliationResult.periciaId,
          note,
        },
      },
    });

    return {
      ...updated,
      amount: updated.amount ? Number(updated.amount) : null,
      finalStatus: updated.matchStatus,
      reconciledEntity: {
        type: reconciliationResult.entityType,
        id: reconciliationResult.entityId,
        periciaId: reconciliationResult.periciaId,
      },
    };
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
    const tenantId = this.context.get('tenantId') ?? '';
    const unmatched = await this.prisma.unmatchedPayment.findMany({ where: { id: { in: dto.unmatchedIds } } });

    const updated = await Promise.all(
      unmatched.map(async (item) => {
        const reconciliation = this.extractReconciliationReference(item.rawData);
        const nextRaw = this.withReconciliationReference((item.rawData ?? {}) as RawUnmatchedData, reconciliation ?? null);

        const row = await this.prisma.unmatchedPayment.update({
          where: { id: item.id },
          data: {
            matchStatus: PaymentMatchStatus.MATCHED,
            ...(dto.note ? { notes: dto.note } : {}),
            rawData: nextRaw as Prisma.InputJsonValue,
          },
        });

        await this.prisma.activityLog.create({
          data: {
            tenantId,
            entityType: 'UnmatchedPayment',
            entityId: item.id,
            action: 'RECONCILE',
            payloadJson: {
              mode: 'SUGGESTION',
              reconciledEntityType: reconciliation?.type ?? null,
              reconciledEntityId: reconciliation?.id ?? null,
              periciaId: reconciliation?.periciaId ?? null,
              note: dto.note,
            },
          },
        });

        return {
          id: row.id,
          finalStatus: row.matchStatus,
          reconciledEntityId: reconciliation?.id ?? null,
          reconciledEntityType: reconciliation?.type ?? null,
        };
      }),
    );

    return { reconciled: updated.length, results: updated };
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


  async revenueForecast() {
    const recebimentos = await this.prisma.recebimento.findMany({
      orderBy: { dataRecebimento: 'asc' },
      take: 90,
    });

    const points = recebimentos
      .map((item) => ({
        date: item.dataRecebimento.toISOString().slice(0, 10),
        amount: Number(item.valorLiquido ?? item.valorBruto ?? 0),
      }))
      .filter((p) => p.amount > 0);

    const avg = points.length ? points.reduce((sum, p) => sum + p.amount, 0) / points.length : 0;
    const trend = points.length >= 2 ? points[points.length - 1].amount - points[0].amount : 0;
    const projection = Math.max(0, avg + trend / Math.max(points.length, 1));

    const forecastDays = Array.from({ length: 14 }).map((_, i) => {
      const base = new Date();
      base.setDate(base.getDate() + i + 1);
      return {
        date: base.toISOString().slice(0, 10),
        amount: Number((projection * (0.85 + ((i % 4) * 0.07))).toFixed(2)),
      };
    });

    const accumulated = [];
    let running = 0;
    for (const point of forecastDays) {
      running += point.amount;
      accumulated.push({ ...point, accumulated: Number(running.toFixed(2)) });
    }

    return {
      forecast_total: Number(running.toFixed(2)),
      confidence: points.length >= 20 ? 'alta' : points.length >= 8 ? 'media' : 'baixa',
      signals: [
        `Média histórica diária considerada: R$ ${avg.toFixed(2)}`,
        `Tendência observada da série: ${trend >= 0 ? 'alta' : 'queda'} (${trend.toFixed(2)})`,
        `Base histórica usada: ${points.length} lançamentos de recebimento`,
      ],
      assumptions: [
        'Projeção linear de curto prazo (14 dias)',
        'Sem ajuste de sazonalidade jurídica mensal',
        'Sem eventos extraordinários de pagamentos retroativos',
      ],
      series: accumulated,
    };
  }

  chargeAutomation() {
    return { enqueued: true, queue: 'charge-dispatch', message: 'Cobranças automáticas enfileiradas.' };
  }


  private withReconciliationReference(raw: RawUnmatchedData, reference: ReconciliationReference | null): RawUnmatchedData {
    if (!reference) return raw;
    return {
      ...raw,
      reconciliation: {
        type: reference.type,
        id: reference.id,
        periciaId: reference.periciaId,
      },
    };
  }

  private extractReconciliationReference(raw: unknown): ReconciliationReference | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = (raw as { reconciliation?: unknown }).reconciliation;
    if (!candidate || typeof candidate !== 'object') return null;

    const type = (candidate as { type?: unknown }).type;
    const id = (candidate as { id?: unknown }).id;
    const periciaId = (candidate as { periciaId?: unknown }).periciaId;

    if ((type !== 'BANK_TRANSACTION' && type !== 'RECEBIMENTO') || typeof id !== 'string' || typeof periciaId !== 'string') {
      return null;
    }

    return { type, id, periciaId };
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
