import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DatajudCnjDto,
  DatajudSyncDto,
  SaveIntegrationSettingsDto,
  SisperjudConsultDto,
  TjmgUtilsDto,
} from './dto/integrations.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Post('settings')
  @ApiOperation({ summary: 'Configura/atualiza provider de integração' })
  saveSettings(@Body() dto: SaveIntegrationSettingsDto) {
    return this.service.saveSettings(dto);
  }

  @Post('datajud-cnj')
  datajudCnj(@Body() dto: DatajudCnjDto) {
    return this.service.datajudByCnj(dto);
  }

  @Post('datajud-sync')
  datajudSync(@Body() dto: DatajudSyncDto) {
    return this.service.datajudSync(dto);
  }

  @Post('sisperjud-consult')
  sisperjudConsult(@Body() dto: SisperjudConsultDto) {
    return this.service.sisperjudConsult(dto);
  }

  @Post('tjmg-utils')
  tjmgUtils(@Body() dto: TjmgUtilsDto) {
    return this.service.tjmgUtils(dto);
  }
}
