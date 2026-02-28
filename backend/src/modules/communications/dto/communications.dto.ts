import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @ApiPropertyOptional({ enum: ['template', 'freeform'], default: 'freeform' })
  @IsOptional()
  @IsIn(['template', 'freeform'])
  messageType?: 'template' | 'freeform';

  @ApiPropertyOptional({ enum: ['granted', 'denied', 'unknown'], default: 'unknown' })
  @IsOptional()
  @IsIn(['granted', 'denied', 'unknown'])
  consentStatus?: 'granted' | 'denied' | 'unknown';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAutomation?: boolean;

  @ApiPropertyOptional({ description: 'Última data/hora de inbound do contato (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastInboundAt?: string;

  @ApiPropertyOptional({ description: 'Identificador do contato de WhatsApp para exceções de consentimento.' })
  @IsOptional()
  @IsString()
  contactId?: string;
}

export class UpdateWhatsappConsentDto {
  @ApiProperty({ enum: ['granted', 'denied'] })
  @IsIn(['granted', 'denied'])
  consentStatus!: 'granted' | 'denied';
}


export class InterpretWhatsappInboundDto {
  @ApiProperty()
  @IsString()
  contactId!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasLinkedInboxItem?: boolean;
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
