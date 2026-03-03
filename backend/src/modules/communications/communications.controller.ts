import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import {
  AutomaticVaraChargeDto,
  BulkGrantOptInDto,
  BulkLinkInboundDto,
  BulkResendTemplateDto,
  CreateEmailTemplateDto,
  CreateLawyerDto,
  CreateMessageTemplateDto,
  GenerateHubEmailDto,
  InboxFilterDto,
  InboxUidParamDto,
  InterpretWhatsappInboundDto,
  PreviewTemplateDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  TEMPLATE_CHANNELS,
  UpdateMessageTemplateDto,
  UpdateWhatsappConsentDto,
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('send-email')
  @ApiOperation({ summary: 'Envia email via SMTP server-side' })
  @ApiBody({
    type: SendEmailDto,
    examples: {
      default: {
        summary: 'Exemplo de envio',
        value: {
          to: 'destinatario@exemplo.com',
          subject: 'Atualização da perícia',
          html: '<p>Olá, sua perícia foi agendada.</p>',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Email enfileirado para envio',
    schema: { example: { queued: true, to: 'destinatario@exemplo.com', subject: 'Atualização da perícia', html: '<p>Olá, sua perícia foi agendada.</p>' } },
  })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }

  @Post('email-send')
  @ApiOperation({ summary: '[DEPRECATED] Use POST /communications/send-email', deprecated: true })
  @ApiBody({ type: SendEmailDto })
  @ApiOkResponse({
    description: 'Compatibilidade legada para envio de email',
    schema: { example: { queued: true } },
  })
  emailSendLegacy(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }

  @Post('imap-sync')
  @ApiOperation({ summary: '[DEPRECATED] Sincroniza caixa IMAP legada', deprecated: true })
  @ApiOkResponse({
    description: 'Sincronização IMAP executada',
    schema: { example: { synced: true, fetched: 0 } },
  })
  imapSync() {
    return this.service.imapSync();
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('message-templates')
  createMessageTemplate(@Body() dto: CreateMessageTemplateDto) {
    return this.service.createMessageTemplate(dto);
  }

  @Get('message-templates')
  @ApiQuery({ name: 'channel', required: false, enum: TEMPLATE_CHANNELS })
  listMessageTemplates(
    @Query('channel') channel?: (typeof TEMPLATE_CHANNELS)[number],
  ) {
    return this.service.listMessageTemplates(channel as string | undefined);
  }

  @Patch('message-templates/:id')
  updateMessageTemplate(@Param('id') id: string, @Body() dto: UpdateMessageTemplateDto) {
    return this.service.updateMessageTemplate(id, dto);
  }

  @Delete('message-templates/:id')
  deleteMessageTemplate(@Param('id') id: string) {
    return this.service.deleteMessageTemplate(id);
  }

  @Post('templates/:id/preview')
  previewMessageTemplate(@Param('id') id: string, @Body() dto: PreviewTemplateDto) {
    return this.service.previewMessageTemplate(id, dto);
  }

  @Post('email-config')
  @ApiOperation({ summary: 'Configura integração de email Uolhost (IMAP/SMTP)' })
  @ApiBody({
    type: UpsertUolhostEmailConfigDto,
    examples: {
      default: {
        summary: 'Configuração de email',
        value: {
          fromEmail: 'contato@empresa.com.br',
          fromName: 'Gestor Pericial',
          smtpHost: 'smtps.uol.com.br',
          smtpPort: '587',
          imapHost: 'imaps.uol.com.br',
          imapPort: '993',
          login: 'contato@empresa.com.br',
          password: 'senhaSegura',
          secure: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Configuração persistida com sucesso',
    schema: { example: { id: '87f4f1ee-95c7-49f4-bad0-9e2f2676cc9b', provider: 'UOLHOST', active: true } },
  })
  emailConfig(@Body() dto: UpsertUolhostEmailConfigDto) {
    return this.service.upsertUolhostConfig(dto);
  }

  @Post('uolhost/config')
  @ApiOperation({ summary: '[DEPRECATED] Use POST /communications/email-config', deprecated: true })
  @ApiBody({ type: UpsertUolhostEmailConfigDto })
  @ApiOkResponse({ description: 'Compatibilidade legada para configuração Uolhost' })
  upsertUolhostConfig(@Body() dto: UpsertUolhostEmailConfigDto) {
    return this.service.upsertUolhostConfig(dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Lista inbox com filtro opcional' })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['nao_confirmados', 'pediram_reagendamento', 'falha_envio', 'optin_pendente', 'inbound_nao_vinculado'],
  })
  @ApiOkResponse({
    description: 'Itens da inbox retornados',
    schema: {
      example: [{ id: '8fe00bf0-b01d-4eaa-92c4-1f7b8fd2de67', entityType: 'email', action: 'received' }],
    },
  })
  listInbox(@Query() query: InboxFilterDto) {
    return this.service.listInbox(query);
  }

  @Get('inbox/:uid')
  @ApiOperation({ summary: 'Retorna detalhe de item da inbox por UID' })
  @ApiParam({
    name: 'uid',
    type: String,
    format: 'uuid',
    example: '8fe00bf0-b01d-4eaa-92c4-1f7b8fd2de67',
  })
  @ApiOkResponse({
    description: 'Detalhe do item encontrado',
    schema: {
      example: { id: '8fe00bf0-b01d-4eaa-92c4-1f7b8fd2de67', entityType: 'email', action: 'received', payloadJson: {} },
    },
  })
  getInboxByUid(@Param() params: InboxUidParamDto) {
    return this.service.getInboxByUid(params.uid);
  }

  @Post('inbox/actions/resend-template')
  resendTemplate(@Body() dto: BulkResendTemplateDto) {
    return this.service.bulkResendTemplate(dto);
  }

  @Post('inbox/actions/grant-optin')
  grantOptin(@Body() dto: BulkGrantOptInDto) {
    return this.service.bulkGrantOptIn(dto);
  }

  @Post('inbox/actions/link-inbound')
  linkInbound(@Body() dto: BulkLinkInboundDto) {
    return this.service.bulkLinkInbound(dto);
  }

  @Post('lawyers')
  createLawyer(@Body() dto: CreateLawyerDto) {
    return this.service.createLawyer(dto);
  }

  @Get('lawyers')
  listLawyers() {
    return this.service.listLawyers();
  }

  @Post('hub-generate')
  hubGenerate(@Body() dto: GenerateHubEmailDto) {
    return this.service.hubGenerate(dto);
  }

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Dispara mensagem via WhatsApp API com regras de consentimento e janela de atendimento' })
  sendWhatsappMessage(@Body() dto: SendWhatsappMessageDto) {
    return this.service.sendWhatsappMessage(dto);
  }

  @Post('whatsapp/inbound/interpret')
  @ApiOperation({ summary: 'Interpreta inbound de WhatsApp (1/2/outros) para confirmação, reagendamento ou triagem' })
  interpretWhatsappInbound(@Body() dto: InterpretWhatsappInboundDto) {
    return this.service.interpretWhatsappInbound(dto);
  }

  @Get('whatsapp/messages')
  @ApiOperation({ summary: 'Visualiza mensagens WhatsApp na tela' })
  listWhatsappMessages(@Query('periciaId') periciaId?: string) {
    return this.service.listWhatsappMessages(periciaId);
  }

  @Post('automatic-vinculo-vara-charge')
  @ApiOperation({ summary: 'Aciona cobrança consolidada de perícias pendentes por vara' })
  automaticVaraCharge(@Body() dto: AutomaticVaraChargeDto) {
    return this.service.automaticVaraCharge(dto);
  }
}

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('contacts/:id/consent')
  @ApiOperation({ summary: 'Atualiza consentimento manual (grant/deny) de contato no WhatsApp' })
  updateContactConsent(@Param('id') id: string, @Body() dto: UpdateWhatsappConsentDto) {
    return this.service.updateContactConsent(id, dto);
  }
}
