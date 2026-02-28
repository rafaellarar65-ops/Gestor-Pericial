import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BatchUpdatePericiasDto,
  ChangeStatusPericiaDto,
  CreatePericiasDto,
  ImportPericiasDto,
  ListPericiasDto,
  UpdatePericiasDto,
} from './dto/pericias.dto';

@Injectable()
export class PericiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  create(dto: CreatePericiasDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.pericia.create({
      data: {
        tenantId,
        processoCNJ: dto.processoCNJ,
        ...(dto.cidadeId ? { cidadeId: dto.cidadeId } : {}),
        ...(dto.varaId ? { varaId: dto.varaId } : {}),
        ...(dto.tipoPericiaId ? { tipoPericiaId: dto.tipoPericiaId } : {}),
        ...(dto.modalidadeId ? { modalidadeId: dto.modalidadeId } : {}),
        ...(dto.statusId ? { statusId: dto.statusId } : {}),
        ...(dto.localId ? { localId: dto.localId } : {}),
        ...(dto.juizNome ? { juizNome: dto.juizNome } : {}),
        ...(dto.autorNome ? { autorNome: dto.autorNome } : {}),
        ...(dto.reuNome ? { reuNome: dto.reuNome } : {}),
        ...(dto.periciadoNome ? { periciadoNome: dto.periciadoNome } : {}),
        ...(dto.observacoes ? { observacoes: dto.observacoes } : {}),
        ...(dto.honorariosPrevistosJG !== undefined ? { honorariosPrevistosJG: dto.honorariosPrevistosJG } : {}),
        ...(dto.honorariosPrevistosPartes !== undefined ? { honorariosPrevistosPartes: dto.honorariosPrevistosPartes } : {}),
        ...(dto.pagamentoStatus ? { pagamentoStatus: dto.pagamentoStatus } : {}),
        ...(dto.dataNomeacao ? { dataNomeacao: new Date(dto.dataNomeacao) } : {}),
      },
    });
  }

  async findAll(query: ListPericiasDto) {
    const where: Prisma.PericiaWhereInput = {
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.cidadeId ? { cidadeId: query.cidadeId } : {}),
      ...(query.tipoPericiaId ? { tipoPericiaId: query.tipoPericiaId } : {}),
      ...(query.dateFrom || query.dateTo
        ? { dataNomeacao: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { processoCNJ: { contains: query.search, mode: 'insensitive' } },
              { periciadoNome: { contains: query.search, mode: 'insensitive' } },
              { observacoes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pericia.findMany({
        where,
        include: { cidade: true, tipoPericia: true, status: true, modalidade: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.pericia.count({ where }),
    ]);

    return { items, pagination: { page: query.page, limit: query.limit, total } };
  }

  async findOne(id: string) {
    const record = await this.prisma.pericia.findFirst({
      where: { id },
      include: { cidade: true, vara: true, tipoPericia: true, modalidade: true, status: true, local: true },
    });

    if (!record) throw new NotFoundException('Perícia não encontrada.');
    return record;
  }

  async update(id: string, dto: UpdatePericiasDto) {
    await this.findOne(id);

    return this.prisma.pericia.update({
      where: { id },
      data: {
        ...(dto.juizNome !== undefined ? { juizNome: dto.juizNome } : {}),
        ...(dto.autorNome !== undefined ? { autorNome: dto.autorNome } : {}),
        ...(dto.reuNome !== undefined ? { reuNome: dto.reuNome } : {}),
        ...(dto.periciadoNome !== undefined ? { periciadoNome: dto.periciadoNome } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        ...(dto.honorariosPrevistosJG !== undefined ? { honorariosPrevistosJG: dto.honorariosPrevistosJG } : {}),
        ...(dto.honorariosPrevistosPartes !== undefined ? { honorariosPrevistosPartes: dto.honorariosPrevistosPartes } : {}),
        ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
        ...(dto.isUrgent !== undefined ? { isUrgent: dto.isUrgent } : {}),
        ...(dto.dataNomeacao !== undefined ? { dataNomeacao: new Date(dto.dataNomeacao) } : {}),
        ...(dto.dataAgendamento !== undefined ? { dataAgendamento: new Date(dto.dataAgendamento) } : {}),
        ...(dto.dataRealizacao !== undefined ? { dataRealizacao: new Date(dto.dataRealizacao) } : {}),
        ...(dto.dataEnvioLaudo !== undefined ? { dataEnvioLaudo: new Date(dto.dataEnvioLaudo) } : {}),
      },
    });
  }

  async batchUpdate(dto: BatchUpdatePericiasDto) {
    const result = await this.prisma.pericia.updateMany({ where: { id: { in: dto.ids } }, data: dto.data });
    return { updated: result.count };
  }

  async importCsv(dto: ImportPericiasDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const created = await this.prisma.$transaction(
      dto.rows.map((row) =>
        this.prisma.pericia.create({
          data: {
            tenantId,
            processoCNJ: row.processoCNJ,
            ...(row.cidadeId ? { cidadeId: row.cidadeId } : {}),
            ...(row.varaId ? { varaId: row.varaId } : {}),
            ...(row.tipoPericiaId ? { tipoPericiaId: row.tipoPericiaId } : {}),
            ...(row.modalidadeId ? { modalidadeId: row.modalidadeId } : {}),
            ...(row.statusId ? { statusId: row.statusId } : {}),
            ...(row.localId ? { localId: row.localId } : {}),
            ...(row.juizNome ? { juizNome: row.juizNome } : {}),
            ...(row.autorNome ? { autorNome: row.autorNome } : {}),
            ...(row.reuNome ? { reuNome: row.reuNome } : {}),
            ...(row.periciadoNome ? { periciadoNome: row.periciadoNome } : {}),
            ...(row.observacoes ? { observacoes: row.observacoes } : {}),
            ...(row.honorariosPrevistosJG !== undefined ? { honorariosPrevistosJG: row.honorariosPrevistosJG } : {}),
            ...(row.honorariosPrevistosPartes !== undefined ? { honorariosPrevistosPartes: row.honorariosPrevistosPartes } : {}),
            ...(row.pagamentoStatus ? { pagamentoStatus: row.pagamentoStatus } : {}),
            ...(row.dataNomeacao ? { dataNomeacao: new Date(row.dataNomeacao) } : {}),
            origemImportacao: 'CSV',
          },
        }),
      ),
    );

    return { imported: created.length };
  }

  async export(query: ListPericiasDto) {
    const data = await this.findAll({ ...query, page: 1, limit: 1000 });
    return { exportedAt: new Date().toISOString(), total: data.pagination.total, rows: data.items };
  }

  async changeStatus(dto: ChangeStatusPericiaDto, actorId?: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const current = await this.findOne(dto.periciaId);

    const updated = await this.prisma.pericia.update({ where: { id: dto.periciaId }, data: { statusId: dto.statusId }, include: { status: true } });

    await this.prisma.logStatus.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        ...(current.statusId ? { statusAnterior: current.statusId } : {}),
        statusNovo: dto.statusId,
        ...(dto.motivo ? { motivo: dto.motivo } : {}),
        metadata: { source: 'pericias.changeStatus' },
        ...(actorId ? { createdBy: actorId } : {}),
      },
    });

    return updated;
  }

  async dashboard() {
    // Buscar status relevantes para categorizar
    const [avaliarStatuses, enviarLaudoStatuses] = await this.prisma.$transaction([
      this.prisma.status.findMany({
        where: {
          OR: [
            { codigo: { in: ['AVALIAR', 'ST_AVALIAR', 'NOMEADA', 'ACEITA', 'NOVA_NOMEACAO'] } },
            { nome: { contains: 'avaliar', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
      this.prisma.status.findMany({
        where: {
          OR: [
            { codigo: { in: ['ENVIAR_LAUDO', 'EM_LAUDO'] } },
            { nome: { contains: 'enviar laudo', mode: 'insensitive' } },
            { nome: { contains: 'em laudo', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
    ]);

    const avaliarStatusIds = avaliarStatuses.map((status) => status.id);
    const enviarLaudoStatusIds = enviarLaudoStatuses.map((status) => status.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Contagem para cada KPI
    const [
      total,
      novasNomeacoes,
      agendarData,
      proximasPericias,
      enviarLaudos,
      esclarecimentos,
      aReceber,
      criticalPericias,
    ] = await this.prisma.$transaction([
      this.prisma.pericia.count(),
      // NOVAS NOMEAÇÕES: não agendada, não finalizada (ou status de avaliação)
      this.prisma.pericia.count({
        where: {
          OR: [
            { agendada: false, finalizada: false },
            ...(avaliarStatusIds.length > 0 ? [{ statusId: { in: avaliarStatusIds } }] : []),
          ],
        },
      }),
      // AGENDAR DATA: perícias sem data de agendamento, não finalizadas
      this.prisma.pericia.count({
        where: { dataAgendamento: null, finalizada: false, laudoEnviado: false },
      }),
      // PRÓXIMAS PERÍCIAS: agendadas para os próximos 7 dias
      this.prisma.pericia.count({
        where: { dataAgendamento: { gte: today, lte: nextWeek }, finalizada: false },
      }),
      // ENVIAR LAUDOS: agendadas, não enviou laudo, não finalizada
      this.prisma.pericia.count({
        where: {
          OR: [
            { agendada: true, laudoEnviado: false, finalizada: false },
            ...(enviarLaudoStatusIds.length > 0 ? [{ statusId: { in: enviarLaudoStatusIds } }] : []),
          ],
        },
      }),
      // ESCLARECIMENTOS: tem extraObservation preenchido
      this.prisma.pericia.count({
        where: { extraObservation: { not: null }, finalizada: false },
      }),
      // A RECEBER: pagamento pendente e laudo enviado
      this.prisma.pericia.count({
        where: { pagamentoStatus: 'PENDENTE', laudoEnviado: true },
      }),
      // Critical: urgentes ou com ausência informada
      this.prisma.pericia.findMany({
        where: { isUrgent: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { cidade: true, status: true },
      }),
    ]);

    return {
      kpis: [
        { key: 'novas_nomeacoes', label: 'Novas Nomeações', value: String(novasNomeacoes) },
        { key: 'agendar_data', label: 'Agendar Data', value: String(agendarData) },
        { key: 'proximas_pericias', label: 'Próximas Perícias', value: String(proximasPericias) },
        { key: 'enviar_laudos', label: 'Enviar Laudos', value: String(enviarLaudos) },
        { key: 'esclarecimentos', label: 'Esclarecimentos', value: String(esclarecimentos) },
        { key: 'a_receber', label: 'A Receber', value: String(aReceber) },
        { key: 'total', label: 'Total de Perícias', value: String(total) },
      ],
      chart: [
        { name: 'Nomeações', value: novasNomeacoes },
        { name: 'Agendar', value: agendarData },
        { name: 'Próximas', value: proximasPericias },
        { name: 'Laudos', value: enviarLaudos },
        { name: 'Esclarec.', value: esclarecimentos },
        { name: 'A Receber', value: aReceber },
      ],
      critical: criticalPericias.map((p) => ({
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome ?? '',
        cidade: p.cidade?.nome ?? '',
        dataAgendamento: p.dataAgendamento?.toISOString(),
        status: (p.status?.codigo ?? 'NOVA_NOMEACAO') as string,
      })),
    };
  }

  async pericias_hoje() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const items = await this.prisma.pericia.findMany({
      where: { dataAgendamento: { gte: start, lte: end } },
      include: { cidade: true, status: true },
      orderBy: { dataAgendamento: 'asc' },
    });

    return {
      items: items.map((p) => ({
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome ?? '',
        cidade: p.cidade?.nome ?? '',
        dataAgendamento: p.dataAgendamento?.toISOString(),
        status: p.status?.codigo ?? '',
      })),
    };
  }

  async nomeacoes() {
    const items = await this.prisma.pericia.findMany({
      where: { agendada: false, finalizada: false },
      include: { cidade: true, status: true },
      orderBy: { dataNomeacao: 'desc' },
      take: 50,
    });

    return {
      items: items.map((p) => ({
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome ?? '',
        cidade: p.cidade?.nome ?? '',
        dataNomeacao: p.dataNomeacao?.toISOString(),
        status: p.status?.codigo ?? '',
      })),
    };
  }

  async laudosPendentes() {
    const items = await this.prisma.pericia.findMany({
      where: { agendada: true, laudoEnviado: false, finalizada: false },
      include: { cidade: true, status: true },
      orderBy: { dataAgendamento: 'asc' },
      take: 50,
    });

    return {
      items: items.map((p) => ({
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome ?? '',
        cidade: p.cidade?.nome ?? '',
        dataAgendamento: p.dataAgendamento?.toISOString(),
        status: p.status?.codigo ?? '',
      })),
    };
  }

  async timeline(id: string) {
    const pericia = await this.findOne(id);

    const logs = await this.prisma.logStatus.findMany({
      where: { periciaId: id },
      orderBy: { createdAt: 'desc' },
    });

    const statusIds = Array.from(
      new Set(
        logs
          .flatMap((log) => [log.statusAnterior, log.statusNovo])
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const statusMap = new Map<string, string>();
    if (statusIds.length) {
      const statuses = await this.prisma.status.findMany({ where: { id: { in: statusIds } } });
      statuses.forEach((status) => statusMap.set(status.id, status.nome));
    }

    const marcos = [
      { label: 'Data de Nomeação', date: pericia.dataNomeacao },
      { label: 'Data de Agendamento', date: pericia.dataAgendamento },
      { label: 'Data de Realização', date: pericia.dataRealizacao },
      { label: 'Data de Envio do Laudo', date: pericia.dataEnvioLaudo },
    ]
      .filter((item) => Boolean(item.date))
      .map((item) => ({
        type: 'MARCO',
        event: item.label,
        description: item.label,
        date: item.date?.toISOString(),
      }));

    const movimentacoes = logs.map((log) => ({
      type: 'STATUS',
      event: `Status alterado para ${statusMap.get(log.statusNovo) ?? log.statusNovo}`,
      description: log.motivo ?? null,
      fromStatus: log.statusAnterior ? statusMap.get(log.statusAnterior) ?? log.statusAnterior : null,
      toStatus: statusMap.get(log.statusNovo) ?? log.statusNovo,
      date: log.createdAt.toISOString(),
    }));

    return {
      periciaId: id,
      items: [...marcos, ...movimentacoes].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }),
    };
  }

  async cityOverview(cidadeId: string) {
    const cidade = await this.prisma.cidade.findFirst({ where: { id: cidadeId } });
    if (!cidade) throw new NotFoundException('Cidade não encontrada.');

    const pericias = await this.prisma.pericia.findMany({
      where: { cidadeId },
      select: {
        processoCNJ: true,
        agendada: true,
        laudoEnviado: true,
        finalizada: true,
        extraObservation: true,
        pagamentoStatus: true,
        isUrgent: true,
        honorariosPrevistosJG: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const recebimentos = await this.prisma.recebimento.findMany({
      where: { pericia: { cidadeId } },
      select: { valorLiquido: true, valorBruto: true },
    });

    const totalRecebido = recebimentos.reduce(
      (acc, current) => acc + Number(current.valorLiquido ?? current.valorBruto ?? 0),
      0,
    );

    return this.buildCityOverview(cidade, pericias, totalRecebido);
  }

  async cityOverviewList() {
    const cidades = await this.prisma.cidade.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, uf: true },
    });

    if (cidades.length === 0) return { items: [] };

    const cidadeIds = cidades.map((cidade) => cidade.id);

    const pericias = await this.prisma.pericia.findMany({
      where: { cidadeId: { in: cidadeIds } },
      select: {
        id: true,
        cidadeId: true,
        processoCNJ: true,
        agendada: true,
        laudoEnviado: true,
        finalizada: true,
        extraObservation: true,
        pagamentoStatus: true,
        isUrgent: true,
        honorariosPrevistosJG: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const recebimentos = await this.prisma.recebimento.findMany({
      where: { pericia: { cidadeId: { in: cidadeIds } } },
      select: { periciaId: true, valorLiquido: true, valorBruto: true },
    });

    const periciasByCidade = new Map<string, typeof pericias>();
    pericias.forEach((pericia) => {
      if (!pericia.cidadeId) return;
      const current = periciasByCidade.get(pericia.cidadeId) ?? [];
      current.push(pericia);
      periciasByCidade.set(pericia.cidadeId, current);
    });

    const cidadeByPericiaId = new Map<string, string>();
    pericias.forEach((item) => {
      if (item.cidadeId) cidadeByPericiaId.set(item.id, item.cidadeId);
    });

    const recebidosByCidade = new Map<string, number>();
    recebimentos.forEach((recebimento) => {
      const cidadeId = cidadeByPericiaId.get(recebimento.periciaId);
      if (!cidadeId) return;
      const current = recebidosByCidade.get(cidadeId) ?? 0;
      const valor = Number(recebimento.valorLiquido ?? recebimento.valorBruto ?? 0);
      recebidosByCidade.set(cidadeId, current + valor);
    });

    return {
      items: cidades.map((cidade) =>
        this.buildCityOverview(
          cidade,
          periciasByCidade.get(cidade.id) ?? [],
          recebidosByCidade.get(cidade.id) ?? 0,
        ),
      ),
    };
  }

  private buildCityOverview(
    cidade: { id: string; nome: string; uf: string | null },
    pericias: Array<{
      id?: string;
      cidadeId?: string | null;
      processoCNJ: string;
      agendada: boolean;
      laudoEnviado: boolean;
      finalizada: boolean;
      extraObservation: string | null;
      pagamentoStatus: string;
      isUrgent: boolean;
      honorariosPrevistosJG: Prisma.Decimal | null;
    }>,
    totalRecebido: number,
  ) {
    const grouped = {
      avaliar: pericias.filter((p) => !p.agendada && !p.finalizada),
      agendar: pericias.filter((p) => p.agendada && !p.laudoEnviado),
      laudos: pericias.filter((p) => p.agendada && !p.laudoEnviado && !p.finalizada),
      esclarecimentos: pericias.filter((p) => Boolean(p.extraObservation)),
      pagamento: pericias.filter((p) => p.pagamentoStatus === 'PENDENTE'),
      criticos: pericias.filter((p) => p.pagamentoStatus === 'ATRASADO' || p.isUrgent),
      finalizada: pericias.filter((p) => p.finalizada),
    };

    const toCnj = (items: typeof pericias) => items.slice(0, 20).map((item) => item.processoCNJ);

    return {
      cidade: { id: cidade.id, nome: cidade.nome, uf: cidade.uf },
      metrics: {
        score: pericias.length ? Math.round((grouped.finalizada.length / pericias.length) * 100) : 0,
        totalPericias: pericias.length,
        aReceberTotal: pericias.reduce((acc, item) => acc + Number(item.honorariosPrevistosJG ?? 0), 0),
        atrasoCritico: grouped.criticos.length,
      },
      buckets: {
        avaliar: { total: grouped.avaliar.length, cnjs: toCnj(grouped.avaliar) },
        agendar: { total: grouped.agendar.length, cnjs: toCnj(grouped.agendar) },
        laudos: { total: grouped.laudos.length, cnjs: toCnj(grouped.laudos) },
        esclarecimentos: { total: grouped.esclarecimentos.length, cnjs: toCnj(grouped.esclarecimentos) },
        pagamento: { total: grouped.pagamento.length, cnjs: toCnj(grouped.pagamento), recebido: totalRecebido },
        criticos: { total: grouped.criticos.length, cnjs: toCnj(grouped.criticos) },
        finalizada: { total: grouped.finalizada.length },
      },
    };
  }

}
