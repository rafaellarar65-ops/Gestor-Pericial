import { Injectable, NotFoundException } from '@nestjs/common';
import { FontePagamento, PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDespesaDto,
  CreateRecebimentoDto,
  ImportRecebimentosDto,
  ReconcileDto,
  UpdateUnmatchedPaymentDto,
} from './dto/financial.dto';
import { ImportCsvDto, type ImportSourceType, LinkUnmatchedPaymentDto } from './dto/import.dto';

type ParsedCsvPayment = {
  cnj: string;
  dataRecebimento: Date;
  valorBruto: number;
  valorLiquido: number;
  desconto: number;
  inss: number;
  irpf: number;
  sourceType: ImportSourceType;
  sourceLabel?: string;
  rawLine: Record<string, string>;
};

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

  parseCsv(content: string, sourceType: ImportSourceType, sourceLabel?: string): ParsedCsvPayment[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) return [];

    const separator = sourceType === 'AJG' ? ';' : ',';
    const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase());

    return lines.slice(1).map((line) => {
      const values = line.split(separator).map((value) => value.trim());
      const row = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = values[index] ?? '';
        return acc;
      }, {});

      const cnj = row['processo'] || row['cnj'] || row['processo cnj'] || '';
      const dataRaw = row['data pagamento'] || row['data'] || '';
      const brutoRaw = row['valor bruto'] || row['bruto'] || '';
      const liquidoRaw = row['valor líquido'] || row['líquido'] || row['liquido'] || '';
      const descontoRaw = row['desconto'] || '0';
      const inssRaw = row['inss'] || '0';
      const irpfRaw = row['irpf'] || '0';

      const dataRecebimento = this.parseDateBySource(dataRaw, sourceType);
      return {
        cnj,
        dataRecebimento,
        valorBruto: this.parseCurrency(brutoRaw),
        valorLiquido: this.parseCurrency(liquidoRaw),
        desconto: this.parseCurrency(descontoRaw),
        inss: this.parseCurrency(inssRaw),
        irpf: this.parseCurrency(irpfRaw),
        sourceType,
        ...(sourceLabel ? { sourceLabel } : {}),
        rawLine: row,
      };
    });
  }

  async matchPayments(payments: ParsedCsvPayment[]) {
    const tenantId = this.context.get('tenantId') ?? '';
    const pericias = await this.prisma.pericia.findMany({
      where: { tenantId },
      select: { id: true, processoCNJ: true },
    });

    const periciaByCnj = new Map<string, { id: string; processoCNJ: string }>();
    for (const pericia of pericias) {
      periciaByCnj.set(this.normalizeCnj(pericia.processoCNJ), pericia);
    }

    const matched: Array<{ payment: ParsedCsvPayment; periciaId: string }> = [];
    const unmatched: ParsedCsvPayment[] = [];

    for (const payment of payments) {
      const key = this.normalizeCnj(payment.cnj);
      const pericia = periciaByCnj.get(key);
      if (pericia) {
        matched.push({ payment, periciaId: pericia.id });
      } else {
        unmatched.push(payment);
      }
    }

    return { matched, unmatched };
  }

  calculateBatchTotals(recebimentos: Array<Pick<ParsedCsvPayment, 'valorBruto' | 'valorLiquido' | 'inss' | 'irpf' | 'desconto'>>) {
    return recebimentos.reduce(
      (acc, item) => {
        acc.valorBruto += item.valorBruto;
        acc.valorLiquido += item.valorLiquido;
        acc.inss += item.inss;
        acc.irpf += item.irpf;
        acc.desconto += item.desconto;
        return acc;
      },
      { valorBruto: 0, valorLiquido: 0, inss: 0, irpf: 0, desconto: 0 },
    );
  }

  async importCsv(dto: ImportCsvDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const parsedPayments = this.parseCsv(dto.csvContent, dto.sourceType, dto.sourceLabel);

    const batch = await this.prisma.importBatch.create({
      data: {
        tenantId,
        totalRecords: parsedPayments.length,
        status: 'PROCESSING',
        metadata: {
          sourceType: dto.sourceType,
          ...(dto.sourceLabel ? { sourceLabel: dto.sourceLabel } : {}),
        },
      },
    });

    const { matched, unmatched } = await this.matchPayments(parsedPayments);
    const fontePagamento = this.mapSourceToFonte(dto.sourceType);

    await this.prisma.$transaction([
      ...matched.map(({ payment, periciaId }) =>
        this.prisma.recebimento.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            periciaId,
            fontePagamento,
            dataRecebimento: payment.dataRecebimento,
            valorBruto: new Prisma.Decimal(payment.valorBruto),
            valorLiquido: new Prisma.Decimal(payment.valorLiquido),
            desconto: new Prisma.Decimal(payment.desconto),
            tarifa: new Prisma.Decimal(payment.inss + payment.irpf),
            descricao: `Importação ${dto.sourceType}${dto.sourceLabel ? ` - ${dto.sourceLabel}` : ''}`,
            metadata: {
              cnj: payment.cnj,
              inss: payment.inss,
              irpf: payment.irpf,
              sourceType: payment.sourceType,
            },
          },
        }),
      ),
      ...unmatched.map((payment) =>
        this.prisma.unmatchedPayment.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            amount: new Prisma.Decimal(payment.valorLiquido || payment.valorBruto),
            transactionDate: payment.dataRecebimento,
            payerName: dto.sourceLabel ?? dto.sourceType,
            rawData: {
              cnj: payment.cnj,
              source: dto.sourceType,
              description: `Não localizado por CNJ na importação ${dto.sourceType}`,
              origin: 'MANUAL_CSV',
              valorBruto: payment.valorBruto,
              valorLiquido: payment.valorLiquido,
              inss: payment.inss,
              irpf: payment.irpf,
              rawLine: payment.rawLine,
            },
            notes: 'Aguardando vínculo manual por CNJ',
          },
        }),
      ),
    ]);

    const totals = this.calculateBatchTotals(parsedPayments);

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        matchedRecords: matched.length,
        unmatchedRecords: unmatched.length,
        status: 'DONE',
        metadata: {
          sourceType: dto.sourceType,
          ...(dto.sourceLabel ? { sourceLabel: dto.sourceLabel } : {}),
          totals,
        },
      },
    });

    return {
      batchId: batch.id,
      summary: {
        total: parsedPayments.length,
        matched: matched.length,
        unmatched: unmatched.length,
        totals,
      },
    };
  }

  async listImportBatches() {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.importBatch.findMany({
      where: { tenantId },
      orderBy: { importedAt: 'desc' },
      take: 100,
    });
  }

  async linkPaymentToPericia(paymentId: string, dto: LinkUnmatchedPaymentDto) {
    const unmatched = await this.prisma.unmatchedPayment.findUnique({ where: { id: paymentId } });
    if (!unmatched) throw new NotFoundException('Pagamento não vinculado não encontrado.');

    const amount = Number(unmatched.amount ?? 0);
    const transactionDate = unmatched.transactionDate ?? new Date();

    const recebimento = await this.prisma.recebimento.create({
      data: {
        tenantId: unmatched.tenantId,
        importBatchId: unmatched.importBatchId ?? undefined,
        periciaId: dto.periciaId,
        fontePagamento: FontePagamento.OUTRO,
        dataRecebimento: transactionDate,
        valorBruto: new Prisma.Decimal(amount),
        valorLiquido: new Prisma.Decimal(amount),
        descricao: 'Recebimento vinculado manualmente a partir de pagamento não vinculado',
        metadata: {
          unmatchedPaymentId: unmatched.id,
          rawData: unmatched.rawData,
        },
      },
    });

    await this.prisma.unmatchedPayment.delete({ where: { id: paymentId } });

    return { linked: true, recebimentoId: recebimento.id };
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


  async conciliationStats() {
    const rows = await this.prisma.unmatchedPayment.findMany({
      select: { amount: true, matchStatus: true, notes: true, rawData: true },
    });

    const parseOrigin = (rawData: unknown) => {
      const raw = (rawData ?? {}) as RawUnmatchedData;
      const origin = typeof raw.origin === 'string' ? raw.origin : 'INDIVIDUAL';
      if (origin === 'MANUAL_CSV') return 'CSV';
      if (origin === 'AI_PRINT') return 'OFX';
      return 'INDIVIDUAL';
    };

    const isIgnored = (row: { matchStatus: PaymentMatchStatus; notes: string | null }) =>
      row.matchStatus === PaymentMatchStatus.PARTIAL && (row.notes ?? '').includes('[DISCARDED]');

    const total = rows.length;
    const ignored = rows.filter((row) => isIgnored(row as { matchStatus: PaymentMatchStatus; notes: string | null })).length;
    const matched = rows.filter((row) => row.matchStatus === PaymentMatchStatus.MATCHED).length;
    const pending = total - matched - ignored;

    const autoMatched = rows.filter((row) => {
      if (row.matchStatus !== PaymentMatchStatus.MATCHED) return false;
      const note = (row.notes ?? '').toLowerCase();
      return note.includes('auto') || note.includes('lote por cnj');
    }).length;

    const autoMatchRate = matched > 0 ? Number(((autoMatched / matched) * 100).toFixed(2)) : 0;

    const byOrigin = rows.reduce(
      (acc, row) => {
        const key = parseOrigin(row.rawData);
        acc[key] += 1;
        return acc;
      },
      { CSV: 0, OFX: 0, INDIVIDUAL: 0 },
    );

    const matchedVolume = rows.reduce((sum, row) => {
      if (row.matchStatus !== PaymentMatchStatus.MATCHED) return sum;
      return sum + Number(row.amount ?? 0);
    }, 0);

    const pendingVolume = rows.reduce((sum, row) => {
      if (row.matchStatus === PaymentMatchStatus.MATCHED || isIgnored(row as { matchStatus: PaymentMatchStatus; notes: string | null })) {
        return sum;
      }
      return sum + Number(row.amount ?? 0);
    }, 0);

    const ignoredVolume = rows.reduce((sum, row) => {
      if (!isIgnored(row as { matchStatus: PaymentMatchStatus; notes: string | null })) return sum;
      return sum + Number(row.amount ?? 0);
    }, 0);

    return {
      totals: {
        reconciled: matched,
        unreconciled: pending,
        ignored,
        total,
      },
      autoMatching: {
        automaticMatches: autoMatched,
        totalReconciliable: matched,
        rate: autoMatchRate,
      },
      originDistribution: byOrigin,
      financialVolume: {
        reconciled: Number(matchedVolume.toFixed(2)),
        pending: Number(pendingVolume.toFixed(2)),
        ignored: Number(ignoredVolume.toFixed(2)),
      },
    };
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

  private parseCurrency(raw: string): number {
    const value = raw.trim();
    if (!value) return 0;

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    let normalized = value;
    if (hasComma && hasDot) {
      normalized = value.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = value.replace(',', '.');
    }

    const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseDateBySource(raw: string, sourceType: ImportSourceType): Date {
    if (sourceType === 'TJ') {
      const [day, month, year] = raw.split('/').map((piece) => Number(piece));
      const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
      return Number.isNaN(date.getTime()) ? new Date() : date;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private normalizeCnj(cnj: string): string {
    return cnj.replace(/\D/g, '');
  }

  private mapSourceToFonte(sourceType: ImportSourceType): FontePagamento {
    if (sourceType === 'TJ') return FontePagamento.TJ;
    if (sourceType === 'PARTES') return FontePagamento.PARTE_AUTORA;
    return FontePagamento.OUTRO;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
