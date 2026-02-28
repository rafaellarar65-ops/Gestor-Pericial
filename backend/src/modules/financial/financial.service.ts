import { Injectable } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDespesaDto, CreateRecebimentoDto, FinancialImportSource, ImportRecebimentoItemDto, ImportRecebimentosDto, ReconcileDto } from './dto/financial.dto';

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

  private normalizeCnj(cnj: string): string {
    return cnj.replace(/\D/g, '');
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
