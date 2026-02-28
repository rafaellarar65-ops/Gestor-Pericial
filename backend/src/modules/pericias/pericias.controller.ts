import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  BatchUpdatePericiasDto,
  ChangeStatusPericiaDto,
  CreatePericiasDto,
  ImportPericiasDto,
  ListPericiasDto,
  SetUrgenciaPericiaDto,
  UpdatePericiasDto,
} from './dto/pericias.dto';
import { PericiasService } from './pericias.service';

@ApiTags('pericias')
@ApiBearerAuth()
@Controller('pericias')
export class PericiasController {
  constructor(private readonly service: PericiasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista perícias com filtros compostos' })
  list(@Query() query: ListPericiasDto) {
    return this.service.findAll(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'KPIs agregados do dashboard de perícias' })
  dashboard() {
    return this.service.dashboard();
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Timeline real de eventos da perícia' })
  timeline(@Param('id') id: string) {
    return this.service.timeline(id);
  }

  @Get('cidades/:cidadeId/overview')
  @ApiOperation({ summary: 'Resumo operacional e financeiro da cidade' })
  cityOverview(@Param('cidadeId') cidadeId: string) {
    return this.service.cityOverview(cidadeId);
  }

  @Get('cidades-overview')
  @ApiOperation({ summary: 'Resumo operacional de todas as cidades' })
  cityOverviewList() {
    return this.service.cityOverviewList();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePericiasDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePericiasDto) {
    return this.service.update(id, dto);
  }

  @Patch('batch-update')
  @Roles('ADMIN')
  batchUpdate(@Body() dto: BatchUpdatePericiasDto) {
    return this.service.batchUpdate(dto);
  }

  @Post('import-csv')
  @Roles('ADMIN')
  importCsv(@Body() dto: ImportPericiasDto) {
    return this.service.importCsv(dto);
  }

  @Post('export')
  export(@Body() query: ListPericiasDto) {
    return this.service.export(query);
  }

  @Patch('change-status')
  changeStatus(@Body() dto: ChangeStatusPericiaDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.service.changeStatus(dto, req.user?.sub);
  }

  @Patch('set-urgencia')
  setUrgencia(@Body() dto: SetUrgenciaPericiaDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.service.setUrgencia(dto, req.user?.sub);
  }
}
