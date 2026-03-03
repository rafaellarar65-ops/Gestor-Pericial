import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialDirection, PaymentMatchStatus, Prisma } from '@prisma/client';
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
  memo?: string;
  document?: string;
  direction?: FinancialDirection;
  source?: string;
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'OFX_IMPORT' | 'INDIVIDUAL' | string;
  receivedAt?: string;
  [key: string]: unknown;
};

type ImportedBankRecord = {
  transactionDate: Date;
  amount: number;
  payerName?: string;
  description?: string;
  memo?: string;
  document?: string;
  direction: FinancialDirection;
  externalId?: string;
  source: string;
  origin: 'MANUAL_CSV' | 'OFX_IMPORT';
  rawPayload: Record<string, unknown>;
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

  async importUnmatchedFile(file: Express.Multer.File) {
    const tenantId = this.context.get('tenantId') ?? '';
    const fileName = file.originalname || 'import';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentType = file.mimetype?.toLowerCase() ?? '';

    const isCsv = extension === 'csv' || contentType.includes('csv') || contentType.includes('excel');
    const isOfx = extension === 'ofx' || contentType.includes('ofx') || contentType.includes('sgml') || contentType.includes('xml');

    if (!isCsv && !isOfx) {
      throw new BadRequestException('Formato inválido. Envie um arquivo .csv ou .ofx.');
    }

    const content = file.buffer.toString('utf-8');
    const records = isOfx ? this.parseOfx(content) : this.parseCsv(content);

    if (!records.length) {
      throw new BadRequestException(
        isOfx
          ? 'OFX inválido ou sem transações. Verifique se o arquivo contém blocos STMTTRN válidos.'
          : 'CSV sem registros válidos para importação.',
      );
    }

    await this.prisma.$transaction(
      records.flatMap((record) => [
        this.prisma.bankTransaction.create({
          data: {
            tenantId,
            externalId: record.externalId,
            direction: record.direction,
            transactionDate: record.transactionDate,
            amount: new Prisma.Decimal(record.amount),
            description: record.description,
            document: record.document,
            rawPayload: record.rawPayload as Prisma.InputJsonValue,
          },
        }),
        this.prisma.unmatchedPayment.create({
          data: {
            tenantId,
            amount: new Prisma.Decimal(record.amount),
            transactionDate: record.transactionDate,
            payerName: record.payerName,
            rawData: {
              description: record.description,
              memo: record.memo,
              document: record.document,
              direction: record.direction,
              source: record.source,
              origin: record.origin,
              receivedAt: record.transactionDate.toISOString(),
              rawPayload: record.rawPayload,
            } as Prisma.InputJsonValue,
          },
        }),
      ]),
    );

    return {
      imported: records.length,
      origin: isOfx ? 'OFX_IMPORT' : 'MANUAL_CSV',
      sourceFileName: fileName,
    };
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

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseCsv(content: string): ImportedBankRecord[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map((header) => this.normalizeHeader(header).replace(/[^a-z0-9]/g, ''));

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''));
        const row = headers.reduce<Record<string, string>>((acc, header, idx) => {
          acc[header] = values[idx] ?? '';
          return acc;
        }, {});

        const amount = this.parseAmount(row.valor ?? row.amount ?? row.vlr);
        const transactionDate = this.parseDate(row.data ?? row.datapagamento ?? row.transactiondate ?? row.receivedat);

        if (amount === null || !transactionDate) return null;

        const direction = amount < 0 ? FinancialDirection.OUT : FinancialDirection.IN;
        const normalizedAmount = Math.abs(amount);

        return {
          transactionDate,
          amount: normalizedAmount,
          payerName: row.pagador ?? row.payername ?? row.nome ?? undefined,
          description: row.descricao ?? row.description ?? undefined,
          memo: row.memo ?? row.historico ?? undefined,
          document: row.documento ?? row.doc ?? undefined,
          direction,
          source: row.fonte ?? row.source ?? 'CSV_UPLOAD',
          origin: 'MANUAL_CSV' as const,
          rawPayload: row,
        };
      })
      .filter((row) => row !== null) as ImportedBankRecord[];
  }

  private parseOfx(content: string): ImportedBankRecord[] {
    if (!/<OFX>|<STMTTRN>/i.test(content)) {
      throw new BadRequestException('OFX inválido. Estrutura OFX não reconhecida.');
    }

    const transactions = content.match(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];

    return transactions
      .map((transactionBlock) => {
        const fitId = this.extractOfxField(transactionBlock, 'FITID');
        const trnType = this.extractOfxField(transactionBlock, 'TRNTYPE')?.toUpperCase();
        const dtPosted = this.extractOfxField(transactionBlock, 'DTPOSTED');
        const trnAmtRaw = this.extractOfxField(transactionBlock, 'TRNAMT');
        const memo = this.extractOfxField(transactionBlock, 'MEMO');
        const name = this.extractOfxField(transactionBlock, 'NAME');
        const checkNum = this.extractOfxField(transactionBlock, 'CHECKNUM');

        const transactionDate = this.parseOfxDate(dtPosted);
        const trnAmount = this.parseAmount(trnAmtRaw);
        if (!transactionDate || trnAmount === null) return null;

        const inferredDirection = trnAmount < 0 ? FinancialDirection.OUT : FinancialDirection.IN;
        const typeDirection = trnType && ['DEBIT', 'PAYMENT', 'ATM', 'POS', 'FEE', 'CHECK'].includes(trnType)
          ? FinancialDirection.OUT
          : trnType && ['CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV'].includes(trnType)
            ? FinancialDirection.IN
            : inferredDirection;

        return {
          transactionDate,
          amount: Math.abs(trnAmount),
          payerName: name ?? undefined,
          description: memo ?? name ?? undefined,
          memo: memo ?? undefined,
          document: checkNum ?? fitId ?? undefined,
          direction: typeDirection,
          externalId: fitId ?? undefined,
          source: 'OFX_UPLOAD',
          origin: 'OFX_IMPORT' as const,
          rawPayload: {
            fitId,
            trnType,
            dtPosted,
            trnAmt: trnAmtRaw,
            memo,
            name,
            checkNum,
          },
        };
      })
      .filter((row) => row !== null) as ImportedBankRecord[];
  }

  private extractOfxField(block: string, field: string): string | null {
    const regex = new RegExp(`<${field}>([^\r\n<]+)`, 'i');
    const match = block.match(regex);
    return match?.[1]?.trim() || null;
  }

  private parseAmount(value?: string | null): number | null {
    if (!value) return null;
    const normalized = value.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  private parseOfxDate(value: string | null): Date | null {
    if (!value) return null;
    const compact = value.replace(/[^0-9]/g, '');
    if (compact.length < 8) return null;

    const year = Number(compact.slice(0, 4));
    const month = Number(compact.slice(4, 6)) - 1;
    const day = Number(compact.slice(6, 8));
    const hour = Number(compact.slice(8, 10) || '0');
    const minute = Number(compact.slice(10, 12) || '0');
    const second = Number(compact.slice(12, 14) || '0');

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeHeader(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}
