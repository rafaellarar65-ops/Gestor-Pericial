import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ArrayNotEmpty,
} from 'class-validator';

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

export const TEMPLATE_CHANNELS = ['whatsapp_template', 'whatsapp_freeform', 'clipboard', 'wa_me_prefill'] as const;

export class CreateMessageTemplateDto {
  @ApiProperty({ enum: TEMPLATE_CHANNELS })
  @IsString()
  @IsIn(TEMPLATE_CHANNELS)
  channel!: (typeof TEMPLATE_CHANNELS)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placeholdersUsed?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  variablesMapping?: Record<string, string>;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ enum: TEMPLATE_CHANNELS })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_CHANNELS)
  channel?: (typeof TEMPLATE_CHANNELS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placeholdersUsed?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  variablesMapping?: Record<string, string>;
}

export class PreviewTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export const INBOX_FILTERS = [
  'nao_confirmados',
  'pediram_reagendamento',
  'falha_envio',
  'optin_pendente',
  'inbound_nao_vinculado',
] as const;

export class InboxFilterDto {
  @ApiPropertyOptional({ enum: INBOX_FILTERS })
  @IsOptional()
  @IsString()
  @IsIn(INBOX_FILTERS)
  filter?: (typeof INBOX_FILTERS)[number];
}

export class BulkResendTemplateDto {
  @ApiProperty({ type: [String] })
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  messageIds!: string[];

  @ApiProperty()
  @IsUUID()
  templateId!: string;
}

export class BulkGrantOptInDto {
  @ApiProperty({ type: [String] })
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  messageIds!: string[];
}

export class BulkLinkInboundDto {
  @ApiProperty({ type: [String] })
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  messageIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  processoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}
