import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendaTaskStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchScheduleDto, CreateAgendaEventDto, CreateAgendaTaskDto, UpdateAgendaEventDto } from './dto/agenda.dto';

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  createEvent(dto: CreateAgendaEventDto) {
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.agendaEvent.create({
      data: {
        tenantId,
        ...dto,
        startAt: new Date(dto.startAt),
        ...(dto.endAt ? { endAt: new Date(dto.endAt) } : {}),
      },
    });
  }

  listEvents() {
    return this.prisma.agendaEvent.findMany({ orderBy: { startAt: 'asc' } });
  }

  async updateEvent(id: string, dto: UpdateAgendaEventDto) {
    const found = await this.prisma.agendaEvent.findFirst({ where: { id } });
    if (!found) throw new NotFoundException('Evento não encontrado.');

    return this.prisma.agendaEvent.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
  }

  createTask(dto: CreateAgendaTaskDto) {
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.agendaTask.create({
      data: {
        tenantId,
        ...dto,
        status: dto.status ?? AgendaTaskStatus.TODO,
        ...(dto.dueAt ? { dueAt: new Date(dto.dueAt) } : {}),
      },
    });
  }

  listTasks() {
    return this.prisma.agendaTask.findMany({ orderBy: { dueAt: 'asc' } });
  }

  async batchScheduling(dto: BatchScheduleDto) {
    const tenantId = this.context.get('tenantId') as string;
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.agendaEvent.create({
          data: {
            tenantId,
            title: item.title ?? 'Perícia agendada em lote',
            type: item.type ?? 'PERICIA',
            ...(item.periciaId ? { periciaId: item.periciaId } : {}),
            startAt: new Date(item.startAt),
            ...(item.endAt ? { endAt: new Date(item.endAt) } : {}),
          },
        }),
      ),
    );

    await this.prisma.schedulingBatch.create({
      data: {
        tenantId,
        dateRef: new Date(dto.metadata?.date ?? dto.items[0]?.startAt ?? new Date().toISOString()),
        criteriaJson: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        resultJson: ({
          status: 'CONFIRMADO',
          created: created.length,
          items: dto.items.map((item) => ({
            periciaId: item.periciaId,
            scheduledAt: item.startAt,
          })),
        }) as Prisma.InputJsonValue,
      },
    });

    return { created: created.length };
  }

  async listBatchScheduling() {
    const rows = await this.prisma.schedulingBatch.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((row) => {
      const criteria = (row.criteriaJson ?? {}) as Record<string, unknown>;
      const result = (row.resultJson ?? {}) as Record<string, unknown>;
      const items = Array.isArray(result.items) ? result.items : [];

      return {
        id: row.id,
        createdAt: row.createdAt,
        cityNames: Array.isArray(criteria.cityNames) ? (criteria.cityNames as string[]) : [],
        date: typeof criteria.date === 'string' ? criteria.date : '',
        startTime: typeof criteria.startTime === 'string' ? criteria.startTime : '',
        durationMinutes: typeof criteria.durationMinutes === 'number' ? criteria.durationMinutes : 0,
        intervalMinutes: typeof criteria.intervalMinutes === 'number' ? criteria.intervalMinutes : 0,
        location: typeof criteria.location === 'string' ? criteria.location : undefined,
        modalidade: typeof criteria.modalidade === 'string' ? criteria.modalidade : undefined,
        source: criteria.source === 'WORD' ? 'WORD' : 'CSV',
        status: 'CONFIRMADO',
        items: items.map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            periciaId: typeof entry.periciaId === 'string' ? entry.periciaId : '',
            scheduledAt: typeof entry.scheduledAt === 'string' ? entry.scheduledAt : '',
          };
        }),
      };
    });
  }

  calendarSync() {
    return { enabled: false, message: 'Integração Google Calendar será implementada em entrega futura.' };
  }
}
