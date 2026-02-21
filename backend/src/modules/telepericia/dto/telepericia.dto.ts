import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeleSlotStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsOptional()
  expiresInMinutes = 30;
}
