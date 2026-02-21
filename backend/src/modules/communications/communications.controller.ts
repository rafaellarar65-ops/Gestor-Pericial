import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CreateCommunicationsDto, UpdateCommunicationsDto } from './dto/communications.dto';

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('email-send')
  email_send() { return { action: 'email-send', module: 'communications' }; }
  @Post('imap-sync')
  imap_sync() { return { action: 'imap-sync', module: 'communications' }; }
  @Post('templates')
  templates() { return { action: 'templates', module: 'communications' }; }
  @Post('lawyers')
  lawyers() { return { action: 'lawyers', module: 'communications' }; }
  @Post('hub-generate')
  hub_generate() { return { action: 'hub-generate', module: 'communications' }; }

}
