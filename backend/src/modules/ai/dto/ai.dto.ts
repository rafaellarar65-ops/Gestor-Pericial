import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyzeDocumentDto {
  @ApiProperty({ example: 'documento.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'base64-encoded-content' })
  @IsString()
  @IsNotEmpty()
  fileBase64!: string;
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

export class LaudoAssistDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  context!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}
