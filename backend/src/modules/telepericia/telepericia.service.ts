import { Injectable, NotFoundException } from '@nestjs/common';
import { TeleSlotStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookTeleSlotDto, CreateTeleSlotDto, UploadSessionDto, WhatsappContactDto } from './dto/telepericia.dto';

@Injectable()
export class TelepericiaService {
  constructor(private readonly prisma: PrismaService) {}

  createSlot(dto: CreateTeleSlotDto) {
    return this.prisma.teleSlot.create({
      data: {
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? TeleSlotStatus.AVAILABLE,
        platform: dto.platform,
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
      data: {
        periciaId: dto.periciaId,
        meetingUrl: dto.meetingUrl,
        status: TeleSlotStatus.BOOKED,
      },
    });
  }

  async whatsappContact(dto: WhatsappContactDto) {
    const slot = await this.ensureSlot(dto.slotId);
    return {
      slotId: slot.id,
      phone: dto.phone,
      whatsappLink: `https://wa.me/${dto.phone.replace(/\D/g, '')}`,
    };
  }

  async uploadSessions(dto: UploadSessionDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000).toISOString();

    return {
      slotId: slot.id,
      qrCodeToken: randomUUID(),
      publicUrl: `https://telepericia.fake.local/session/${slot.id}`,
      expiresAt,
    };
  }

  private async ensureSlot(id: string) {
    const slot = await this.prisma.teleSlot.findFirst({ where: { id } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');
    return slot;
  }
}
