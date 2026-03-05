import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BioimpedanceService } from './bioimpedance.service';
import { CreateBioimpedanceDto } from './dto/bioimpedance.dto';

@ApiTags('bioimpedance')
@ApiBearerAuth()
@Controller('bioimpedance')
export class BioimpedanceController {
  constructor(private readonly service: BioimpedanceService) {}

  @Get()
  @ApiOperation({ summary: 'Lista registros de bioimpedância por perícia' })
  list(@Query('periciaId') periciaId: string) {
    return this.service.listByPericia(periciaId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria registro de bioimpedância (patient-scoped)' })
  create(@Body() dto: CreateBioimpedanceDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca registro de bioimpedância por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove registro de bioimpedância' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
