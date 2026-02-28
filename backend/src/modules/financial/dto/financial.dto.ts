import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FontePagamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBase64,
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

export class FinancialImportAiPrintItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  bruto?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  desconto?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  liquido?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class FinancialImportAiPrintResponseDto {
  @ApiProperty({
    type: Object,
    example: {
      totalBruto: 5000,
      totalLiquido: 4700,
      totalImpostos: 300,
      dataPagamento: '2026-01-15',
      detectedSource: 'TJ',
    },
  })
  global!: {
    totalBruto?: number | string;
    totalLiquido?: number | string;
    totalImpostos?: number | string;
    dataPagamento?: string;
    detectedSource?: string;
  };

  @ApiProperty({ type: [FinancialImportAiPrintItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancialImportAiPrintItemDto)
  items!: FinancialImportAiPrintItemDto[];
}

export class ImportAiPrintDto {
  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty()
  @IsBase64()
  contentBase64!: string;
}
