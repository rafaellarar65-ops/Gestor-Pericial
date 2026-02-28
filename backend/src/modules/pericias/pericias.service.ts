import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { PericiaStageFilterService } from './pericia-stage-filter.service';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BatchUpdatePericiasDto,
  ChangeStatusPericiaDto,
  CreatePericiasDto,
  ImportPericiasDto,
  ListPericiasDto,
  ListNomeacoesDto,
  UpdatePericiasDto,
} from './dto/pericias.dto';

@Injectable()
export class PericiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly stageFilter: PericiaStageFilterService,
  ) {}

  async dashboard() {
    const [pendingCount, pendingNetSum] = await this.prisma.$transaction([
      this.prisma.unmatchedPayment.count({
        where: { matchStatus: PaymentMatchStatus.UNMATCHED },
      }),
      this.prisma.unmatchedPayment.aggregate({
        where: { matchStatus: PaymentMatchStatus.UNMATCHED },
        _sum: { amount: true },
      }),
    ]);

    const pendingNetValue = pendingNetSum._sum.amount ?? new Prisma.Decimal(0);

    return {
      kpis: [
        {
          key: 'pagamentos_nao_vinculados_pendentes',
          label: 'Pagamentos não vinculados (pendentes)',
          value: String(pendingCount),
        },
        {
          key: 'pagamentos_nao_vinculados_soma_liquida_pendente',
          label: 'Soma líquida pendente (pagamentos não vinculados)',
          value: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(Number(pendingNetValue)),
        },
      ],
      chart: [],
      critical: [],
    };
  }


  // ...demais métodos

  async nomeacoes(query: ListNomeacoesDto) {
    const where = await this.stageFilter.buildWhere('NOMEACOES');

    const [items, total, periciasStatus] = await this.prisma.$transaction([
      this.prisma.pericia.findMany({
        where,
        include: { cidade: true, status: true },
        orderBy: { dataNomeacao: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.pericia.count({ where }),
      this.prisma.pericia.findMany({ where, select: { statusId: true } }),
    ]);

    const statusIds = periciasStatus
      .map((pericia) => pericia.statusId)
      .filter((statusId): statusId is string => Boolean(statusId));

    const statuses = statusIds.length
      ? await this.prisma.status.findMany({
          where: { id: { in: statusIds } },
          select: { id: true, codigo: true, nome: true },
        })
      : [];

    const statusLookup = new Map(
      statuses.map((status) => [
        status.id,
        (status.codigo || status.nome || '').toUpperCase(),
      ]),
    );

    const statusTotals = periciasStatus.reduce<Record<string, number>>(
      (acc, current) => {
        const key = current.statusId
          ? statusLookup.get(current.statusId) ?? ''
          : '';
        if (!key) return acc;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      items: items.map((p) => ({
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome ?? '',
        cidade: p.cidade?.nome ?? '',
        dataNomeacao: p.dataNomeacao?.toISOString(),
        status: p.status?.codigo ?? '',
      })),
      pagination: { page: query.page, limit: query.limit, total },
      statusTotals,
    };
  }

  async filaAgendamentoPorCidade() {
    const where = await this.stageFilter.buildWhere('AGENDAR_DATA');
    const items = await this.prisma.pericia.findMany({
      where,
      include: { cidade: true, status: true },
      orderBy: [{ cidade: { nome: 'asc' } }, { dataNomeacao: 'desc' }],
      take: 500,
    });

    const grouped = items.reduce<
      Record<
        string,
        Array<{
          id: string;
          processoCNJ: string;
          autorNome: string;
          cidade: string;
          status: string;
          dataNomeacao?: string;
        }>
      >
    >((acc, item) => {
      const cidade = item.cidade?.nome ?? 'Sem cidade';
      if (!acc[cidade]) acc[cidade] = [];
      acc[cidade].push({
        id: item.id,
        processoCNJ: item.processoCNJ,
        autorNome: item.autorNome ?? '',
        cidade,
        status: item.status?.codigo ?? '',
        dataNomeacao: item.dataNomeacao?.toISOString(),
      });
      return acc;
    }, {});

    const cities = Object.entries(grouped)
      .map(([cidade, records]) => ({
        cidade,
        total: records.length,
        items: records,
      }))
      .sort((a, b) => b.total - a.total || a.cidade.localeCompare(b.cidade));

    return {
      total: items.length,
      cities,
    };
  }

  // ...demais métodos
}