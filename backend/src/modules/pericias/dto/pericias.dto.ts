import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PericiaPaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class CreatePericiasDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  processoCNJ!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  varaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tipoPericiaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modalidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periciadoNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ enum: PericiaPaymentStatus })
  @IsOptional()
  @IsEnum(PericiaPaymentStatus)
  pagamentoStatus?: PericiaPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataNomeacao?: string;
}

export class UpdatePericiasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periciadoNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class ListPericiasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tipoPericiaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Busca textual livre em CNJ/periciado/observações' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class BatchUpdatePericiasDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ type: UpdatePericiasDto })
  @ValidateNested()
  @Type(() => UpdatePericiasDto)
  data!: UpdatePericiasDto;
}

export class ChangeStatusPericiaDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @IsUUID()
  statusId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class ImportPericiasDto {
  @ApiProperty({ type: [CreatePericiasDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePericiasDto)
  rows!: CreatePericiasDto[];
}
