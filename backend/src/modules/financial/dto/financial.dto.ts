import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FontePagamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export enum FinancialImportSource {
  AI_PRINT = 'AI_PRINT',
  MANUAL_CSV = 'MANUAL_CSV',
  INDIVIDUAL = 'INDIVIDUAL',
}

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

export class ImportRecebimentoItemDto {
  @ApiProperty()
  @IsString()
  processoCNJ!: string;

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
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  imposto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;
}

export class ImportRecebimentosDto {
  @ApiProperty({ type: [ImportRecebimentoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRecebimentoItemDto)
  rows!: ImportRecebimentoItemDto[];

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
