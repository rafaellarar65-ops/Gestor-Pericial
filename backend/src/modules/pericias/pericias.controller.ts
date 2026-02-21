import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PericiasService } from './pericias.service';
import { CreatePericiasDto, UpdatePericiasDto } from './dto/pericias.dto';

@ApiTags('pericias')
@ApiBearerAuth()
@Controller('pericias')
export class PericiasController {
  constructor(private readonly service: PericiasService) {}

  @Get()
  list() { return this.service.findAll(); }
  @Get(':id')
  get(@Param('id') id: string) { return this.service.findOne(id); }
  @Post()
  create(@Body() dto: CreatePericiasDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePericiasDto) { return this.service.update(id, dto); }
  @Post('batch-update')
  batch_update() { return { action: 'batch-update', module: 'pericias' }; }
  @Post('import-csv')
  import_csv() { return { action: 'import-csv', module: 'pericias' }; }
  @Post('export')
  export() { return { action: 'export', module: 'pericias' }; }
  @Post('change-status')
  change_status() { return { action: 'change-status', module: 'pericias' }; }
  @Get('dashboard')
  dashboard() { return { action: 'dashboard', module: 'pericias' }; }

}
