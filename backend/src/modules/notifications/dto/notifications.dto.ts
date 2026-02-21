import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertNotificationRuleDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class RealtimeNotificationDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;
}

export class DigestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;
}
