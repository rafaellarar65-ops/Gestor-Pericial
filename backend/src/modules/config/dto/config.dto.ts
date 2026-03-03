import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const CONFIG_RESOURCES = ['cidades', 'varas', 'tipos-pericia', 'modalidades', 'status', 'locais', 'tribunais'] as const;
export type ConfigResource = (typeof CONFIG_RESOURCES)[number];

export class ConfigResourceParamDto {
  @ApiProperty({ enum: CONFIG_RESOURCES })
  @IsIn(CONFIG_RESOURCES)
  resource!: ConfigResource;
}

export class CreateConfigDomainDto {
  @ApiProperty({ example: 'Código interno do item' })
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @ApiProperty({ example: 'Nome do item' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tribunalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateConfigDomainDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;
}
