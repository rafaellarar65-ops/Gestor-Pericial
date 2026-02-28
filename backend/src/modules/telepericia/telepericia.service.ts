import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappSchedulerService } from '../communications/whatsapp.scheduler.service';
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

@Injectable()
export class TelepericiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappScheduler: WhatsappSchedulerService,
  ) {}

  async createSlot(dto: CreateTeleSlotDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const startsAt = this.buildBaseDate(new Date(dto.date), dto.startTime);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    const slot = await this.prisma.telepericiaSlot.create({
      data: {
        tenantId,
        startsAt,
        endsAt,
        capacity: dto.capacity ?? this.computeAvailableCapacity(dto.durationMinutes, dto.appointmentDurationMinutes, dto.gapMinutes ?? 0),
        metadata: {
          slotType: dto.slotType,
          appointmentDurationMinutes: dto.appointmentDurationMinutes,
          gapMinutes: dto.gapMinutes ?? 0,
          timezone: dto.timezone ?? 'America/Sao_Paulo',
        },
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    return this.toSlotResponse(slot);
  }

  async listSlots() {
    const slots = await this.prisma.telepericiaSlot.findMany({
      include: { items: { orderBy: { orderIndex: 'asc' } } },
      orderBy: [{ startsAt: 'asc' }],
    });
    return slots.map((slot) => this.toSlotResponse(slot));
  }

  async getSlot(slotId: string) {
    const slot = await this.ensureSlot(slotId);
    return this.toSlotResponse(slot);
  }

  async updateSlot(slotId: string, dto: UpdateTeleSlotDto) {
    const slot = await this.ensureSlot(slotId);
    const startsAt = this.buildBaseDate(new Date(dto.date), dto.startTime);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    const currentCount = slot.items.length;
    const nextCapacity = dto.capacity ?? this.computeAvailableCapacity(dto.durationMinutes, dto.appointmentDurationMinutes, dto.gapMinutes ?? 0);
    if (currentCount > nextCapacity) {
      throw new BadRequestException('Capacidade não pode ser menor que a quantidade de perícias atribuídas.');
    }

    const updated = await this.prisma.telepericiaSlot.update({
      where: { id: slotId },
      data: {
        startsAt,
        endsAt,
        capacity: nextCapacity,
        metadata: {
          slotType: dto.slotType,
          appointmentDurationMinutes: dto.appointmentDurationMinutes,
          gapMinutes: dto.gapMinutes ?? 0,
          timezone: dto.timezone ?? 'America/Sao_Paulo',
        },
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    await this.syncPericiasForSlot(updated.id);
    return this.toSlotResponse(updated);
  }

  deleteSlot(slotId: string) {
    return this.prisma.telepericiaSlot.delete({ where: { id: slotId } });
  }

  async assign(slotId: string, dto: AssignTelepericiaItemDto) {
    const slot = await this.ensureSlot(slotId);
    const [pericia, currentItems] = await Promise.all([
      this.prisma.pericia.findFirst({ where: { id: dto.periciaId, tenantId: slot.tenantId } }),
      this.prisma.telepericiaSlotItem.findMany({ where: { slotId }, orderBy: { orderIndex: 'asc' } }),
    ]);

    if (!pericia) throw new NotFoundException('Perícia não encontrada.');
    if (currentItems.some((item) => item.periciaId === dto.periciaId)) {
      throw new BadRequestException('Perícia já atribuída a este slot.');
    }
    if (currentItems.length >= slot.capacity) {
      throw new BadRequestException('Capacidade do slot atingida para atribuições.');
    }

    await this.prisma.telepericiaSlotItem.create({
      data: {
        tenantId: slot.tenantId,
        slotId,
        periciaId: dto.periciaId,
        orderIndex: currentItems.length,
      },
    });

    await this.syncPericiasForSlot(slotId);
    return this.getSlot(slotId);
  }

  async reorder(slotId: string, dto: ReorderTelepericiaItemsDto) {
    await this.ensureSlot(slotId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.telepericiaSlotItem.update({
          where: { id: item.itemId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    await this.syncPericiasForSlot(slotId);
    return this.getSlot(slotId);
  }

  async deleteItem(slotId: string, itemId: string) {
    await this.ensureSlot(slotId);
    await this.prisma.telepericiaSlotItem.delete({ where: { id: itemId } });
    await this.syncPericiasForSlot(slotId);
    return this.getSlot(slotId);
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
    return {
      slotId: slot.id,
      provider: 'webrtc-signaling',
      roomName,
      sessionId: randomUUID(),
      wsUrl: `wss://telepericia.fake.local/webrtc/${roomName}`,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      token: randomUUID(),
    };
  }

  async createVirtualRoom(dto: CreateVirtualRoomDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const title = dto.title ?? `Sala de Perícia ${slot.startsAt.toISOString()}`;
    return { slotId: slot.id, title, chatEnabled: true, participants: ['perito', 'periciado'], roomId: randomUUID() };
  }

  async sendRoomMessage(dto: SendRoomMessageDto) {
    const slot = await this.ensureSlot(dto.slotId);
    return { slotId: slot.id, sender: dto.sender, message: dto.message, sentAt: new Date().toISOString(), messageId: randomUUID() };
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

  private async syncPericiasForSlot(slotId: string) {
    const slot = await this.prisma.telepericiaSlot.findFirst({ where: { id: slotId }, include: { items: { orderBy: { orderIndex: 'asc' } } } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');

    await this.prisma.$transaction(
      slot.items
        .filter((item) => !!item.periciaId)
        .map((item) => {
          const schedule = this.computeItemSchedule(slot.startsAt, this.getMeta(slot, 'appointmentDurationMinutes', 30), this.getMeta(slot, 'gapMinutes', 0), item.orderIndex);
          return this.prisma.pericia.update({
            where: { id: item.periciaId! },
            data: { dataAgendamento: schedule.startAt, horaAgendamento: this.toHHmm(schedule.startAt), agendada: true },
          });
        }),
    );

    const firstItem = slot.items.find((item) => !!item.periciaId);
    if (firstItem?.periciaId) {
      await this.whatsappScheduler.syncPericiaJobs({
        tenantId: slot.tenantId,
        periciaId: firstItem.periciaId,
        scheduledAt: slot.startsAt,
        shouldSchedule: true,
      });
    }
  }

  private toSlotResponse(slot: { startsAt: Date; endsAt: Date; metadata: unknown; items: Array<{ orderIndex: number }>; [key: string]: unknown }) {
    const appointmentDurationMinutes = this.getMeta(slot, 'appointmentDurationMinutes', 30);
    const gapMinutes = this.getMeta(slot, 'gapMinutes', 0);
    return {
      ...slot,
      items: slot.items.map((item) => ({
        ...item,
        ...this.computeItemSchedule(slot.startsAt, appointmentDurationMinutes, gapMinutes, item.orderIndex),
      })),
    };
  }

  private computeItemSchedule(startsAt: Date, appointmentDurationMinutes: number, gapMinutes: number, orderIndex: number) {
    const offsetMinutes = orderIndex * (appointmentDurationMinutes + gapMinutes);
    const startAt = new Date(startsAt.getTime() + offsetMinutes * 60_000);
    const endAt = new Date(startAt.getTime() + appointmentDurationMinutes * 60_000);
    return { startAt, endAt };
  }

  private buildBaseDate(date: Date, startTime: string) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const base = new Date(date);
    base.setUTCHours(hours, minutes, 0, 0);
    return base;
  }

  private computeAvailableCapacity(durationMinutes: number, appointmentDurationMinutes: number, gapMinutes: number) {
    const step = appointmentDurationMinutes + gapMinutes;
    if (step <= 0) return 0;
    return Math.floor((durationMinutes + gapMinutes) / step);
  }

  private toHHmm(date: Date) {
    return date.toISOString().slice(11, 16);
  }

  private getMeta(slot: { metadata: unknown }, key: string, fallback: number) {
    const metadata = (slot.metadata ?? {}) as Record<string, unknown>;
    const value = metadata[key];
    return typeof value === 'number' ? value : fallback;
  }

  private async ensureSlot(id: string) {
    const slot = await this.prisma.telepericiaSlot.findFirst({ where: { id }, include: { items: { orderBy: { orderIndex: 'asc' } } } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');
    return slot;
  }
}
