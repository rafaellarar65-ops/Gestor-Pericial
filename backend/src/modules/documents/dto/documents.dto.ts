import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSize?: number;
}

export class SignedUrlDto {
  @ApiProperty()
  @IsUUID()
  documentId!: string;

  @ApiPropertyOptional({ default: 3600 })
  @IsOptional()
  @IsInt()
  @Min(60)
  expiresInSeconds = 3600;
}

export class CategorizeDocumentDto {
  @ApiProperty()
  @IsUUID()
  documentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoria!: string;
}

export class LinkPericiaDocumentDto {
  @ApiProperty()
  @IsUUID()
  documentId!: string;

  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}
