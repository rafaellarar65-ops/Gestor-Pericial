import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendaTaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchScheduleDto, CreateAgendaEventDto, CreateAgendaTaskDto, UpdateAgendaEventDto } from './dto/agenda.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  createEvent(dto: CreateAgendaEventDto) {
    return this.prisma.agendaEvent.create({
      data: {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
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
    return this.prisma.agendaTask.create({
      data: {
        ...dto,
        status: dto.status ?? AgendaTaskStatus.TODO,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  listTasks() {
    return this.prisma.agendaTask.findMany({ orderBy: { dueAt: 'asc' } });
  }

  async batchScheduling(dto: BatchScheduleDto) {
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.agendaEvent.create({
          data: {
            title: item.title,
            type: item.type,
            periciaId: item.periciaId,
            startAt: new Date(item.startAt),
            endAt: item.endAt ? new Date(item.endAt) : undefined,
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
