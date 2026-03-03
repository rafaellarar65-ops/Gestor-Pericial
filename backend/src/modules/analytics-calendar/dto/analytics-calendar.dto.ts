import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export const ANALYTICS_CALENDAR_LAYERS = [
  'OPERACIONAL',
  'PRODUCAO',
  'LAUDOS',
  'ESCLARECIMENTOS',
  'FINANCEIRO_PRODUCAO_RECEBIMENTO',
] as const;

export type AnalyticsCalendarLayer = (typeof ANALYTICS_CALENDAR_LAYERS)[number];

export class AnalyticsCalendarQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_CALENDAR_LAYERS, default: 'OPERACIONAL' })
  @IsOptional()
  @IsEnum(ANALYTICS_CALENDAR_LAYERS)
  layer?: AnalyticsCalendarLayer;

  @ApiPropertyOptional({ description: 'Data inicial do período no formato ISO (YYYY-MM-DD).' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Data final do período no formato ISO (YYYY-MM-DD).' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 200, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  timelineLimit?: number;
}
