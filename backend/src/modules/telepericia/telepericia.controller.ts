import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AssignTelepericiaItemDto,
  CreateTeleSlotDto,
  CreateVirtualRoomDto,
  ReorderTelepericiaItemsDto,
  SecureUploadQrDto,
  SendRoomMessageDto,
  StartRealtimeSessionDto,
  UpdateTeleSlotDto,
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

  @Get('slots/:slotId')
  getSlot(@Param('slotId') slotId: string) {
    return this.service.getSlot(slotId);
  }

  @Patch('slots/:slotId')
  updateSlot(@Param('slotId') slotId: string, @Body() dto: UpdateTeleSlotDto) {
    return this.service.updateSlot(slotId, dto);
  }

  @Delete('slots/:slotId')
  deleteSlot(@Param('slotId') slotId: string) {
    return this.service.deleteSlot(slotId);
  }

  @Post('slots/:slotId/assign')
  assign(@Param('slotId') slotId: string, @Body() dto: AssignTelepericiaItemDto) {
    return this.service.assign(slotId, dto);
  }

  @Patch('slots/:slotId/reorder')
  reorder(@Param('slotId') slotId: string, @Body() dto: ReorderTelepericiaItemsDto) {
    return this.service.reorder(slotId, dto);
  }

  @Delete('slots/:slotId/items/:itemId')
  deleteItem(@Param('slotId') slotId: string, @Param('itemId') itemId: string) {
    return this.service.deleteItem(slotId, itemId);
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
