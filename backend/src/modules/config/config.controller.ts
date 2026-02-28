import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigDomainService } from './config.service';
import { ConfigResourceParamDto, CreateConfigDomainDto, UpdateConfigDomainDto } from './dto/config.dto';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigDomainController {
  constructor(private readonly service: ConfigDomainService) {}

  @Get('system/dashboard')
  @ApiOperation({ summary: 'Obtém configuração de dashboard e filas do frontend' })
  getDashboardSettings() {
    return this.service.getDashboardSettings();
  }

  @Patch('system/dashboard')
  @ApiOperation({ summary: 'Atualiza configuração de dashboard e filas do frontend' })
  updateDashboardSettings(@Body() payload: Record<string, unknown>) {
    return this.service.updateDashboardSettings(payload);
  }

  @Get(':resource')
  @ApiOperation({ summary: 'Lista catálogo por recurso' })
  list(@Param() params: ConfigResourceParamDto) {
    return this.service.findAll(params.resource);
  }

  @Get(':resource/:id')
  get(@Param() params: ConfigResourceParamDto, @Param('id') id: string) {
    return this.service.findOne(params.resource, id);
  }

  @Post(':resource')
  create(@Param() params: ConfigResourceParamDto, @Body() dto: CreateConfigDomainDto) {
    return this.service.create(params.resource, dto);
  }

  @Patch(':resource/:id')
  update(@Param() params: ConfigResourceParamDto, @Param('id') id: string, @Body() dto: UpdateConfigDomainDto) {
    return this.service.update(params.resource, id, dto);
  }

  @Delete(':resource/:id')
  remove(@Param() params: ConfigResourceParamDto, @Param('id') id: string) {
    return this.service.remove(params.resource, id);
  }
}
