import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BookTeleSlotDto,
  CreateTeleSlotDto,
  CreateVirtualRoomDto,
  SecureUploadQrDto,
  SendRoomMessageDto,
  StartRealtimeSessionDto,
  UploadSessionDto,
  WhatsappContactDto,
} from './dto/telepericia.dto';
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

  @Post('realtime/session')
  @ApiOperation({ summary: 'Inicia sessão de vídeo em tempo real (WebRTC signaling)' })
  startRealtimeSession(@Body() dto: StartRealtimeSessionDto) {
    return this.service.startRealtimeSession(dto);
  }

  @Post('virtual-room')
  @ApiOperation({ summary: 'Cria sala de perícia virtual com chat integrado' })
  createVirtualRoom(@Body() dto: CreateVirtualRoomDto) {
    return this.service.createVirtualRoom(dto);
  }

  @Post('virtual-room/message')
  sendRoomMessage(@Body() dto: SendRoomMessageDto) {
    return this.service.sendRoomMessage(dto);
  }

  @Post('secure-upload/qr')
  @ApiOperation({ summary: 'Gera QR Code de upload seguro mobile com notificação WhatsApp' })
  secureUploadQr(@Body() dto: SecureUploadQrDto) {
    return this.service.secureUploadQr(dto);
  }
}
