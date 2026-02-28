import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsGranularity,
  AnalyticsPeriod,
  AnalyticsViewMode,
  CreateDespesaDto,
  CreateRecebimentoDto,
  FinancialTimelineQueryDto,
  ImportRecebimentosDto,
  ReconcileDto,
} from './dto/financial.dto';

type TimelinePoint = {
  bucketStart: string;
  label: string;
  finance: {
    grossRevenue: number;
    expenses: number;
    forecastByEntry: number;
    unlinkedRevenue: number;
  };
  production: {
    entries: number;
    exits: number;
  };
  workflow: {
    clarificationRequests: number;
    clarificationResponses: number;
  };
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

  async analyticsTimeline(query: FinancialTimelineQueryDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const period = query.period ?? AnalyticsPeriod.YEAR;
    const granularity = query.granularity ?? AnalyticsGranularity.MONTH;
    const includeUnlinked = Boolean(query.includeUnlinked);
    const viewMode = query.viewMode ?? AnalyticsViewMode.FINANCE;

    const { start, end } = this.resolvePeriod(period, query.startDate, query.endDate);
    const periciaWhere: Prisma.PericiaWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.cidadeIds?.length ? { cidadeId: { in: query.cidadeIds } } : {}),
      ...(query.statusIds?.length ? { statusId: { in: query.statusIds } } : {}),
    };

    const [pericias, recebimentos, despesas, logs] = await this.prisma.$transaction([
      this.prisma.pericia.findMany({
        where: periciaWhere,
        select: {
          id: true,
          dataNomeacao: true,
          dataEnvioLaudo: true,
          honorariosPrevistosJG: true,
          honorariosPrevistosPartes: true,
        },
      }),
      this.prisma.recebimento.findMany({
        where: {
          tenantId,
          deletedAt: null,
          dataRecebimento: { gte: start, lte: end },
          ...(query.cidadeIds?.length || query.statusIds?.length
            ? { pericia: periciaWhere }
            : {}),
        },
        select: {
          periciaId: true,
          dataRecebimento: true,
          valorBruto: true,
        },
      }),
      this.prisma.despesa.findMany({
        where: {
          tenantId,
          deletedAt: null,
          dataCompetencia: { gte: start, lte: end },
          ...(query.cidadeIds?.length || query.statusIds?.length
            ? {
                OR: [{ periciaId: null }, { pericia: periciaWhere }],
              }
            : {}),
        },
        select: {
          periciaId: true,
          dataCompetencia: true,
          valor: true,
        },
      }),
      this.prisma.logStatus.findMany({
        where: {
          tenantId,
          createdAt: { gte: start, lte: end },
          ...(query.cidadeIds?.length || query.statusIds?.length
            ? { pericia: periciaWhere }
            : {}),
        },
        select: {
          statusNovo: true,
          createdAt: true,
        },
      }),
    ]);

    const allowedPericiaIds = new Set(pericias.map((item) => item.id));
    const buckets = this.createBuckets(start, end, granularity);

    for (const item of pericias) {
      const entryKey = this.getBucketKey(item.dataNomeacao, granularity);
      if (entryKey && buckets.has(entryKey)) {
        buckets.get(entryKey)!.production.entries += 1;
      }

      const exitKey = this.getBucketKey(item.dataEnvioLaudo, granularity);
      if (exitKey && buckets.has(exitKey)) {
        buckets.get(exitKey)!.production.exits += 1;
      }

      const forecastDate = item.dataNomeacao ?? item.dataEnvioLaudo;
      const forecastKey = this.getBucketKey(forecastDate, granularity);
      if (forecastKey && buckets.has(forecastKey)) {
        const forecastValue = Number(item.honorariosPrevistosJG ?? 0) + Number(item.honorariosPrevistosPartes ?? 0);
        buckets.get(forecastKey)!.finance.forecastByEntry += forecastValue;
      }
    }

    for (const item of recebimentos) {
      const key = this.getBucketKey(item.dataRecebimento, granularity);
      if (!key || !buckets.has(key)) continue;
      const value = Number(item.valorBruto ?? 0);

      if (item.periciaId && allowedPericiaIds.has(item.periciaId)) {
        buckets.get(key)!.finance.grossRevenue += value;
      } else if (!item.periciaId && includeUnlinked) {
        buckets.get(key)!.finance.unlinkedRevenue += value;
      }
    }

    for (const item of despesas) {
      const key = this.getBucketKey(item.dataCompetencia, granularity);
      if (!key || !buckets.has(key)) continue;

      if (!item.periciaId || allowedPericiaIds.has(item.periciaId)) {
        buckets.get(key)!.finance.expenses += Number(item.valor ?? 0);
      }
    }

    for (const item of logs) {
      const key = this.getBucketKey(item.createdAt, granularity);
      if (!key || !buckets.has(key)) continue;
      const status = item.statusNovo.toUpperCase();

      if (status.includes('ESCLAREC')) {
        if (status.includes('RESPOST') || status.includes('RESPOND')) {
          buckets.get(key)!.workflow.clarificationResponses += 1;
        } else {
          buckets.get(key)!.workflow.clarificationRequests += 1;
        }
      }
    }

    const timeline = Array.from(buckets.values());
    const totals = timeline.reduce(
      (acc, bucket) => ({
        grossRevenue: acc.grossRevenue + bucket.finance.grossRevenue,
        expenses: acc.expenses + bucket.finance.expenses,
        forecastByEntry: acc.forecastByEntry + bucket.finance.forecastByEntry,
        unlinkedRevenue: acc.unlinkedRevenue + bucket.finance.unlinkedRevenue,
        entries: acc.entries + bucket.production.entries,
        exits: acc.exits + bucket.production.exits,
        clarificationRequests: acc.clarificationRequests + bucket.workflow.clarificationRequests,
        clarificationResponses: acc.clarificationResponses + bucket.workflow.clarificationResponses,
      }),
      {
        grossRevenue: 0,
        expenses: 0,
        forecastByEntry: 0,
        unlinkedRevenue: 0,
        entries: 0,
        exits: 0,
        clarificationRequests: 0,
        clarificationResponses: 0,
      },
    );

    return {
      filtersApplied: {
        viewMode,
        period,
        granularity,
        includeUnlinked,
        cidadeIds: query.cidadeIds ?? [],
        statusIds: query.statusIds ?? [],
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      series: timeline,
      totals,
    };
  }

  chargeAutomation() {
    return { enqueued: true, queue: 'charge-dispatch', message: 'Cobranças automáticas enfileiradas.' };
  }

  private resolvePeriod(period: AnalyticsPeriod, startDate?: string, endDate?: string) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (period === AnalyticsPeriod.CUSTOM) {
      if (!startDate || !endDate) {
        throw new BadRequestException('Para período CUSTOM, startDate e endDate são obrigatórios.');
      }
      const startCustom = new Date(startDate);
      const endCustom = new Date(endDate);
      startCustom.setHours(0, 0, 0, 0);
      endCustom.setHours(23, 59, 59, 999);
      if (startCustom > endCustom) {
        throw new BadRequestException('startDate não pode ser maior que endDate.');
      }
      return { start: startCustom, end: endCustom };
    }

    if (period === AnalyticsPeriod.LAST_30) {
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (period === AnalyticsPeriod.LAST_90) {
      const start = new Date(end);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    const start = new Date(end.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private createBuckets(start: Date, end: Date, granularity: AnalyticsGranularity) {
    const cursor = new Date(start);
    const map = new Map<string, TimelinePoint>();

    while (cursor <= end) {
      const key = this.getBucketKey(cursor, granularity);
      if (!key) break;
      if (!map.has(key)) {
        const bucketDate = this.bucketDate(cursor, granularity);
        map.set(key, {
          bucketStart: bucketDate.toISOString(),
          label: this.bucketLabel(bucketDate, granularity),
          finance: { grossRevenue: 0, expenses: 0, forecastByEntry: 0, unlinkedRevenue: 0 },
          production: { entries: 0, exits: 0 },
          workflow: { clarificationRequests: 0, clarificationResponses: 0 },
        });
      }
      this.incrementCursor(cursor, granularity);
    }

    return map;
  }

  private incrementCursor(cursor: Date, granularity: AnalyticsGranularity) {
    if (granularity === AnalyticsGranularity.DAY) {
      cursor.setDate(cursor.getDate() + 1);
      return;
    }

    if (granularity === AnalyticsGranularity.WEEK) {
      cursor.setDate(cursor.getDate() + 7);
      return;
    }

    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }

  private bucketDate(date: Date, granularity: AnalyticsGranularity): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);

    if (granularity === AnalyticsGranularity.MONTH) {
      copy.setDate(1);
    }

    if (granularity === AnalyticsGranularity.WEEK) {
      const day = copy.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      copy.setDate(copy.getDate() + diff);
    }

    return copy;
  }

  private getBucketKey(date: Date | null | undefined, granularity: AnalyticsGranularity): string | null {
    if (!date) return null;
    const bucketDate = this.bucketDate(new Date(date), granularity);

    if (granularity === AnalyticsGranularity.DAY) {
      return bucketDate.toISOString().slice(0, 10);
    }

    if (granularity === AnalyticsGranularity.WEEK) {
      return `${bucketDate.getUTCFullYear()}-W${String(this.getIsoWeek(bucketDate)).padStart(2, '0')}`;
    }

    return `${bucketDate.getUTCFullYear()}-${String(bucketDate.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private bucketLabel(date: Date, granularity: AnalyticsGranularity): string {
    if (granularity === AnalyticsGranularity.DAY) {
      return date.toLocaleDateString('pt-BR');
    }

    if (granularity === AnalyticsGranularity.WEEK) {
      return `Sem ${this.getIsoWeek(date)}/${date.getUTCFullYear()}`;
    }

    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }

  private getIsoWeek(date: Date): number {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
