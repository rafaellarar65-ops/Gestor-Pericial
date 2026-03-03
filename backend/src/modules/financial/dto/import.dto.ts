import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export const IMPORT_SOURCE_TYPES = ['TJ', 'AJG', 'PARTES'] as const;
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export class ImportCsvDto {
  @ApiProperty({ description: 'Conteúdo completo do CSV em texto' })
  @IsString()
  csvContent!: string;

  @ApiProperty({ enum: IMPORT_SOURCE_TYPES })
  @IsEnum(IMPORT_SOURCE_TYPES)
  sourceType!: ImportSourceType;

  @ApiPropertyOptional({ description: 'Nome amigável da fonte (ex: TJMG, AJG RS)' })
  @IsOptional()
  @IsString()
  sourceLabel?: string;
}

export class LinkUnmatchedPaymentDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}
