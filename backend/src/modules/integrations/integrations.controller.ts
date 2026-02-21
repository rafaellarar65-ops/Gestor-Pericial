import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationsDto, UpdateIntegrationsDto } from './dto/integrations.dto';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Post('datajud-cnj')
  datajud_cnj() { return { action: 'datajud-cnj', module: 'integrations' }; }
  @Post('datajud-sync')
  datajud_sync() { return { action: 'datajud-sync', module: 'integrations' }; }
  @Post('sisperjud-consult')
  sisperjud_consult() { return { action: 'sisperjud-consult', module: 'integrations' }; }
  @Post('tjmg-utils')
  tjmg_utils() { return { action: 'tjmg-utils', module: 'integrations' }; }

}
