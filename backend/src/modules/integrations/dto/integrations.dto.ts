import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveIntegrationSettingsDto {
  @ApiProperty({ example: 'DATAJUD' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class DatajudCnjDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cnj!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class DatajudSyncDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}

export class SisperjudConsultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query!: string;
}

export class TjmgUtilsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cnj!: string;
}
