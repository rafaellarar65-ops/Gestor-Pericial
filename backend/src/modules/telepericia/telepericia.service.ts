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
    const slot = await this.prisma.teleSlot.create({
      data: {
        tenantId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        slotType: dto.slotType,
        appointmentDurationMinutes: dto.appointmentDurationMinutes,
        gapMinutes: dto.gapMinutes ?? 0,
        capacity: dto.capacity ?? this.computeAvailableCapacity(dto.durationMinutes, dto.appointmentDurationMinutes, dto.gapMinutes ?? 0),
        timezone: dto.timezone ?? 'America/Sao_Paulo',
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async listSlots() {
    const slots = await this.prisma.telepericiaSlot.findMany({ include: { items: { orderBy: { orderIndex: 'asc' } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
    return slots.map((slot) => this.toSlotResponse(slot));
  }

  async getSlot(slotId: string) {
    const slot = await this.ensureSlot(slotId);
    return this.toSlotResponse(slot);
  }

  async updateSlot(slotId: string, dto: UpdateTeleSlotDto) {
    await this.ensureSlot(slotId);
    this.validateSlotDurations(dto.durationMinutes, dto.appointmentDurationMinutes);
    this.validateCapacity(dto.capacity, dto.durationMinutes, dto.appointmentDurationMinutes, dto.gapMinutes ?? 0);

    const updated = await this.prisma.telepericiaSlot.update({
      where: { id: slotId },
      data: {
        date: new Date(dto.date),
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        slotType: dto.slotType,
        appointmentDurationMinutes: dto.appointmentDurationMinutes,
        gapMinutes: dto.gapMinutes ?? 0,
        capacity: dto.capacity ?? this.computeAvailableCapacity(dto.durationMinutes, dto.appointmentDurationMinutes, dto.gapMinutes ?? 0),
        timezone: dto.timezone ?? 'America/Sao_Paulo',
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    if (updated.items.length > updated.capacity) {
      throw new BadRequestException('Capacidade não pode ser menor que a quantidade de perícias atribuídas.');
    }

    await this.syncPericiasForSlot(updated.id);
    return this.toSlotResponse(updated);
  }

  deleteSlot(slotId: string) {
    return this.prisma.telepericiaSlot.delete({ where: { id: slotId } });
  }

  async assign(slotId: string, dto: AssignTelepericiaItemDto) {
    const slot = await this.ensureSlot(slotId);
    const maxAllowed = Math.min(slot.capacity, this.computeAvailableCapacity(slot.durationMinutes, slot.appointmentDurationMinutes, slot.gapMinutes));

    const [pericia, currentItems] = await Promise.all([
      this.prisma.pericia.findFirst({ where: { id: dto.periciaId, tenantId: slot.tenantId } }),
      this.prisma.telepericiaSlotItem.findMany({ where: { slotId }, orderBy: { orderIndex: 'asc' } }),
    ]);

    if (!pericia) throw new NotFoundException('Perícia não encontrada.');
    if (currentItems.some((item) => item.periciaId === dto.periciaId)) {
      throw new BadRequestException('Perícia já atribuída a este slot.');
    }
    if (currentItems.length >= maxAllowed) {
      throw new BadRequestException('Capacidade do slot atingida para atribuições.');
    }

    const item = await this.prisma.telepericiaSlotItem.create({
      data: {
        tenantId: slot.tenantId,
        slotId,
        periciaId: dto.periciaId,
        orderIndex: currentItems.length,
      },
    });

    if (slot.periciaId) {
      await this.whatsappScheduler.syncPericiaJobs({
        tenantId,
        periciaId: slot.periciaId,
        scheduledAt: slot.startAt,
        shouldSchedule: true,
      });
    }

    return slot;
  }

  listSlots() {
    return this.prisma.teleSlot.findMany({ orderBy: { startAt: 'asc' } });
  }

  async booking(dto: BookTeleSlotDto) {
    const slot = await this.ensureSlot(dto.slotId);
    const updatedSlot = await this.prisma.teleSlot.update({
      where: { id: dto.slotId },
      data: { periciaId: dto.periciaId, ...(dto.meetingUrl ? { meetingUrl: dto.meetingUrl } : {}), status: TeleSlotStatus.BOOKED },
    });

    if (slot.periciaId && slot.periciaId !== dto.periciaId) {
      await this.whatsappScheduler.syncPericiaJobs({
        tenantId: updatedSlot.tenantId,
        periciaId: slot.periciaId,
        shouldSchedule: false,
      });
    }

    await this.whatsappScheduler.syncPericiaJobs({
      tenantId: updatedSlot.tenantId,
      periciaId: dto.periciaId,
      scheduledAt: updatedSlot.startAt,
      shouldSchedule: true,
    });

    return updatedSlot;
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
    const title = dto.title ?? `Sala de Perícia ${slot.date.toISOString()} ${slot.startTime}`;

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

  private async syncPericiasForSlot(slotId: string) {
    const slot = await this.prisma.telepericiaSlot.findFirst({ where: { id: slotId }, include: { items: { orderBy: { orderIndex: 'asc' } } } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');

    await this.prisma.$transaction(
      slot.items.map((item) => {
        const schedule = this.computeItemSchedule(slot, item.orderIndex);
        return this.prisma.pericia.update({
          where: { id: item.periciaId },
          data: { dataAgendamento: schedule.startAt, horaAgendamento: this.toHHmm(schedule.startAt), agendada: true },
        });
      }),
    );
  }

  private toSlotResponse(slot: { date: Date; startTime: string; appointmentDurationMinutes: number; gapMinutes: number; items: Array<{ orderIndex: number }>; [key: string]: unknown }) {
    return {
      ...slot,
      items: slot.items.map((item) => ({
        ...item,
        ...this.computeItemSchedule(slot, item.orderIndex),
      })),
    };
  }

  private computeItemSchedule(slot: { date: Date; startTime: string; appointmentDurationMinutes: number; gapMinutes: number }, orderIndex: number) {
    const base = this.buildBaseDate(slot.date, slot.startTime);
    const offsetMinutes = orderIndex * (slot.appointmentDurationMinutes + slot.gapMinutes);
    const startAt = new Date(base.getTime() + offsetMinutes * 60_000);
    const endAt = new Date(startAt.getTime() + slot.appointmentDurationMinutes * 60_000);
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

  private validateSlotDurations(durationMinutes: number, appointmentDurationMinutes: number) {
    if (appointmentDurationMinutes > durationMinutes) {
      throw new BadRequestException('Duração de atendimento não pode ser maior que a duração total do slot.');
    }
  }

  private validateCapacity(capacity: number | undefined, durationMinutes: number, appointmentDurationMinutes: number, gapMinutes: number) {
    const max = this.computeAvailableCapacity(durationMinutes, appointmentDurationMinutes, gapMinutes);
    if (max < 1) throw new BadRequestException('Configuração de duração/gap não permite nenhum atendimento no slot.');
    if (capacity && capacity > max) {
      throw new BadRequestException(`Capacidade informada (${capacity}) excede o máximo possível (${max}) para a janela do slot.`);
    }
  }

  private toHHmm(date: Date) {
    return date.toISOString().slice(11, 16);
  }

  private async ensureSlot(id: string) {
    const slot = await this.prisma.telepericiaSlot.findFirst({ where: { id }, include: { items: { orderBy: { orderIndex: 'asc' } } } });
    if (!slot) throw new NotFoundException('Slot não encontrado.');
    return slot;
  }
}
