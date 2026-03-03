import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgendaEventStatus, AgendaEventType, AgendaTaskStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AiSuggestLaudoBlocksDto,
  BatchScheduleDto,
  CreateAgendaEventDto,
  CreateAgendaTaskDto,
  ExportBatchPdfDto,
  ExportWeeklyPdfDto,
  SuggestBatchSchedulingDto,
  UpdateAgendaEventDto,
} from './dto/agenda.dto';

type WeeklyDaySummary = {
  date: string;
  allocated_minutes: number;
  work_window_minutes: number;
  utilization: number;
  conflicts: number;
};

type StatusHistoryEntry = {
  from: AgendaEventStatus;
  to: AgendaEventStatus;
  changedAt: string;
  changedBy?: string;
  reason?: string;
};

type BatchValidationReason = 'PAST_DATE' | 'INVALID_DATETIME' | 'EXISTING_OVERLAP' | 'INTRA_BATCH_COLLISION';

type BatchInvalidItem = {
  index: number;
  periciaId?: string;
  startAt: string;
  city?: string;
  reason: BatchValidationReason;
  detail: string;
};


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

  listBatchScheduling() {
    const tenantId = this.context.get('tenantId') as string;
    return this.prisma.schedulingBatch.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async batchScheduling(dto: BatchScheduleDto) {
    const tenantId = this.context.get('tenantId') as string;
    const invalidItems = await this.validateBatchScheduling(dto, tenantId);
    if (invalidItems.length > 0) {
      throw new BadRequestException({
        code: 'BATCH_SCHEDULE_VALIDATION_ERROR',
        message: 'Falha de validação no agendamento em lote.',
        invalidItems,
      });
    }

    const summary = await this.prisma.$transaction(async (tx) => {
      const createdEvents: Array<{ id: string; periciaId: string | null }> = [];
      const updatedPericiaIds: string[] = [];
      const createdTaskIds: string[] = [];

      for (const item of dto.items) {
        const createdEvent = await tx.agendaEvent.create({
          data: {
            tenantId,
            title: item.title ?? 'Agendamento',
            type: item.type ?? AgendaEventType.OUTRO,
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
        });

        createdEvents.push({ id: createdEvent.id, periciaId: createdEvent.periciaId });

        if (!item.periciaId) continue;

        await tx.pericia.update({
          where: { id: item.periciaId },
          data: {
            agendada: true,
            dataAgendamento: new Date(item.startAt),
            horaAgendamento: new Date(item.startAt).toISOString().slice(11, 16),
          },
        });
        updatedPericiaIds.push(item.periciaId);

        const task = await tx.agendaTask.create({
          data: {
            tenantId,
            periciaId: item.periciaId,
            title: `Preparar perícia agendada: ${item.title ?? 'Agendamento'}`,
            dueAt: new Date(item.startAt),
            status: AgendaTaskStatus.TODO,
          },
        });
        createdTaskIds.push(task.id);
      }

      await tx.schedulingBatch.create({
        data: {
          tenantId,
          dateRef: new Date(dto.metadata?.date ?? dto.items[0]?.startAt ?? new Date().toISOString()),
          criteriaJson: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          resultJson: ({
            status: 'CONFIRMADO',
            created: createdEvents.length,
            items: dto.items.map((item) => ({
              periciaId: item.periciaId,
              scheduledAt: item.startAt,
            })),
          }) as Prisma.InputJsonValue,
        },
      });

      return {
        createdEvents,
        updatedPericiaIds,
        createdTaskIds,
      };
    });

    return {
      createdEventsCount: summary.createdEvents.length,
      updatedPericiasCount: summary.updatedPericiaIds.length,
      createdTasksCount: summary.createdTaskIds.length,
      eventIds: summary.createdEvents.map((event) => event.id),
      updatedPericiaIds: summary.updatedPericiaIds,
      taskIds: summary.createdTaskIds,
    };
  }


  async suggestBatchScheduling(dto: SuggestBatchSchedulingDto) {
    const tenantId = this.context.get('tenantId') as string;
    const orderedItems = [...dto.items].sort((a, b) => (a.cidade ?? '').localeCompare(b.cidade ?? ''));
    const dayStart = new Date(`${dto.date}T00:00:00`);
    const dayEnd = new Date(`${dto.date}T23:59:59`);

    const events = await this.prisma.agendaEvent.findMany({
      where: {
        tenantId,
        startAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startAt: 'asc' },
    });

    let cursor = new Date(`${dto.date}T${dto.startTime}:00`);
    const interval = dto.intervalMinutes ?? 15;
    const modalidadeDuration = dto.modalidadeDurationMinutes ?? {};

    const suggestions = orderedItems.map((item) => {
      const duration =
        item.estimatedDurationMinutes ??
        modalidadeDuration[item.modalidade ?? ''] ??
        dto.defaultDurationMinutes ??
        60;

      const slot = this.findNextFreeSlot(cursor, duration, events);
      const endAt = new Date(slot.getTime() + duration * 60000);

      cursor = new Date(endAt.getTime() + interval * 60000);
      return {
        periciaId: item.periciaId,
        cidade: item.cidade ?? 'Não informada',
        modalidade: item.modalidade ?? 'Não informada',
        estimatedDurationMinutes: duration,
        startAt: slot.toISOString(),
        endAt: endAt.toISOString(),
      };
    });

    return {
      date: dto.date,
      groupedByCity: Object.keys(
        suggestions.reduce<Record<string, boolean>>((acc, current) => {
          acc[current.cidade] = true;
          return acc;
        }, {}),
      ),
      suggestions,
    };
  }

  async exportBatchSchedulingPdf(id: string, query: ExportBatchPdfDto) {
    const tenantId = this.context.get('tenantId') as string;
    const batch = await this.prisma.schedulingBatch.findFirst({
      where: { id, tenantId },
    });

    if (!batch) throw new NotFoundException('Lote não encontrado.');

    const criteria = (batch.criteriaJson ?? {}) as Record<string, unknown>;
    const result = (batch.resultJson ?? {}) as {
      status?: string;
      items?: Array<{ periciaId?: string; scheduledAt?: string; city?: string }>;
      routeIncluded?: boolean;
    };

    const itemRows = Array.isArray(result.items) ? result.items : [];
    const periciaIds = itemRows.map((item) => item.periciaId).filter((value): value is string => Boolean(value));

    const pericias = periciaIds.length
      ? await this.prisma.pericia.findMany({
          where: {
            tenantId,
            id: { in: periciaIds },
          },
          select: { id: true, processoCNJ: true, autorNome: true, cidade: { select: { nome: true } } },
        })
      : [];

    const periciaMap = new Map(pericias.map((item) => [item.id, item]));

    const lines: string[] = [];
    lines.push(`Lote de agendamento ${batch.id}`);
    lines.push(`Data referência: ${this.toYmd(batch.dateRef)}`);
    lines.push(`Status: ${result.status ?? 'CONFIRMADO'}`);
    lines.push(`Cidade(s): ${Array.isArray(criteria.cityNames) ? criteria.cityNames.join(', ') : 'N/A'}`);
    lines.push(`Rota incluída: ${query.includeRoute ? 'Sim' : 'Não'}`);
    lines.push('');
    lines.push('Perícias:');

    itemRows.forEach((item, index) => {
      const pericia = item.periciaId ? periciaMap.get(item.periciaId) : undefined;
      lines.push(
        `${index + 1}. ${pericia?.processoCNJ ?? 'CNJ N/A'} | ${pericia?.autorNome ?? 'Contato N/A'} | ${item.scheduledAt ?? 'Horário N/A'} | ${item.city ?? pericia?.cidade?.nome ?? 'Cidade N/A'}`,
      );
    });

    if (query.includeRoute) {
      lines.push('');
      lines.push('Rota sugerida (ordem por horário):');
      itemRows
        .slice()
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
        .forEach((item, index) => {
          lines.push(`${index + 1}. ${item.city ?? 'Cidade N/A'} - ${item.scheduledAt ?? 'Horário N/A'}`);
        });
    }

    await this.prisma.schedulingBatch.update({
      where: { id: batch.id },
      data: {
        resultJson: ({
          ...result,
          routeIncluded: Boolean(query.includeRoute),
          exportedAt: new Date().toISOString(),
        }) as Prisma.InputJsonValue,
      },
    });

    const pdfBuffer = this.buildSimplePdf(lines.join('\n'));
    return {
      fileName: `lote-agendamento-${batch.id}.pdf`,
      contentBase64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    };
  }

  private async validateBatchScheduling(dto: BatchScheduleDto, tenantId: string): Promise<BatchInvalidItem[]> {
    const nowMs = Date.now();
    const invalidItems: BatchInvalidItem[] = [];

    const periciaIds = Array.from(new Set(dto.items.map((item) => item.periciaId).filter((id): id is string => Boolean(id))));
    const pericias = periciaIds.length
      ? await this.prisma.pericia.findMany({
          where: { tenantId, id: { in: periciaIds } },
          select: { id: true, cidade: { select: { nome: true } } },
        })
      : [];
    const cityByPericia = new Map(pericias.map((pericia) => [pericia.id, pericia.cidade?.nome ?? undefined]));

    const slotMap = new Map<string, number[]>();

    dto.items.forEach((item, index) => {
      const startAtDate = new Date(item.startAt);
      const startAtMs = startAtDate.getTime();
      const city = item.city || (item.periciaId ? cityByPericia.get(item.periciaId) : undefined);

      if (!Number.isFinite(startAtMs)) {
        invalidItems.push({
          index,
          periciaId: item.periciaId,
          startAt: item.startAt,
          city,
          reason: 'INVALID_DATETIME',
          detail: 'Data/hora inválida para o item. Revise o horário informado.',
        });
        return;
      }

      if (startAtMs <= nowMs) {
        invalidItems.push({
          index,
          periciaId: item.periciaId,
          startAt: item.startAt,
          city,
          reason: 'PAST_DATE',
          detail: 'Data/hora no passado. Informe um horário futuro.',
        });
      }

      const slotKey = `${city ?? '__SEM_CIDADE__'}|${startAtDate.toISOString()}`;
      const currentSlot = slotMap.get(slotKey) ?? [];
      currentSlot.push(index);
      slotMap.set(slotKey, currentSlot);
    });

    slotMap.forEach((indexes) => {
      if (indexes.length < 2) return;
      indexes.forEach((index) => {
        const item = dto.items[index];
        invalidItems.push({
          index,
          periciaId: item.periciaId,
          startAt: item.startAt,
          city: item.city || (item.periciaId ? cityByPericia.get(item.periciaId) : undefined),
          reason: 'INTRA_BATCH_COLLISION',
          detail: 'Conflito intra-lote: existe mais de um item com mesma cidade e mesmo horário.',
        });
      });
    });

    const overlapChecks = await Promise.all(
      dto.items.map(async (item, index) => {
        const startAtDate = new Date(item.startAt);
        const startAtMs = startAtDate.getTime();
        if (!Number.isFinite(startAtMs)) return null;

        const endAtDate = item.endAt ? new Date(item.endAt) : new Date(startAtMs + 60 * 60 * 1000);

        const existingEvent = await this.prisma.agendaEvent.findFirst({
          where: {
            tenantId,
            startAt: { lt: endAtDate },
            OR: [{ endAt: { gt: startAtDate } }, { endAt: null, startAt: { gt: new Date(startAtMs - 60 * 60 * 1000) } }],
          },
          select: { id: true, startAt: true, endAt: true },
        });

        if (!existingEvent) return null;

        return {
          index,
          periciaId: item.periciaId,
          startAt: item.startAt,
          city: item.city || (item.periciaId ? cityByPericia.get(item.periciaId) : undefined),
          reason: 'EXISTING_OVERLAP' as const,
          detail: `Conflito com evento existente (${existingEvent.id}) entre ${existingEvent.startAt.toISOString()} e ${(existingEvent.endAt ?? new Date(existingEvent.startAt.getTime() + 60 * 60 * 1000)).toISOString()}.`,
        };
      }),
    );

    overlapChecks.forEach((entry) => {
      if (entry) invalidItems.push(entry);
    });

    return invalidItems;
  }

  async weeklyWorkload(startDate?: string) {
    const weekStart = this.getWeekStart(startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await this.prisma.agendaEvent.findMany({
      where: {
        startAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startAt: 'asc' },
    });

    const byDay = new Map<string, WeeklyDaySummary>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const key = this.toYmd(date);
      const weekday = date.getDay();
      byDay.set(key, {
        date: key,
        allocated_minutes: 0,
        work_window_minutes: weekday === 0 || weekday === 6 ? 240 : 480,
        utilization: 0,
        conflicts: 0,
      });
    }

    const eventsByDay = new Map<string, typeof events>();
    for (const event of events) {
      const key = this.toYmd(event.startAt);
      const day = byDay.get(key);
      if (!day) continue;
      const endAt = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
      const minutes = Math.max(15, Math.round((endAt.getTime() - event.startAt.getTime()) / 60000));
      day.allocated_minutes += minutes;
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }

    for (const [key, day] of byDay.entries()) {
      const dayEvents = (eventsByDay.get(key) ?? []).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      let overlaps = 0;
      for (let i = 0; i < dayEvents.length; i += 1) {
        for (let j = i + 1; j < dayEvents.length; j += 1) {
          const aEnd = dayEvents[i].endAt ?? new Date(dayEvents[i].startAt.getTime() + 60 * 60 * 1000);
          if (aEnd <= dayEvents[j].startAt) break;
          overlaps += 1;
        }
      }
      day.conflicts = overlaps;
      day.utilization = day.work_window_minutes > 0 ? Number(((day.allocated_minutes / day.work_window_minutes) * 100).toFixed(1)) : 0;
    }

    const days = Array.from(byDay.values());
    const totals = {
      allocated_minutes: days.reduce((sum, d) => sum + d.allocated_minutes, 0),
      work_window_minutes: days.reduce((sum, d) => sum + d.work_window_minutes, 0),
      conflicts: days.reduce((sum, d) => sum + d.conflicts, 0),
    };

    return {
      week_start: this.toYmd(weekStart),
      week_end: this.toYmd(new Date(weekEnd.getTime() - 86400000)),
      days,
      ...totals,
      utilization: totals.work_window_minutes > 0 ? Number(((totals.allocated_minutes / totals.work_window_minutes) * 100).toFixed(1)) : 0,
    };
  }

  async exportWeeklyPdf(dto: ExportWeeklyPdfDto) {
    const week = await this.weeklyWorkload(dto.startDate);
    const weekStart = this.getWeekStart(dto.startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const events = await this.prisma.agendaEvent.findMany({
      where: { startAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startAt: 'asc' },
    });

    const lines: string[] = [];
    lines.push(`Relatório Semanal de Carga (${week.week_start} a ${week.week_end})`);
    lines.push(`Utilização: ${week.utilization}% | Conflitos: ${week.conflicts}`);
    lines.push('');

    if (dto.mode === 'detalhado') {
      lines.push('Eventos:');
      for (const event of events) {
        const start = event.startAt.toISOString().replace('T', ' ').slice(0, 16);
        const end = (event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000))
          .toISOString()
          .replace('T', ' ')
          .slice(0, 16);
        lines.push(`- [${start} → ${end}] ${event.title} (${event.type})`);
      }
    } else {
      lines.push('Resumo diário:');
      for (const day of week.days) {
        lines.push(`- ${day.date}: ${day.allocated_minutes}min, util ${day.utilization}%, conflitos ${day.conflicts}`);
      }
    }

    const pdf = this.buildSimplePdf(lines.join('\n'));
    return {
      filename: `agenda-semanal-${week.week_start}.pdf`,
      contentBase64: pdf.toString('base64'),
      mimeType: 'application/pdf',
    };
  }

  async suggestLaudoBlocks(dto: AiSuggestLaudoBlocksDto) {
    const weekStart = this.getWeekStart(dto.startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const events = await this.prisma.agendaEvent.findMany({
      where: { startAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startAt: 'asc' },
    });

    const requiredMinutes = dto.backlog * dto.avg_minutes_per_laudo;
    const suggestedCount = Math.max(1, Math.ceil(requiredMinutes / Math.max(dto.avg_minutes_per_laudo, 30)));

    const suggestions = Array.from({ length: suggestedCount }).map((_, index) => {
      const date = new Date(weekStart);
      const preferred = dto.preferred_windows[index % dto.preferred_windows.length] ?? '14:00';
      date.setDate(date.getDate() + (index % 5));
      const [hour, minute] = preferred.split(':').map(Number);
      date.setHours(hour || 14, minute || 0, 0, 0);

      const duration = Math.max(dto.min_buffer_minutes, Math.round(dto.avg_minutes_per_laudo * 0.8));
      const endDate = new Date(date.getTime() + duration * 60000);

      const conflict = events.some((event) => {
        const eventEnd = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
        return date < eventEnd && endDate > event.startAt;
      });

      return {
        title: `Bloco de Laudo #${index + 1}`,
        type: AgendaEventType.BLOCO_TRABALHO,
        startAt: date.toISOString(),
        endAt: endDate.toISOString(),
        aiSuggested: true,
        conflict,
      };
    });

    return {
      assumptions: {
        avg_minutes_per_laudo: dto.avg_minutes_per_laudo,
        backlog: dto.backlog,
        required_minutes: requiredMinutes,
        min_buffer_minutes: dto.min_buffer_minutes,
      },
      suggestions,
    };
  }

  async applyLaudoBlocks(items: Array<{ title: string; startAt: string; endAt: string; periciaId?: string }>) {
    const tenantId = this.context.get('tenantId') as string;
    const created = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.agendaEvent.create({
          data: {
            tenantId,
            title: item.title ?? "Agendamento",
            startAt: new Date(item.startAt),
            endAt: new Date(item.endAt),
            type: AgendaEventType.BLOCO_TRABALHO,
            ...(item.periciaId ? { periciaId: item.periciaId } : {}),
            metadata: { aiSuggested: true } as Prisma.InputJsonValue,
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

  async weeklyWorkload(startDate?: string) {
    const weekStart = this.getWeekStart(startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await this.prisma.agendaEvent.findMany({
      where: {
        startAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startAt: 'asc' },
    });

    const byDay = new Map<string, WeeklyDaySummary>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const key = this.toYmd(date);
      const weekday = date.getDay();
      byDay.set(key, {
        date: key,
        allocated_minutes: 0,
        work_window_minutes: weekday === 0 || weekday === 6 ? 240 : 480,
        utilization: 0,
        conflicts: 0,
      });
    }

    const eventsByDay = new Map<string, typeof events>();
    for (const event of events) {
      const key = this.toYmd(event.startAt);
      const day = byDay.get(key);
      if (!day) continue;
      const endAt = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
      const minutes = Math.max(15, Math.round((endAt.getTime() - event.startAt.getTime()) / 60000));
      day.allocated_minutes += minutes;
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }

    for (const [key, day] of byDay.entries()) {
      const dayEvents = (eventsByDay.get(key) ?? []).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      let overlaps = 0;
      for (let i = 0; i < dayEvents.length; i += 1) {
        for (let j = i + 1; j < dayEvents.length; j += 1) {
          const aEnd = dayEvents[i].endAt ?? new Date(dayEvents[i].startAt.getTime() + 60 * 60 * 1000);
          if (aEnd <= dayEvents[j].startAt) break;
          overlaps += 1;
        }
      }
      day.conflicts = overlaps;
      day.utilization = day.work_window_minutes > 0 ? Number(((day.allocated_minutes / day.work_window_minutes) * 100).toFixed(1)) : 0;
    }

    const days = Array.from(byDay.values());
    const totals = {
      allocated_minutes: days.reduce((sum, d) => sum + d.allocated_minutes, 0),
      work_window_minutes: days.reduce((sum, d) => sum + d.work_window_minutes, 0),
      conflicts: days.reduce((sum, d) => sum + d.conflicts, 0),
    };

    return {
      week_start: this.toYmd(weekStart),
      week_end: this.toYmd(new Date(weekEnd.getTime() - 86400000)),
      days,
      ...totals,
      utilization: totals.work_window_minutes > 0 ? Number(((totals.allocated_minutes / totals.work_window_minutes) * 100).toFixed(1)) : 0,
    };
  }

  async exportWeeklyPdf(dto: ExportWeeklyPdfDto) {
    const week = await this.weeklyWorkload(dto.startDate);
    const weekStart = this.getWeekStart(dto.startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const events = await this.prisma.agendaEvent.findMany({
      where: { startAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startAt: 'asc' },
    });

    const lines: string[] = [];
    lines.push(`Agenda semanal (${week.week_start} a ${week.week_end})`);
    lines.push(`Modo: ${dto.mode}`);
    lines.push(`Total semana: ${week.allocated_minutes} min de ${week.work_window_minutes} min (${week.utilization}%)`);
    lines.push(`Conflitos: ${week.conflicts}`);
    lines.push('');

    for (const day of week.days) {
      lines.push(`${day.date} | ${day.allocated_minutes}/${day.work_window_minutes} min | uso ${day.utilization}% | conflitos ${day.conflicts}`);
      if (dto.mode === 'detalhado') {
        for (const event of events.filter((e) => this.toYmd(e.startAt) === day.date)) {
          const endAt = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
          lines.push(`  - ${event.title} [${event.type}] ${event.startAt.toISOString()} -> ${endAt.toISOString()}`);
        }
      }
    }

    const pdfBuffer = this.buildSimplePdf(lines.join('\n'));

    return {
      fileName: `agenda-semanal-${week.week_start}.pdf`,
      contentBase64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      totals: week,
    };
  }

  async suggestLaudoBlocks(dto: AiSuggestLaudoBlocksDto) {
    const weekStart = this.getWeekStart(dto.startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await this.prisma.agendaEvent.findMany({
      where: { startAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startAt: 'asc' },
    });

    const requiredMinutes = dto.avg_minutes_per_laudo * dto.backlog;
    const suggestedCount = Math.max(1, Math.ceil(requiredMinutes / Math.max(dto.min_buffer_minutes, 30)));

    const suggestions = Array.from({ length: suggestedCount }).map((_, index) => {
      const date = new Date(weekStart);
      const preferred = dto.preferred_windows[index % dto.preferred_windows.length] ?? '14:00';
      date.setDate(date.getDate() + (index % 5));
      const [hour, minute] = preferred.split(':').map(Number);
      date.setHours(hour || 14, minute || 0, 0, 0);

      const duration = Math.max(dto.min_buffer_minutes, Math.round(dto.avg_minutes_per_laudo * 0.8));
      const endDate = new Date(date.getTime() + duration * 60000);

      const conflict = events.some((event) => {
        const eventEnd = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
        return date < eventEnd && endDate > event.startAt;
      });

      return {
        title: `Bloco de Laudo #${index + 1}`,
        type: AgendaEventType.BLOCO_TRABALHO,
        startAt: date.toISOString(),
        endAt: endDate.toISOString(),
        aiSuggested: true,
        conflict,
      };
    });

    return {
      assumptions: {
        avg_minutes_per_laudo: dto.avg_minutes_per_laudo,
        backlog: dto.backlog,
        required_minutes: requiredMinutes,
        min_buffer_minutes: dto.min_buffer_minutes,
      },
      suggestions,
    };
  }

  async applyLaudoBlocks(items: Array<{ title: string; startAt: string; endAt: string; periciaId?: string }>) {
    const tenantId = this.context.get('tenantId') as string;
    const created = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.agendaEvent.create({
          data: {
            tenantId,
            title: item.title,
            startAt: new Date(item.startAt),
            endAt: new Date(item.endAt),
            type: AgendaEventType.BLOCO_TRABALHO,
            ...(item.periciaId ? { periciaId: item.periciaId } : {}),
            metadata: { aiSuggested: true } as Prisma.InputJsonValue,
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


  private findNextFreeSlot(start: Date, durationMinutes: number, events: Array<{ startAt: Date; endAt: Date | null }>) {
    let candidate = new Date(start);
    const durationMs = durationMinutes * 60000;

    while (true) {
      const candidateEnd = new Date(candidate.getTime() + durationMs);
      const conflict = events.find((event) => {
        const eventEnd = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
        return candidate < eventEnd && candidateEnd > event.startAt;
      });

      if (!conflict) return candidate;

      const conflictEnd = conflict.endAt ?? new Date(conflict.startAt.getTime() + 60 * 60 * 1000);
      candidate = new Date(conflictEnd.getTime() + 5 * 60000);
    }
  }

  private toYmd(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getWeekStart(startDate?: string) {
    const base = startDate ? new Date(`${startDate}T12:00:00`) : new Date();
    const day = base.getDay();
    const diff = (day + 6) % 7;
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private buildSimplePdf(text: string) {
    const sanitized = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const content = `BT /F1 10 Tf 50 780 Td (${sanitized.replace(/\n/g, ') Tj T* (')}) Tj ET`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    ];

    let body = '%PDF-1.4\n';
    const xref: number[] = [0];
    for (const object of objects) {
      xref.push(body.length);
      body += `${object}\n`;
    }
    const xrefStart = body.length;
    body += `xref\n0 ${objects.length + 1}\n`;
    body += '0000000000 65535 f \n';
    for (let i = 1; i < xref.length; i += 1) {
      body += `${String(xref[i]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(body, 'utf-8');
  }
}
