import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CreateEmailTemplateDto, CreateLawyerDto, GenerateHubEmailDto, SendEmailDto } from './dto/communications.dto';

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
}
