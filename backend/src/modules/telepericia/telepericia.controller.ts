import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookTeleSlotDto, CreateTeleSlotDto, UploadSessionDto, WhatsappContactDto } from './dto/telepericia.dto';
import { TelepericiaService } from './telepericia.service';

@ApiTags('telepericia')
@ApiBearerAuth()
@Controller('telepericia')
export class TelepericiaController {
  constructor(private readonly service: TelepericiaService) {}

  @Post('slots')
  createSlot(@Body() dto: CreateTeleSlotDto) {
    return this.service.createSlot(dto);
  }

  @Get('slots')
  listSlots() {
    return this.service.listSlots();
  }

  @Post('booking')
  booking(@Body() dto: BookTeleSlotDto) {
    return this.service.booking(dto);
  }

  @Post('whatsapp-contact')
  @ApiOperation({ summary: 'Gera link WhatsApp de contato para slot/perícia' })
  whatsappContact(@Body() dto: WhatsappContactDto) {
    return this.service.whatsappContact(dto);
  }

  @Post('upload-sessions')
  uploadSessions(@Body() dto: UploadSessionDto) {
    return this.service.uploadSessions(dto);
  }
}
