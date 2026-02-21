import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TelepericiaService } from './telepericia.service';
import { CreateTelepericiaDto, UpdateTelepericiaDto } from './dto/telepericia.dto';

@ApiTags('telepericia')
@ApiBearerAuth()
@Controller('telepericia')
export class TelepericiaController {
  constructor(private readonly service: TelepericiaService) {}

  @Post('slots')
  slots() { return { action: 'slots', module: 'telepericia' }; }
  @Post('booking')
  booking() { return { action: 'booking', module: 'telepericia' }; }
  @Post('whatsapp-contact')
  whatsapp_contact() { return { action: 'whatsapp-contact', module: 'telepericia' }; }
  @Post('upload-sessions')
  upload_sessions() { return { action: 'upload-sessions', module: 'telepericia' }; }

}
