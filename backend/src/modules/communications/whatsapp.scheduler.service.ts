import { Injectable } from '@nestjs/common';
import { WhatsAppJobStatus, WhatsAppJobType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsappSchedulerService {
  constructor(private readonly prisma: PrismaService) {}

  async syncPericiaJobs(params: { tenantId: string; periciaId: string; scheduledAt?: Date | null; shouldSchedule: boolean }) {
    await this.prisma.whatsappJob.updateMany({
      where: { tenantId: params.tenantId, periciaId: params.periciaId, status: { in: [WhatsAppJobStatus.QUEUED, WhatsAppJobStatus.PROCESSING] } },
      data: { status: WhatsAppJobStatus.CANCELED, lastError: 'rescheduled_or_disabled' },
    });

    if (!params.shouldSchedule || !params.scheduledAt) return { scheduled: 0 };

    await this.prisma.whatsappJob.create({
      data: {
        tenantId: params.tenantId,
        periciaId: params.periciaId,
        jobType: WhatsAppJobType.APPOINTMENT_REMINDER,
        scheduledFor: params.scheduledAt,
        status: WhatsAppJobStatus.QUEUED,
        idempotencyKey: `${params.tenantId}:${params.periciaId}:${params.scheduledAt.toISOString()}`,
      },
    });

    return { scheduled: 1 };
  }
}
