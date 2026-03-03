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

export class UpdateUnmatchedPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: ['AI_PRINT', 'MANUAL_CSV', 'INDIVIDUAL'] })
  @IsOptional()
  @IsEnum(['AI_PRINT', 'MANUAL_CSV', 'INDIVIDUAL'])
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
