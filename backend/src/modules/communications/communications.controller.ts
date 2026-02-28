import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  PreviewTemplateDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  UpdateMessageTemplateDto,
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('email-send')
  @ApiOperation({ summary: 'Envia email via SMTP server-side' })
  emailSend(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }

  @Post('imap-sync')
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
  listMessageTemplates(@Query('channel') channel?: 'whatsapp_template' | 'whatsapp_freeform' | 'clipboard' | 'wa_me_prefill') {
    return this.service.listMessageTemplates(channel);
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

  @Get('inbox')
  listInbox(@Query() query: InboxFilterDto) {
    return this.service.listInbox(query);
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

  @Post('uolhost/config')
  @ApiOperation({ summary: 'Configura integração de email Uolhost (IMAP/SMTP)' })
  upsertUolhostConfig(@Body() dto: UpsertUolhostEmailConfigDto) {
    return this.service.upsertUolhostConfig(dto);
  }

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Dispara mensagem via WhatsApp API' })
  sendWhatsappMessage(@Body() dto: SendWhatsappMessageDto) {
    return this.service.sendWhatsappMessage(dto);
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
