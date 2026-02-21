import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestDto, RealtimeNotificationDto, UpsertNotificationRuleDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  realtime(dto: RealtimeNotificationDto) {
    const payload = {
      delivered: true,
      channel: 'websocket',
      event: 'notification:new',
      payload: dto,
      timestamp: new Date().toISOString(),
    };

    this.gateway.broadcast('notification:new', payload);
    return payload;
  }

  async digest(dto: DigestDto) {
    const configs = await this.prisma.notificationConfig.findMany({ where: { enabled: true } });
    return {
      scheduled: true,
      period: dto.period ?? 'daily',
      activeChannels: configs.map((cfg) => cfg.channel),
    };
  }

  async rules(dto: UpsertNotificationRuleDto) {
    const existing = await this.prisma.notificationConfig.findFirst({ where: { channel: dto.channel } });

    if (existing) {
      return this.prisma.notificationConfig.update({
        where: { id: existing.id },
        data: {
          enabled: dto.enabled ?? existing.enabled,
          config: dto.config,
        },
      });
    }

    return this.prisma.notificationConfig.create({
      data: {
        channel: dto.channel,
        enabled: dto.enabled ?? true,
        config: dto.config,
      },
    });
  }
}
