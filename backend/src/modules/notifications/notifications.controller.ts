import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationsDto, UpdateNotificationsDto } from './dto/notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('realtime')
  realtime() { return { action: 'realtime', module: 'notifications' }; }
  @Post('digest')
  digest() { return { action: 'digest', module: 'notifications' }; }
  @Post('rules')
  rules() { return { action: 'rules', module: 'notifications' }; }

}
