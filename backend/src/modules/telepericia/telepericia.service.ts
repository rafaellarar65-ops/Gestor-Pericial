import { Injectable, NotFoundException } from '@nestjs/common';
import { TeleSlotStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class TelepericiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  createSlot(dto: CreateTeleSlotDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.teleSlot.create({
      data: {
        tenantId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? TeleSlotStatus.AVAILABLE,
        ...(dto.platform ? { platform: dto.platform } : {}),
      },
    });
  }

  listSlots() {
    return this.prisma.teleSlot.findMany({ orderBy: { startAt: 'asc' } });
  }

  async booking(dto: BookTeleSlotDto) {
    await this.ensureSlot(dto.slotId);
    return this.prisma.teleSlot.update({
      where: { id: dto.slotId },
      data: { periciaId: dto.periciaId, ...(dto.meetingUrl ? { meetingUrl: dto.meetingUrl } : {}), status: TeleSlotStatus.BOOKED },
    });
  }

  async whatsappContact(dto: WhatsappContactDto) {
    const slot = await this.ensureSlot(dto.slotId);
    return { slotId: slot.id, phone: dto.phone, whatsappLink: `https://wa.me/${dto.phone.replace(/\D/g, '')}` };
  }

  async uploadSessions(dto: UploadSessionDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000).toISOString();

    return { slotId: slot.id, qrCodeToken: randomUUID(), publicUrl: `https://telepericia.fake.local/session/${slot.id}`, expiresAt };
  }

  async startRealtimeSession(dto: StartRealtimeSessionDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const roomName = dto.roomName ?? `telepericia-${slot.id}`;
    const sessionId = randomUUID();

    return {
      slotId: slot.id,
      provider: 'webrtc-signaling',
      roomName,
      sessionId,
      wsUrl: `wss://telepericia.fake.local/webrtc/${roomName}`,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      token: randomUUID(),
    };
  }

  async createVirtualRoom(dto: CreateVirtualRoomDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const title = dto.title ?? `Sala de Perícia ${slot.startAt.toISOString()}`;

    return {
      slotId: slot.id,
      title,
      chatEnabled: true,
      participants: ['perito', 'periciado'],
      roomId: randomUUID(),
    };
  }

  async sendRoomMessage(dto: SendRoomMessageDto) {
    const slot = await this.ensureSlot(dto.slotId);
    return {
      slotId: slot.id,
      sender: dto.sender,
      message: dto.message,
      sentAt: new Date().toISOString(),
      messageId: randomUUID(),
    };
  }

  async secureUploadQr(dto: SecureUploadQrDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const uploadToken = randomUUID();
    const uploadUrl = `https://telepericia.fake.local/mobile-upload/${uploadToken}`;

    return {
      slotId: slot.id,
      periciaId: dto.periciaId,
      uploadToken,
      qrCodePayload: uploadUrl,
      uploadUrl,
      accepted: ['image/jpeg', 'image/png', 'application/pdf'],
      expiresAt,
      whatsappNotification:
        dto.notifyPhone && dto.notifyPhone.trim().length > 0
          ? { enqueued: true, to: dto.notifyPhone, link: `https://wa.me/${dto.notifyPhone.replace(/\D/g, '')}?text=${encodeURIComponent(uploadUrl)}` }
          : { enqueued: false },
    };
  }

  private async ensureSlot(id: string) {
    const slot = await this.prisma.teleSlot.findFirst({ where: { id } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');
    return slot;
  }
}
