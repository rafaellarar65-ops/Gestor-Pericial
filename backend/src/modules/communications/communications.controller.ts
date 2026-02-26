import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import {
  AutomaticVaraChargeDto,
  CreateEmailTemplateDto,
  CreateLawyerDto,
  GenerateHubEmailDto,
  SendEmailDto,
  SendWhatsappMessageDto,
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
