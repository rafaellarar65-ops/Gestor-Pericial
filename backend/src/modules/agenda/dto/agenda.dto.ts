import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaEventType, AgendaTaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAgendaEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ enum: AgendaEventType })
  @IsEnum(AgendaEventType)
  type!: AgendaEventType;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAgendaEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: AgendaEventType })
  @IsOptional()
  @IsEnum(AgendaEventType)
  type?: AgendaEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class CreateAgendaTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ enum: AgendaTaskStatus })
  @IsOptional()
  @IsEnum(AgendaTaskStatus)
  status?: AgendaTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class BatchScheduleItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ enum: AgendaEventType })
  @IsEnum(AgendaEventType)
  type!: AgendaEventType;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;
}


export class BatchScheduleMetadataDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  cityNames?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  intervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modalidade?: string;

  @ApiPropertyOptional({ enum: ['CSV', 'WORD'] })
  @IsOptional()
  @IsString()
  source?: 'CSV' | 'WORD';
}

export class BatchScheduleDto {
  @ApiPropertyOptional({ type: BatchScheduleMetadataDto })
  @IsOptional()
  @IsObject()
  metadata?: BatchScheduleMetadataDto;

  @ApiProperty({ type: [BatchScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchScheduleItemDto)
  items!: BatchScheduleItemDto[];
}
