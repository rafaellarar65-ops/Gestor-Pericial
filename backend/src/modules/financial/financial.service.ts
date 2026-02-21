import { Injectable } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDespesaDto, CreateRecebimentoDto, ImportRecebimentosDto, ReconcileDto } from './dto/financial.dto';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  createRecebimento(dto: CreateRecebimentoDto) {
    return this.prisma.recebimento.create({
      data: {
        periciaId: dto.periciaId,
        fontePagamento: dto.fontePagamento,
        dataRecebimento: new Date(dto.dataRecebimento),
        valorBruto: new Prisma.Decimal(dto.valorBruto),
        valorLiquido: dto.valorLiquido ? new Prisma.Decimal(dto.valorLiquido) : undefined,
        descricao: dto.descricao,
      },
    });
  }

  listRecebimentos() {
    return this.prisma.recebimento.findMany({ orderBy: { dataRecebimento: 'desc' } });
  }

  createDespesa(dto: CreateDespesaDto) {
    return this.prisma.despesa.create({
      data: {
        categoria: dto.categoria,
        descricao: dto.descricao,
        valor: new Prisma.Decimal(dto.valor),
        dataCompetencia: new Date(dto.dataCompetencia),
        periciaId: dto.periciaId,
      },
    });
  }

  listDespesas() {
    return this.prisma.despesa.findMany({ orderBy: { dataCompetencia: 'desc' } });
  }

  async importBatch(dto: ImportRecebimentosDto) {
    const batch = await this.prisma.importBatch.create({
      data: {
        sourceFileName: dto.sourceFileName,
        totalRecords: dto.rows.length,
        status: 'PROCESSING',
      },
    });

    await this.prisma.$transaction(
      dto.rows.map((row) =>
        this.prisma.recebimento.create({
          data: {
            importBatchId: batch.id,
            periciaId: row.periciaId,
            fontePagamento: row.fontePagamento,
            dataRecebimento: new Date(row.dataRecebimento),
            valorBruto: new Prisma.Decimal(row.valorBruto),
            valorLiquido: row.valorLiquido ? new Prisma.Decimal(row.valorLiquido) : undefined,
            descricao: row.descricao,
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
    return this.prisma.unmatchedPayment.findMany({
      where: { matchStatus: PaymentMatchStatus.UNMATCHED },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reconcile(dto: ReconcileDto) {
    const result = await this.prisma.unmatchedPayment.updateMany({
      where: { id: { in: dto.unmatchedIds } },
      data: { matchStatus: PaymentMatchStatus.MATCHED, notes: dto.note },
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
      totals: {
        recebido: totalRecebido,
        despesas: totalDespesas,
        resultado: totalRecebido - totalDespesas,
      },
      agingBuckets: {
        atrasados,
      },
      financialScore: totalRecebido > 0 ? Math.max(0, Math.min(100, Math.round(((totalRecebido - totalDespesas) / totalRecebido) * 100))) : 0,
    };
  }

  chargeAutomation() {
    return { enqueued: true, queue: 'charge-dispatch', message: 'Cobranças automáticas enfileiradas.' };
  }
}
