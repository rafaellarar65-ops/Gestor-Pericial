import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FontePagamento, PaymentMatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
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

export class UpdateRecebimentoDto {
  @ApiPropertyOptional({ enum: FontePagamento })
  @IsOptional()
  @IsEnum(FontePagamento)
  origem?: FontePagamento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataRecebimento?: string;

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

export class BulkDeleteRecebimentosDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
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

export class ImportAiPrintDto {
  @ApiProperty({ description: 'Texto bruto extraído por OCR/IA.' })
  @IsString()
  content!: string;
}

export class FinancialImportAiPrintResponseDto {
  @ApiProperty()
  global!: {
    totalBruto: number;
    totalLiquido: number;
    totalImpostos: number;
    dataPagamento: string;
  };

  @ApiProperty({ type: [Object] })
  items!: Array<Record<string, unknown>>;
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

export class LinkPaymentToPericiaDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}

export class ReconcileDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  unmatchedIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: [PaymentMatchStatus.LINKED] })
  @IsOptional()
  @IsIn([PaymentMatchStatus.LINKED])
  status?: PaymentMatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedPericiaId?: string;
}

export class LinkUnmatchedPaymentDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Quando true, cria um Recebimento associado em vez de apenas transação bancária.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createRecebimento?: boolean;
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

  @ApiPropertyOptional({ enum: ['AI_PRINT', 'MANUAL_CSV', 'OFX_IMPORT', 'INDIVIDUAL'] })
  @IsOptional()
  @IsIn(['AI_PRINT', 'MANUAL_CSV', 'OFX_IMPORT', 'INDIVIDUAL'])
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'OFX_IMPORT' | 'INDIVIDUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportAiPrintDto {
  @ApiProperty({ description: 'Texto bruto extraído do print financeiro para processamento por IA.' })
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceLabel?: string;
}

export class FinancialImportAiPrintGlobalDto {
  @ApiProperty()
  totalBruto!: number;

  @ApiProperty()
  totalLiquido!: number;

  @ApiProperty()
  totalImpostos!: number;

  @ApiProperty({ description: 'Data de pagamento no formato YYYY-MM-DD' })
  dataPagamento!: string;
}

export class FinancialImportAiPrintItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processoCNJ?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorBruto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorLiquido?: number;
}

export class FinancialImportAiPrintResponseDto {
  @ApiProperty({ type: FinancialImportAiPrintGlobalDto })
  global!: FinancialImportAiPrintGlobalDto;

  @ApiProperty({ type: [FinancialImportAiPrintItemDto] })
  items!: FinancialImportAiPrintItemDto[];
}

export class SplitUnmatchedInstallmentDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SplitUnmatchedPaymentDto {
  @ApiProperty({ type: [SplitUnmatchedInstallmentDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SplitUnmatchedInstallmentDto)
  installments!: SplitUnmatchedInstallmentDto[];
}

export class ImportUnmatchedTransactionDto {
  @ApiProperty({ description: 'Valor monetário bruto da transação', oneOf: [{ type: 'number' }, { type: 'string' }] })
  @IsDefined()
  amount!: number | string;

  @ApiPropertyOptional({ description: 'Data da transação no banco' })
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Data de recebimento quando não houver transactionDate' })
  @IsOptional()
  @IsString()
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
  @IsIn(['AI_PRINT', 'MANUAL_CSV', 'INDIVIDUAL'])
  origin?: 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL';
}

export class ImportUnmatchedTransactionsDto {
  @ApiProperty({ type: [ImportUnmatchedTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportUnmatchedTransactionDto)
  rows!: ImportUnmatchedTransactionDto[];
}

export class SplitInstallmentDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SplitUnmatchedPaymentDto {
  @ApiProperty({ type: [SplitInstallmentDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SplitInstallmentDto)
  installments!: SplitInstallmentDto[];
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
