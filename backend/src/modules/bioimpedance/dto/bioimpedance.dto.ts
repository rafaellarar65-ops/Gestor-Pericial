import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateBioimpedanceDto {
  @ApiProperty({ description: 'ID da perícia associada' })
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional({ description: 'Peso em kg' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  peso?: number;

  @ApiPropertyOptional({ description: 'Altura em m' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.5)
  @Type(() => Number)
  altura?: number;

  @ApiPropertyOptional({ description: 'IMC calculado' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  imc?: number;

  @ApiPropertyOptional({ description: 'Gordura corporal em %' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  gorduraCorporal?: number;

  @ApiPropertyOptional({ description: 'Massa magra em kg' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  massaMagra?: number;

  @ApiPropertyOptional({ description: 'Água corporal em %' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  aguaCorporal?: number;

  @ApiPropertyOptional({ description: 'Massa óssea em kg' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  massaOssea?: number;

  @ApiPropertyOptional({ description: 'Taxa metabólica basal em kcal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxaMetabolica?: number;

  @ApiPropertyOptional({ description: 'Idade corporal estimada' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  idadeCorporal?: number;

  @ApiPropertyOptional({ description: 'Metadados adicionais e campos legados' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
