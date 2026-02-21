import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DigestDto, RealtimeNotificationDto, UpsertNotificationRuleDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('realtime')
  @ApiOperation({ summary: 'Publica notificação em tempo real (websocket)' })
  realtime(@Body() dto: RealtimeNotificationDto) {
    return this.service.realtime(dto);
  }

  @Post('digest')
  digest(@Body() dto: DigestDto) {
    return this.service.digest(dto);
  }

  @Post('rules')
  rules(@Body() dto: UpsertNotificationRuleDto) {
    return this.service.rules(dto);
  }
}
