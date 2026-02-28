import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import {
  AiSuggestLaudoBlocksDto,
  BatchScheduleDto,
  CreateAgendaEventDto,
  CreateAgendaTaskDto,
  ExportWeeklyPdfDto,
  UpdateAgendaEventDto,
} from './dto/agenda.dto';

@ApiTags('agenda')
@ApiBearerAuth()
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Post('events')
  @ApiOperation({ summary: 'Cria evento na agenda' })
  createEvent(@Body() dto: CreateAgendaEventDto) {
    return this.service.createEvent(dto);
  }

  @Get('events')
  listEvents() {
    return this.service.listEvents();
  }

  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateAgendaEventDto) {
    return this.service.updateEvent(id, dto);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Cria task da agenda' })
  createTask(@Body() dto: CreateAgendaTaskDto) {
    return this.service.createTask(dto);
  }

  @Get('tasks')
  listTasks() {
    return this.service.listTasks();
  }

  @Post('batch-scheduling')
  @ApiOperation({ summary: 'Agendamento em lote com transação atômica' })
  batchScheduling(@Body() dto: BatchScheduleDto) {
    return this.service.batchScheduling(dto);
  }

  @Get('weekly-workload')
  weeklyWorkload(@Query('startDate') startDate?: string) {
    return this.service.weeklyWorkload(startDate);
  }

  @Post('export-weekly-pdf')
  exportWeeklyPdf(@Body() dto: ExportWeeklyPdfDto) {
    return this.service.exportWeeklyPdf({ ...dto, mode: dto.mode ?? 'compacto' });
  }

  @Post('ai/suggest-laudo-blocks')
  suggestLaudoBlocks(@Body() dto: AiSuggestLaudoBlocksDto) {
    return this.service.suggestLaudoBlocks(dto);
  }

  @Post('ai/apply-laudo-blocks')
  applyLaudoBlocks(@Body() body: { items: Array<{ title: string; startAt: string; endAt: string; periciaId?: string }> }) {
    return this.service.applyLaudoBlocks(body.items ?? []);
  }

  @Post('calendar-sync')
  calendarSync() {
    return this.service.calendarSync();
  }
}
