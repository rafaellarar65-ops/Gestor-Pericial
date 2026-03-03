import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailImapService } from './email-imap.service';
import { EmailImapConfigDto, EmailImapReplyDto, EmailImapSendDto } from './dto/communications.dto';

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications/email-imap')
export class EmailImapController {
  constructor(private readonly service: EmailImapService) {}

  @Post('config')
  @ApiOperation({ summary: 'Salvar configuração IMAP/SMTP' })
  saveConfig(@Body() dto: EmailImapConfigDto) {
    return this.service.saveConfig(dto);
  }

  @Get('inbox')
  listInbox(@Query('limit') limit?: string) {
    return this.service.listInbox(limit ? Number(limit) : undefined);
  }

  @Get('inbox/:uid')
  getByUid(@Param('uid', ParseIntPipe) uid: number) {
    return this.service.getEmailByUid(uid);
  }

  @Patch('inbox/:uid/read')
  markRead(@Param('uid', ParseIntPipe) uid: number) {
    return this.service.markAsRead(uid);
  }

  @Post('send')
  sendEmail(@Body() dto: EmailImapSendDto) {
    return this.service.sendEmail(dto);
  }

  @Post('reply/:uid')
  replyEmail(@Param('uid', ParseIntPipe) uid: number, @Body() dto: EmailImapReplyDto) {
    return this.service.replyEmail(uid, dto);
  }
}
