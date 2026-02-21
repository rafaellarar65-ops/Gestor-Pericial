import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePericiasDto) {
    return this.prisma.pericia.create({
      data: {
        ...dto,
        dataNomeacao: dto.dataNomeacao ? new Date(dto.dataNomeacao) : undefined,
      },
    });
  }

  async findAll(query: ListPericiasDto) {
    const where: Prisma.PericiaWhereInput = {
      statusId: query.statusId,
      cidadeId: query.cidadeId,
      tipoPericiaId: query.tipoPericiaId,
      dataNomeacao:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { processoCNJ: { contains: query.search, mode: 'insensitive' } },
            { periciadoNome: { contains: query.search, mode: 'insensitive' } },
            { observacoes: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
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

    return {
      items,
      pagination: { page: query.page, limit: query.limit, total },
    };
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
    const result = await this.prisma.pericia.updateMany({
      where: { id: { in: dto.ids } },
      data: dto.data,
    });

    return { updated: result.count };
  }

  async importCsv(dto: ImportPericiasDto) {
    const created = await this.prisma.$transaction(
      dto.rows.map((row) =>
        this.prisma.pericia.create({
          data: {
            ...row,
            dataNomeacao: row.dataNomeacao ? new Date(row.dataNomeacao) : undefined,
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
    const current = await this.findOne(dto.periciaId);

    const updated = await this.prisma.pericia.update({
      where: { id: dto.periciaId },
      data: { statusId: dto.statusId },
      include: { status: true },
    });

    await this.prisma.logStatus.create({
      data: {
        periciaId: dto.periciaId,
        statusAnterior: current.statusId ?? undefined,
        statusNovo: dto.statusId,
        motivo: dto.motivo,
        metadata: { source: 'pericias.changeStatus' },
        createdBy: actorId,
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
