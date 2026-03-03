import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReprocessPericiaDto {
  @ApiProperty({ description: 'Texto atualizado do exame físico digitado pelo perito' })
  @IsString()
  @IsNotEmpty()
  exameFisicoTexto!: string;

  @ApiPropertyOptional({ type: [String], description: 'Imagens (base64/data URL) anexadas na Viagem 2' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagensBase64?: string[];
}

export class GenerateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomePericiado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exameFisico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discussao?: string;
}

export class SaveTemplateDto {
  @ApiProperty({ description: 'Caminho/URL já persistido em storage externo' })
  @IsString()
  @IsNotEmpty()
  templateDocxPath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateName?: string;
}

export class AutocompleteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campo!: 'exameFisico' | 'discussao';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  textoAtual!: string;

  @ApiPropertyOptional({ description: 'Contexto serializado do processo/pré-laudo' })
  @IsOptional()
  contexto?: Record<string, unknown>;
}
