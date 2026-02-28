import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { BatchScheduleDto, CreateAgendaEventDto, CreateAgendaTaskDto, UpdateAgendaEventDto } from './dto/agenda.dto';

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


  @Get('batch-scheduling')
  @ApiOperation({ summary: 'Lista histórico de lotes de agendamento persistidos' })
  listBatchScheduling() {
    return this.service.listBatchScheduling();
  }

  @Post('batch-scheduling')
  @ApiOperation({ summary: 'Agendamento em lote com transação atômica' })
  batchScheduling(@Body() dto: BatchScheduleDto) {
    return this.service.batchScheduling(dto);
  }

  @Post('calendar-sync')
  calendarSync() {
    return this.service.calendarSync();
  }
}
