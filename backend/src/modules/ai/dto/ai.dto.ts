import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

const tiposPericia = ['previdenciaria', 'acidentaria', 'civel', 'trabalhista', 'securitaria', 'administrativa', 'outra'] as const;
const taskTypes = ['master-analysis', 'specific-analysis', 'laudo-assistant', 'batch-action', 'coherence-check'] as const;

export class AnalyzeDocumentDto {
  @ApiProperty({ example: 'documento.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'base64-encoded-content' })
  @IsString()
  @IsNotEmpty()
  fileBase64!: string;

  @ApiPropertyOptional({ example: 'previdenciária' })
  @IsString()
  @IsOptional()
  tipoAcaoEstimado?: string;
}

export class BatchActionItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class BatchActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  instruction!: string;

  @ApiProperty({ type: [BatchActionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchActionItemDto)
  items!: BatchActionItemDto[];
}

export class ExamPerformedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sistema!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  achado!: string;

  @ApiPropertyOptional({ enum: ['direita', 'esquerda', 'bilateral', 'nao_aplicavel'] })
  @IsOptional()
  @IsIn(['direita', 'esquerda', 'bilateral', 'nao_aplicavel'])
  lateralidade?: 'direita' | 'esquerda' | 'bilateral' | 'nao_aplicavel';

  @ApiPropertyOptional({ enum: ['leve', 'moderada', 'grave', 'nao_aplicavel'] })
  @IsOptional()
  @IsIn(['leve', 'moderada', 'grave', 'nao_aplicavel'])
  intensidade?: 'leve' | 'moderada' | 'grave' | 'nao_aplicavel';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class LaudoAssistDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section!: string;

  @ApiProperty({ enum: tiposPericia })
  @IsIn(tiposPericia)
  tipoPericia!: (typeof tiposPericia)[number];

  @ApiProperty({ type: [ExamPerformedDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamPerformedDto)
  examPerformed!: ExamPerformedDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  protocolos?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  quesitos?: string[];
}

export class SpecificAnalysisDto {
  @ApiProperty({ enum: tiposPericia })
  @IsIn(tiposPericia)
  tipoPericia!: (typeof tiposPericia)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resumoCaso!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  evidencias!: string[];
}

export class CoherenceCheckDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  alegacoesClinicas!: string[];

  @ApiProperty({ type: [ExamPerformedDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamPerformedDto)
  achadosExame!: ExamPerformedDto[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contextoDocumental!: string;
}

export class ProcessAiOutputDto {
  @ApiProperty({ enum: taskTypes })
  @IsIn(taskTypes)
  task!: (typeof taskTypes)[number];

  @ApiProperty({ description: 'Resposta bruta do modelo (JSON em string ou objeto)' })
  rawResponse!: unknown;

  @ApiPropertyOptional({ description: 'Trechos originais dos documentos para verificação anti-alucinação', type: [String] })
  @IsArray()
  @IsOptional()
  sourceFragments?: string[];
}
