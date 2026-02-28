import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min, ValidateNested } from 'class-validator';

const SLOT_TYPES = ['SEQUENTIAL', 'CUSTOM'] as const;

export class CreateTeleSlotDto {
  @ApiProperty({ description: 'Data base do slot (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '08:30' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @ApiProperty({ minimum: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes!: number;

  @ApiPropertyOptional({ enum: SLOT_TYPES, default: 'SEQUENTIAL' })
  @IsOptional()
  @IsEnum(SLOT_TYPES)
  slotType?: (typeof SLOT_TYPES)[number];

  @ApiProperty({ minimum: 5, description: 'Duração de cada atendimento dentro do slot' })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  appointmentDurationMinutes!: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  gapMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ default: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateTeleSlotDto extends CreateTeleSlotDto {}

export class AssignTelepericiaItemDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}

export class ReorderTelepericiaItemInputDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class ReorderTelepericiaItemsDto {
  @ApiProperty({ type: [ReorderTelepericiaItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTelepericiaItemInputDto)
  items!: ReorderTelepericiaItemInputDto[];
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
