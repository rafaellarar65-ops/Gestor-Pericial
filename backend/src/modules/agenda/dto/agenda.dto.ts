import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaEventType, AgendaTaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
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

export class BatchScheduleDto {
  @ApiProperty({ type: [BatchScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchScheduleItemDto)
  items!: BatchScheduleItemDto[];
}

export class ExportWeeklyPdfDto {
  @ApiPropertyOptional({ description: 'Data de referência da semana (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ enum: ['compacto', 'detalhado'], default: 'compacto' })
  @IsOptional()
  @IsIn(['compacto', 'detalhado'])
  mode?: 'compacto' | 'detalhado';
}

export class AiSuggestLaudoBlocksDto {
  @ApiPropertyOptional({ description: 'Data de referência da semana (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(15)
  avg_minutes_per_laudo!: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  backlog!: number;

  @ApiProperty({ type: [String], example: ['09:00', '14:00'] })
  @IsArray()
  @IsString({ each: true })
  preferred_windows!: string[];

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(15)
  min_buffer_minutes!: number;
}
