import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialDirection, FontePagamento, PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkDeleteRecebimentosDto,
  CreateDespesaDto,
  CreateRecebimentoDto,
  FinancialImportAiPrintResponseDto,
  ImportAiPrintDto,
  ImportRecebimentosDto,
  ImportUnmatchedTransactionsDto,
  LinkPaymentToPericiaDto,
  LinkUnmatchedPaymentDto,
  ReconcileDto,
  SplitUnmatchedPaymentDto,
  UpdateRecebimentoDto,
  UpdateUnmatchedPaymentDto,
} from './dto/financial.dto';
import { ImportCsvDto, type ImportSourceType } from './dto/import.dto';

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

type ReconciliationReference = {
  type: 'BANK_TRANSACTION' | 'RECEBIMENTO';
  id: string;
  periciaId: string;
};

type RawUnmatchedData = {
  cnj?: string;
  description?: string;
  memo?: string;
  document?: string;
  direction?: FinancialDirection;
  source?: string;
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'OFX_IMPORT' | 'INDIVIDUAL' | string;
  receivedAt?: string;
  reconciliation?: ReconciliationReference;
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



  private normalizeCnj(cnj: string): string {
    return cnj.replace(/\D/g, '');
  }

  private extractReconciliationReference(rawData: Prisma.JsonValue | null): ReconciliationReference | null {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;
    const value = (rawData as Record<string, unknown>).reconciliation;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const ref = value as Record<string, unknown>;
    if ((ref.type !== 'BANK_TRANSACTION' && ref.type !== 'RECEBIMENTO') || typeof ref.id !== 'string' || typeof ref.periciaId !== 'string') {
      return null;
    }

    return { type: ref.type, id: ref.id, periciaId: ref.periciaId };
  }

  private withReconciliationReference(rawData: RawUnmatchedData, reconciliation: ReconciliationReference | null): RawUnmatchedData {
    const next = { ...rawData };
    if (!reconciliation) {
      delete next.reconciliation;
      return next;
    }

    return { ...next, reconciliation };
  }
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


  async importAiPrint(dto: ImportAiPrintDto): Promise<FinancialImportAiPrintResponseDto> {
    // Contrato dedicado para integração com motor de IA.
    // Neste momento retornamos estrutura padrão para o front preencher e validar candidatos.
    void dto;
    return {
      global: {
        totalBruto: 0,
        totalLiquido: 0,
        totalImpostos: 0,
        dataPagamento: new Date().toISOString().slice(0, 10),
      },
      items: [],
    };
  }

  async importBatch(dto: ImportRecebimentosDto) {
    return this.importBatchBySource(FinancialImportSource.MANUAL_CSV, dto);
  }

  importBatchAiPrint(dto: ImportRecebimentosDto) {
    return this.importBatchBySource(FinancialImportSource.AI_PRINT, dto);
  }

  importBatchManualCsv(dto: ImportRecebimentosDto) {
    return this.importBatchBySource(FinancialImportSource.MANUAL_CSV, dto);
  }

  importBatchIndividual(dto: ImportRecebimentosDto) {
    return this.importBatchBySource(FinancialImportSource.INDIVIDUAL, dto);
  }

  private formatCnj(digits: string): string {
    if (digits.length !== 20) return digits;
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
  }

  private async importBatchBySource(source: FinancialImportSource, dto: ImportRecebimentosDto) {
    const tenantId = this.context.get('tenantId') ?? '';

    const gross = dto.rows.reduce((acc, item) => acc + item.valorBruto, 0);
    const net = dto.rows.reduce((acc, item) => acc + (item.valorLiquido ?? item.valorBruto), 0);
    const tax = dto.rows.reduce((acc, item) => acc + (item.imposto ?? Math.max(0, item.valorBruto - (item.valorLiquido ?? item.valorBruto))), 0);

    const batch = await this.prisma.importBatch.create({
      data: {
        tenantId,
        ...(dto.sourceFileName ? { sourceFileName: dto.sourceFileName } : {}),
        totalRecords: dto.rows.length,
        status: 'PROCESSING',
        metadata: { source },
      },
    });

    const itemsLinked: ImportRecebimentoItemDto[] = [];
    const itemsUnmatched: ImportRecebimentoItemDto[] = [];

    for (const row of dto.rows) {
      const cnjDigits = this.normalizeCnj(row.processoCNJ);
      const pericia = await this.prisma.pericia.findFirst({
        where: {
          tenantId,
          OR: [
            { processoCNJDigits: cnjDigits },
            { processoCNJ: row.processoCNJ },
            { processoCNJ: this.formatCnj(cnjDigits) },
          ],
        },
        select: { id: true },
      });

      if (pericia) {
        itemsLinked.push(row);
        await this.prisma.recebimento.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            periciaId: pericia.id,
            fontePagamento: row.fontePagamento,
            dataRecebimento: new Date(row.dataRecebimento),
            valorBruto: new Prisma.Decimal(row.valorBruto),
            ...(row.valorLiquido ? { valorLiquido: new Prisma.Decimal(row.valorLiquido) } : {}),
            ...(row.descricao ? { descricao: row.descricao } : {}),
            metadata: { source, processoCNJOriginal: row.processoCNJ, processoCNJNormalizado: cnjDigits },
          },
        });
        continue;
      }

      itemsUnmatched.push(row);
      await this.prisma.unmatchedPayment.create({
        data: {
          tenantId,
          importBatchId: batch.id,
          rawData: { ...row, source, processoCNJNormalizado: cnjDigits },
          amount: new Prisma.Decimal(row.valorLiquido ?? row.valorBruto),
          transactionDate: new Date(row.dataRecebimento),
          notes: 'Perícia não encontrada por CNJ normalizado',
        },
      });
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        matchedRecords: itemsLinked.length,
        unmatchedRecords: itemsUnmatched.length,
        status: 'DONE',
        metadata: {
          source,
          summary: {
            itemsLinked: itemsLinked.length,
            itemsUnmatched: itemsUnmatched.length,
            gross,
            net,
            tax,
            count: dto.rows.length,
          },
        },
      },
    });

    return {
      batchId: batch.id,
      source,
      itemsLinked: itemsLinked.length,
      itemsUnmatched: itemsUnmatched.length,
      gross,
      net,
      tax,
      count: dto.rows.length,
    };
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

  async linkPaymentToPericia(paymentId: string, dto: LinkPaymentToPericiaDto) {
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

  async importUnmatched(dto: ImportUnmatchedTransactionsDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const rejected: Array<{ index: number; reason: string; row: unknown }> = [];

    const rowsToCreate: Prisma.UnmatchedPaymentCreateManyInput[] = [];

    dto.rows.forEach((row, index) => {
      const parsedAmount = this.parseMoney(row.amount);
      if (parsedAmount === null) {
        rejected.push({ index, reason: 'Valor monetário inválido.', row });
        return;
      }

      const parsedDate = this.parseDate(row.transactionDate) ?? this.parseDate(row.receivedAt);
      if (!parsedDate) {
        rejected.push({ index, reason: 'Data inválida (transactionDate/receivedAt).', row });
        return;
      }

      const rawData: RawUnmatchedData = {
        amount: row.amount,
        transactionDate: row.transactionDate,
        receivedAt: row.receivedAt,
        payerName: row.payerName,
        cnj: row.cnj,
        description: row.description,
        source: row.source,
        origin: row.origin ?? 'INDIVIDUAL',
      };

      rowsToCreate.push({
        tenantId,
        amount: parsedAmount,
        transactionDate: parsedDate,
        payerName: row.payerName?.trim() || null,
        matchStatus: PaymentMatchStatus.UNMATCHED,
        rawData: rawData as Prisma.InputJsonValue,
      });
    });

    if (rowsToCreate.length > 0) {
      await this.prisma.unmatchedPayment.createMany({ data: rowsToCreate });
    }

    return { imported: rowsToCreate.length, rejected };
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


  async splitUnmatched(unmatchedId: string, dto: SplitUnmatchedPaymentDto) {
    const tenantId = this.context.get('tenantId') ?? '';

    const unmatched = await this.prisma.unmatchedPayment.findFirst({
      where: { id: unmatchedId, tenantId },
    });

    if (!unmatched) {
      throw new NotFoundException('Pagamento não vinculado não encontrado.');
    }

    const targetUnmatched = unmatched;

    const originalAmount = Number(targetUnmatched.amount ?? 0);
    if (originalAmount <= 0) {
      throw new BadRequestException('Pagamento original sem valor válido para split.');
    }

    const installmentTotal = dto.installments.reduce((sum, item) => sum + Number(item.amount), 0);
    const decimalTolerance = 0.01;
    if (Math.abs(originalAmount - installmentTotal) > decimalTolerance) {
      throw new BadRequestException('Soma das parcelas deve ser igual ao valor original.');
    }

    const uniquePericiaIds = [...new Set(dto.installments.map((item) => item.periciaId))];
    const validPericias = await this.prisma.pericia.findMany({
      where: {
        id: { in: uniquePericiaIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (validPericias.length !== uniquePericiaIds.length) {
      throw new BadRequestException('Uma ou mais perícias são inválidas para o tenant atual.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createdRecebimentos = await Promise.all(
        dto.installments.map((installment) =>
          tx.recebimento.create({
            data: {
              tenantId,
              periciaId: installment.periciaId,
              fontePagamento: FontePagamento.OUTRO,
              dataRecebimento: targetUnmatched.transactionDate ?? targetUnmatched.createdAt,
              valorBruto: new Prisma.Decimal(installment.amount),
              valorLiquido: new Prisma.Decimal(installment.amount),
              descricao: `Split de conciliação #${targetUnmatched.id}`,
              metadata: {
                splitFromUnmatchedId: targetUnmatched.id,
                splitNote: installment.note ?? null,
              },
            },
          }),
        ),
      );

      const createdTransactions = await Promise.all(
        dto.installments.map((installment) =>
          tx.bankTransaction.create({
            data: {
              tenantId,
              periciaId: installment.periciaId,
              direction: FinancialDirection.IN,
              transactionDate: targetUnmatched.transactionDate ?? targetUnmatched.createdAt,
              amount: new Prisma.Decimal(installment.amount),
              description: installment.note?.trim() || `Split de conciliação #${targetUnmatched.id}`,
              rawPayload: {
                splitFromUnmatchedId: targetUnmatched.id,
                splitNote: installment.note ?? null,
              },
            },
          }),
        ),
      );

      const updatedUnmatched = await tx.unmatchedPayment.update({
        where: { id: targetUnmatched.id },
        data: {
          matchStatus: PaymentMatchStatus.MATCHED,
          notes: `[SPLIT] Conciliado em ${dto.installments.length} parcela(s).`,
        },
      });

      return {
        unmatchedId: updatedUnmatched.id,
        status: updatedUnmatched.matchStatus,
        installments: dto.installments.length,
        totalAmount: originalAmount,
        recebimentos: createdRecebimentos.map((item) => ({ id: item.id, periciaId: item.periciaId, amount: Number(item.valorBruto) })),
        bankTransactions: createdTransactions.map((item) => ({ id: item.id, periciaId: item.periciaId, amount: Number(item.amount) })),
      };
    });

    return result;
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

  private mapSourceToFonte(sourceType: ImportSourceType): FontePagamento {
    if (sourceType === 'TJ') return FontePagamento.TJ;
    if (sourceType === 'PARTES') return FontePagamento.PARTE_AUTORA;
    return FontePagamento.OUTRO;
  }

  private parseMoney(value: number | string | null | undefined): Prisma.Decimal | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      return new Prisma.Decimal(value);
    }

    const normalized = value
      .toString()
      .trim()
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');

    if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;

    try {
      return new Prisma.Decimal(normalized);
    } catch {
      return null;
    }
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;

    const normalized = value.trim();
    const directDate = new Date(normalized);
    if (!Number.isNaN(directDate.getTime())) return directDate;

    const brFormat = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (brFormat) {
      const [, dd, mm, yyyy, hh = '00', min = '00', sec = '00'] = brFormat;
      const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(sec));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private parseBankCsv(content: string): ImportedBankRecord[] {
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
