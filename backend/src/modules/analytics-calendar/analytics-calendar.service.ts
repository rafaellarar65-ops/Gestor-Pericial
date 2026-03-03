import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsCalendarLayer, AnalyticsCalendarQueryDto } from './dto/analytics-calendar.dto';

type KpiItem = {
  key: string;
  label: string;
  value: number;
};

type TimelineItem = {
  type: string;
  cnjId: string;
  city: string;
  timestamp: string;
  value: number | null;
  deadline: string | null;
  status: string | null;
};

@Injectable()
export class AnalyticsCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async overview(query: AnalyticsCalendarQueryDto) {
    const tenantId = (this.context.get('tenantId') as string) ?? '';
    const layer: AnalyticsCalendarLayer = query.layer ?? 'OPERACIONAL';
    const from = query.from ? this.startOfDay(query.from) : this.monthStart(new Date());
    const to = query.to ? this.endOfDay(query.to) : this.monthEnd(new Date());

    const [kpis, timeline, heatmap] = await Promise.all([
      this.buildKpis(tenantId, layer, from, to),
      this.buildTimeline(tenantId, from, to, query.timelineLimit ?? 200),
      this.buildFinancialHeatmap(tenantId, from, to),
    ]);

    return {
      layer,
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis,
      timeline,
      heatmap,
    };
  }

  private async buildKpis(tenantId: string, layer: AnalyticsCalendarLayer, from: Date, to: Date): Promise<KpiItem[]> {
    if (layer === 'OPERACIONAL') {
      const [nomeacoes, agendadas, pendentesAgendamento] = await this.prisma.$transaction([
        this.prisma.pericia.count({ where: { tenantId, dataNomeacao: { gte: from, lte: to } } }),
        this.prisma.pericia.count({ where: { tenantId, dataAgendamento: { gte: from, lte: to } } }),
        this.prisma.pericia.count({ where: { tenantId, dataAgendamento: null, finalizada: false } }),
      ]);

      return [
        { key: 'nomeacoes', label: 'Nomeações no período', value: nomeacoes },
        { key: 'agendadas', label: 'Perícias agendadas', value: agendadas },
        { key: 'pendentes_agendamento', label: 'Pendentes de agendamento', value: pendentesAgendamento },
      ];
    }

    if (layer === 'PRODUCAO') {
      const [realizadas, finalizadas, pendentesExecucao] = await this.prisma.$transaction([
        this.prisma.pericia.count({ where: { tenantId, dataRealizacao: { gte: from, lte: to } } }),
        this.prisma.pericia.count({ where: { tenantId, finalizada: true, updatedAt: { gte: from, lte: to } } }),
        this.prisma.pericia.count({ where: { tenantId, dataAgendamento: { not: null }, dataRealizacao: null } }),
      ]);

      return [
        { key: 'realizadas', label: 'Perícias realizadas', value: realizadas },
        { key: 'finalizadas', label: 'Perícias finalizadas', value: finalizadas },
        { key: 'pendentes_execucao', label: 'Pendentes de execução', value: pendentesExecucao },
      ];
    }

    if (layer === 'LAUDOS') {
      const laudosEnviados = await this.prisma.pericia.findMany({
        where: { tenantId, dataEnvioLaudo: { gte: from, lte: to } },
        select: { dataRealizacao: true, dataEnvioLaudo: true },
      });
      const aguardandoLaudo = await this.prisma.pericia.count({
        where: { tenantId, dataRealizacao: { not: null }, dataEnvioLaudo: null, finalizada: false },
      });

      const tempoMedioDias = this.averageLeadTimeDays(laudosEnviados);

      return [
        { key: 'laudos_enviados', label: 'Laudos enviados no período', value: laudosEnviados.length },
        { key: 'aguardando_laudo', label: 'Aguardando emissão de laudo', value: aguardandoLaudo },
        { key: 'tempo_medio_laudo', label: 'Tempo médio (dias) para envio', value: tempoMedioDias },
      ];
    }

    if (layer === 'ESCLARECIMENTOS') {
      const [totalComEsclarecimento, realizadosComEsclarecimento, pendentesComEsclarecimento] = await this.prisma.$transaction([
        this.prisma.pericia.count({
          where: {
            tenantId,
            esclarecimentos: { not: Prisma.JsonNull },
          },
        }),
        this.prisma.pericia.count({
          where: {
            tenantId,
            esclarecimentos: { not: Prisma.JsonNull },
            dataRealizacao: { gte: from, lte: to },
          },
        }),
        this.prisma.pericia.count({
          where: {
            tenantId,
            esclarecimentos: { not: Prisma.JsonNull },
            finalizada: false,
          },
        }),
      ]);

      return [
        { key: 'total_com_esclarecimento', label: 'Processos com esclarecimentos', value: totalComEsclarecimento },
        { key: 'movimento_periodo', label: 'Movimento no período', value: realizadosComEsclarecimento },
        { key: 'pendentes', label: 'Pendentes de encerramento', value: pendentesComEsclarecimento },
      ];
    }

    const recebimentos = await this.prisma.recebimento.findMany({
      where: { tenantId, dataRecebimento: { gte: from, lte: to } },
      select: { valorBruto: true, valorLiquido: true },
    });

    const producao = await this.prisma.pericia.findMany({
      where: { tenantId, dataEnvioLaudo: { gte: from, lte: to } },
      select: { honorariosPrevistosJG: true },
    });

    const valorRecebido = recebimentos.reduce((acc, item) => acc + Number(item.valorLiquido ?? item.valorBruto ?? 0), 0);
    const valorProduzido = producao.reduce((acc, item) => acc + Number(item.honorariosPrevistosJG ?? 0), 0);
    const ticketMedio = recebimentos.length > 0 ? Number((valorRecebido / recebimentos.length).toFixed(2)) : 0;

    return [
      { key: 'valor_produzido', label: 'Valor produzido (laudos)', value: Number(valorProduzido.toFixed(2)) },
      { key: 'valor_recebido', label: 'Valor recebido', value: Number(valorRecebido.toFixed(2)) },
      { key: 'ticket_medio', label: 'Ticket médio recebimentos', value: ticketMedio },
    ];
  }

  private async buildTimeline(tenantId: string, from: Date, to: Date, limit: number): Promise<TimelineItem[]> {
    const [pericias, recebimentos] = await this.prisma.$transaction([
      this.prisma.pericia.findMany({
        where: {
          tenantId,
          OR: [
            { dataNomeacao: { gte: from, lte: to } },
            { dataAgendamento: { gte: from, lte: to } },
            { dataRealizacao: { gte: from, lte: to } },
            { dataEnvioLaudo: { gte: from, lte: to } },
          ],
        },
        select: {
          processoCNJ: true,
          cidade: { select: { nome: true } },
          honorariosPrevistosJG: true,
          pagamentoStatus: true,
          dataNomeacao: true,
          dataAgendamento: true,
          dataRealizacao: true,
          dataEnvioLaudo: true,
        },
      }),
      this.prisma.recebimento.findMany({
        where: { tenantId, dataRecebimento: { gte: from, lte: to } },
        select: {
          dataRecebimento: true,
          valorLiquido: true,
          valorBruto: true,
          pericia: { select: { processoCNJ: true, cidade: { select: { nome: true } }, pagamentoStatus: true } },
        },
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const pericia of pericias) {
      const base = {
        cnjId: pericia.processoCNJ,
        city: pericia.cidade?.nome ?? 'Sem cidade',
        value: pericia.honorariosPrevistosJG ? Number(pericia.honorariosPrevistosJG) : null,
        status: pericia.pagamentoStatus,
      };

      if (pericia.dataNomeacao) {
        items.push({
          type: 'NOMEACAO',
          ...base,
          timestamp: pericia.dataNomeacao.toISOString(),
          deadline: pericia.dataAgendamento?.toISOString() ?? null,
        });
      }
      if (pericia.dataAgendamento) {
        items.push({
          type: 'AGENDAMENTO',
          ...base,
          timestamp: pericia.dataAgendamento.toISOString(),
          deadline: pericia.dataRealizacao?.toISOString() ?? null,
        });
      }
      if (pericia.dataRealizacao) {
        items.push({
          type: 'REALIZACAO',
          ...base,
          timestamp: pericia.dataRealizacao.toISOString(),
          deadline: pericia.dataEnvioLaudo?.toISOString() ?? null,
        });
      }
      if (pericia.dataEnvioLaudo) {
        items.push({
          type: 'LAUDO_ENVIADO',
          ...base,
          timestamp: pericia.dataEnvioLaudo.toISOString(),
          deadline: null,
        });
      }
    }

    for (const recebimento of recebimentos) {
      items.push({
        type: 'RECEBIMENTO',
        cnjId: recebimento.pericia.processoCNJ,
        city: recebimento.pericia.cidade?.nome ?? 'Sem cidade',
        timestamp: recebimento.dataRecebimento.toISOString(),
        value: Number(recebimento.valorLiquido ?? recebimento.valorBruto ?? 0),
        deadline: null,
        status: recebimento.pericia.pagamentoStatus,
      });
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private async buildFinancialHeatmap(tenantId: string, from: Date, to: Date) {
    const [recebimentos, producao] = await this.prisma.$transaction([
      this.prisma.recebimento.findMany({
        where: { tenantId, dataRecebimento: { gte: from, lte: to } },
        select: { dataRecebimento: true, valorLiquido: true, valorBruto: true },
      }),
      this.prisma.pericia.findMany({
        where: { tenantId, dataEnvioLaudo: { gte: from, lte: to } },
        select: { dataEnvioLaudo: true, honorariosPrevistosJG: true },
      }),
    ]);

    const byDay = new Map<string, { receivedValue: number; productionValue: number; totalEvents: number }>();

    for (const item of recebimentos) {
      const key = this.dayKey(item.dataRecebimento);
      const current = byDay.get(key) ?? { receivedValue: 0, productionValue: 0, totalEvents: 0 };
      current.receivedValue += Number(item.valorLiquido ?? item.valorBruto ?? 0);
      current.totalEvents += 1;
      byDay.set(key, current);
    }

    for (const item of producao) {
      if (!item.dataEnvioLaudo) continue;
      const key = this.dayKey(item.dataEnvioLaudo);
      const current = byDay.get(key) ?? { receivedValue: 0, productionValue: 0, totalEvents: 0 };
      current.productionValue += Number(item.honorariosPrevistosJG ?? 0);
      current.totalEvents += 1;
      byDay.set(key, current);
    }

    const keys = [...byDay.keys()];
    const maxValue = Math.max(
      1,
      ...keys.map((key) => {
        const day = byDay.get(key)!;
        return day.productionValue + day.receivedValue;
      }),
    );

    return this.eachDay(from, to).map((date) => {
      const key = this.dayKey(date);
      const day = byDay.get(key) ?? { receivedValue: 0, productionValue: 0, totalEvents: 0 };
      const totalValue = day.productionValue + day.receivedValue;
      return {
        date: key,
        ...day,
        intensity: Number((totalValue / maxValue).toFixed(4)),
      };
    });
  }

  private averageLeadTimeDays(rows: Array<{ dataRealizacao: Date | null; dataEnvioLaudo: Date | null }>) {
    const durations = rows
      .filter((item) => item.dataRealizacao && item.dataEnvioLaudo)
      .map((item) => {
        const start = item.dataRealizacao!.getTime();
        const end = item.dataEnvioLaudo!.getTime();
        return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      });

    if (!durations.length) return 0;
    return Math.round(durations.reduce((acc, value) => acc + value, 0) / durations.length);
  }

  private eachDay(from: Date, to: Date) {
    const current = new Date(from);
    const output: Date[] = [];
    while (current <= to) {
      output.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return output;
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private monthStart(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  private monthEnd(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }

  private startOfDay(value: string) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  }
}
