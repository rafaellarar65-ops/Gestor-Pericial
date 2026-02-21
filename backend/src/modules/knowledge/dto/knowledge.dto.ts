import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class UpdateKnowledgeDto extends CreateKnowledgeDto {}
