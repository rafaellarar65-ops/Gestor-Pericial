import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeleSlotStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTeleSlotDto {
  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ enum: TeleSlotStatus })
  @IsOptional()
  @IsEnum(TeleSlotStatus)
  status?: TeleSlotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;
}

export class BookTeleSlotDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingUrl?: string;
}

export class WhatsappContactDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiProperty()
  @IsString()
  phone!: string;
}

export class UploadSessionDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional({ description: 'Expiração em minutos', default: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  expiresInMinutes = 30;
}

export class StartRealtimeSessionDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional({ description: 'Nome da sala virtual para WebRTC' })
  @IsOptional()
  @IsString()
  roomName?: string;
}

export class CreateVirtualRoomDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class SendRoomMessageDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiProperty()
  @IsString()
  sender!: string;

  @ApiProperty()
  @IsString()
  message!: string;
}

export class SecureUploadQrDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional({ description: 'Telefone para notificação no WhatsApp' })
  @IsOptional()
  @IsString()
  notifyPhone?: string;
}
