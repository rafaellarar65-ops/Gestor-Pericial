import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { CreateAgendaDto, UpdateAgendaDto } from './dto/agenda.dto';

@ApiTags('agenda')
@ApiBearerAuth()
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Post('events')
  events() { return { action: 'events', module: 'agenda' }; }
  @Post('tasks')
  tasks() { return { action: 'tasks', module: 'agenda' }; }
  @Post('batch-scheduling')
  batch_scheduling() { return { action: 'batch-scheduling', module: 'agenda' }; }
  @Post('calendar-sync')
  calendar_sync() { return { action: 'calendar-sync', module: 'agenda' }; }

}
