import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendaEventStatus, AgendaTaskStatus } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchScheduleDto, CreateAgendaEventDto, CreateAgendaTaskDto, UpdateAgendaEventDto } from './dto/agenda.dto';

type StatusHistoryEntry = {
  from: AgendaEventStatus;
  to: AgendaEventStatus;
  changedAt: string;
  changedBy?: string;
  reason?: string;
};

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
        status: dto.status ?? AgendaEventStatus.AGENDADA,
        startAt: new Date(dto.startAt),
        ...(dto.endAt ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.externalLastModifiedAt ? { externalLastModifiedAt: new Date(dto.externalLastModifiedAt) } : {}),
      },
    });
  }

  listEvents() {
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.agendaEvent.findMany({ where: { tenantId }, orderBy: { startAt: 'asc' } });
  }

  async updateEvent(id: string, dto: UpdateAgendaEventDto) {
    const tenantId = this.context.get('tenantId') as string;
    const found = await this.prisma.agendaEvent.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Evento não encontrado.');

    const statusHistory = (found.statusHistory as StatusHistoryEntry[] | null) ?? [];
    const shouldAppendStatusHistory = dto.status && dto.status !== found.status;
    const { statusChangeReason, startAt, endAt, externalLastModifiedAt, ...rest } = dto;

    return this.prisma.agendaEvent.update({
      where: { id },
      data: {
        ...rest,
        statusHistory: shouldAppendStatusHistory
          ? [
              ...statusHistory,
              {
                from: found.status,
                to: dto.status,
                changedAt: new Date().toISOString(),
                reason: statusChangeReason,
                changedBy: (this.context.get('userId') as string | undefined) ?? undefined,
              },
            ]
          : undefined,
        startAt: startAt ? new Date(startAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
        externalLastModifiedAt: externalLastModifiedAt ? new Date(externalLastModifiedAt) : undefined,
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
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.agendaTask.findMany({ where: { tenantId }, orderBy: { dueAt: 'asc' } });
  }

  async batchScheduling(dto: BatchScheduleDto) {
    const tenantId = this.context.get('tenantId') as string;
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.agendaEvent.create({
          data: {
            tenantId,
            title: item.title,
            type: item.type,
            status: item.status ?? AgendaEventStatus.AGENDADA,
            source: item.source,
            aiSuggested: item.aiSuggested,
            cnjId: item.cnjId,
            cityId: item.cityId,
            city: item.city,
            syncStatus: item.syncStatus,
            externalProvider: item.externalProvider,
            externalEventId: item.externalEventId,
            externalEtag: item.externalEtag,
            ...(item.externalLastModifiedAt
              ? { externalLastModifiedAt: new Date(item.externalLastModifiedAt) }
              : {}),
            ...(item.periciaId ? { periciaId: item.periciaId } : {}),
            startAt: new Date(item.startAt),
            ...(item.endAt ? { endAt: new Date(item.endAt) } : {}),
          },
        }),
      ),
    );

    return { created: created.length };
  }

  calendarSync() {
    return { enabled: false, message: 'Integração Google Calendar será implementada em entrega futura.' };
  }
}
