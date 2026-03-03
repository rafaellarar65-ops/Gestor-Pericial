import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DatajudCnjDto,
  DatajudSyncDto,
  GoogleOAuthCallbackDto,
  GoogleOAuthConnectDto,
  GoogleSyncRunDto,
  GoogleSyncSettingsDto,
  ListSyncAuditDto,
  ResolveSyncConflictDto,
  SaveIntegrationSettingsDto,
  SelectGoogleCalendarDto,
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

  @Post('google/oauth/connect')
  googleOAuthConnect(@Body() dto: GoogleOAuthConnectDto) {
    return this.service.googleOAuthConnect(dto);
  }

  @Post('google/oauth/callback')
  googleOAuthCallback(@Body() dto: GoogleOAuthCallbackDto) {
    return this.service.googleOAuthCallback(dto);
  }

  @Get('google/status')
  googleStatus() {
    return this.service.getGoogleCalendarStatus();
  }

  @Get('google/calendars')
  googleCalendars() {
    return this.service.listGoogleCalendars();
  }

  @Patch('google/calendar')
  selectGoogleCalendar(@Body() dto: SelectGoogleCalendarDto) {
    return this.service.selectGoogleCalendar(dto);
  }

  @Patch('google/sync-settings')
  updateGoogleSyncSettings(@Body() dto: GoogleSyncSettingsDto) {
    return this.service.updateGoogleSyncSettings(dto);
  }

  @Post('google/sync')
  runGoogleSync(@Body() dto: GoogleSyncRunDto) {
    return this.service.runGoogleSync(dto);
  }

  @Get('google/sync-audit')
  listSyncAudit(@Query() dto: ListSyncAuditDto) {
    return this.service.listSyncAudit(dto);
  }

  @Patch('google/sync-audit/:logId/resolve')
  resolveSyncConflict(@Param('logId') logId: string, @Body() dto: ResolveSyncConflictDto) {
    return this.service.resolveSyncConflict(logId, dto);
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
