import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendaTaskStatus } from '@prisma/client';
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
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.agendaEvent.findMany({ where: { tenantId }, orderBy: { startAt: 'asc' } });
  }

  async updateEvent(id: string, dto: UpdateAgendaEventDto) {
    const tenantId = this.context.get('tenantId') as string;
    const found = await this.prisma.agendaEvent.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Evento não encontrado.');

    const updateData = {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    };

    const [, updatedEvent] = await this.prisma.$transaction([
      this.prisma.agendaEvent.updateMany({
        where: { id, tenantId },
        data: updateData,
      }),
      this.prisma.agendaEvent.findFirst({ where: { id, tenantId } }),
    ]);

    if (!updatedEvent) throw new NotFoundException('Evento não encontrado.');

    return updatedEvent;
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
