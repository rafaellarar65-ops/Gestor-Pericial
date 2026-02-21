import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateKnowledgeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SearchKnowledgeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class CategorizeKnowledgeDto {
  @ApiProperty()
  @IsString()
  itemId!: string;

  @ApiProperty()
  @IsString()
  category!: string;
}
