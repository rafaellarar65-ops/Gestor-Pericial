import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty()
  @IsString()
  bodyHtml!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class SendEmailDto {
  @ApiProperty()
  @IsString()
  to!: string;

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiProperty()
  @IsString()
  html!: string;
}

export class CreateLawyerDto {
  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oab?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;
}

export class GenerateHubEmailDto {
  @ApiProperty()
  @IsString()
  templateKey!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  context?: Record<string, string>;
}

export class UpsertUolhostEmailConfigDto {
  @ApiProperty()
  @IsString()
  fromEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiProperty()
  @IsString()
  smtpHost!: string;

  @ApiProperty()
  @IsString()
  smtpPort!: string;

  @ApiProperty()
  @IsString()
  imapHost!: string;

  @ApiProperty()
  @IsString()
  imapPort!: string;

  @ApiProperty()
  @IsString()
  login!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}

export class SendWhatsappMessageDto {
  @ApiProperty()
  @IsString()
  to!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class AutomaticVaraChargeDto {
  @ApiProperty()
  @IsUUID()
  varaId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsUUID('4', { each: true })
  periciaIds?: string[];
}
