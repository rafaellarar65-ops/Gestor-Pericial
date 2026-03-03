import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePreLaudoDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  sections?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateName?: string;
}

export class UpdateSectionsDto {
  @ApiProperty()
  @IsUUID()
  preLaudoId!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  sections!: Record<string, unknown>;
}

export class CreateExamPlanDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateExamPerformedDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  examPlanId?: string;

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  findings?: Record<string, unknown>;
}

export class TranscriptionDto {
  @ApiProperty()
  @IsUUID()
  examPerformedId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  audioBase64!: string;
}

export class ExportPdfDto {
  @ApiProperty()
  @IsUUID()
  preLaudoId!: string;
}

export class CoherenceCheckDto {
  @ApiProperty()
  @IsUUID()
  preLaudoId!: string;
}
