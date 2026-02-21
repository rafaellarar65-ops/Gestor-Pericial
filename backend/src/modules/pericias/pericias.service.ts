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
    private readonly context: RequestContextService = new RequestContextService(),
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
        ...(dto.periciadoNome ? { periciadoNome: dto.periciadoNome } : {}),
        ...(dto.observacoes ? { observacoes: dto.observacoes } : {}),
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
    return this.prisma.pericia.update({ where: { id }, data: dto });
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
            ...(row.periciadoNome ? { periciadoNome: row.periciadoNome } : {}),
            ...(row.observacoes ? { observacoes: row.observacoes } : {}),
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
    const [total, urgentes, finalizadas, pendentesPagamento] = await this.prisma.$transaction([
      this.prisma.pericia.count(),
      this.prisma.pericia.count({ where: { isUrgent: true } }),
      this.prisma.pericia.count({ where: { finalizada: true } }),
      this.prisma.pericia.count({ where: { pagamentoStatus: 'PENDENTE' } }),
    ]);

    return { total, urgentes, finalizadas, pendentesPagamento };
  }
}
