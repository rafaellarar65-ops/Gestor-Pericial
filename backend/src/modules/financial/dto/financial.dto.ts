import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FontePagamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateRecebimentoDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty({ enum: FontePagamento })
  @IsEnum(FontePagamento)
  fontePagamento!: FontePagamento;

  @ApiProperty()
  @IsDateString()
  dataRecebimento!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorBruto!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorLiquido?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;
}

export class CreateDespesaDto {
  @ApiProperty()
  @IsString()
  categoria!: string;

  @ApiProperty()
  @IsString()
  descricao!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valor!: number;

  @ApiProperty()
  @IsDateString()
  dataCompetencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class ImportRecebimentosDto {
  @ApiProperty({ type: [CreateRecebimentoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecebimentoDto)
  rows!: CreateRecebimentoDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceFileName?: string;
}

export class ReconcileDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  unmatchedIds!: string[];

  @ApiProperty()
  @IsString()
  note!: string;
}

export enum AnalyticsViewMode {
  FINANCE = 'FINANCE',
  PRODUCTION = 'PRODUCTION',
  WORKFLOW = 'WORKFLOW',
}

export enum AnalyticsPeriod {
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM',
  LAST_30 = 'LAST_30',
  LAST_90 = 'LAST_90',
}

export enum AnalyticsGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class FinancialTimelineQueryDto {
  @ApiPropertyOptional({ enum: AnalyticsViewMode })
  @IsOptional()
  @IsEnum(AnalyticsViewMode)
  viewMode?: AnalyticsViewMode;

  @ApiPropertyOptional({ enum: AnalyticsPeriod, default: AnalyticsPeriod.YEAR })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({ enum: AnalyticsGranularity, default: AnalyticsGranularity.MONTH })
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity;

  @ApiPropertyOptional({ type: [String], description: 'IDs de cidade' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  cidadeIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'IDs de status' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  statusIds?: string[];

  @ApiPropertyOptional({ description: 'Data inicial para period=CUSTOM' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final para period=CUSTOM' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeUnlinked?: boolean;
}
