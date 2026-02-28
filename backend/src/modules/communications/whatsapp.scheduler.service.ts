import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WhatsAppJobStatus, WhatsAppJobType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const JOB_OFFSETS_MINUTES: Record<WhatsAppJobType, number> = {
  REMINDER_48H: -48 * 60,
  REMINDER_24H: -24 * 60,
  REMINDER_2H: -2 * 60,
  POST: 2 * 60,
};

@Injectable()
export class WhatsappSchedulerService {
  private readonly logger = new Logger(WhatsappSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncPericiaJobs(params: {
    tenantId: string;
    periciaId: string;
    scheduledAt?: Date | null;
    phone?: string | null;
    shouldSchedule: boolean;
  }) {
    const { tenantId, periciaId, scheduledAt, phone, shouldSchedule } = params;

    await this.cancelOpenJobs(tenantId, periciaId, 'rescheduled_or_disabled');

    if (!shouldSchedule || !scheduledAt) {
      return { scheduled: 0, canceled: true };
    }

    const jobs = Object.entries(JOB_OFFSETS_MINUTES)
      .map(([jobType, offset]) => ({
        tenantId,
        periciaId,
        jobType: jobType as WhatsAppJobType,
        scheduledFor: new Date(scheduledAt.getTime() + offset * 60_000),
        phone: phone?.trim() || null,
      }))
      .filter((job) => job.jobType === WhatsAppJobType.POST || job.scheduledFor.getTime() > Date.now());

    if (!jobs.length) return { scheduled: 0, canceled: false };

    for (const job of jobs) {
      const idempotencyKey = this.buildIdempotencyKey(job.tenantId, job.periciaId, job.jobType, job.scheduledFor);

      await this.prisma.whatsAppJob.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId: job.tenantId,
            idempotencyKey,
          },
        },
        create: {
          tenantId: job.tenantId,
          periciaId: job.periciaId,
          jobType: job.jobType,
          scheduledFor: job.scheduledFor,
          phone: job.phone,
          idempotencyKey,
          status: WhatsAppJobStatus.QUEUED,
          payload: {
            templateKey: this.resolveTemplateKey(job.jobType),
            channel: 'whatsapp',
          } as Prisma.InputJsonValue,
        },
        update: {
          status: WhatsAppJobStatus.QUEUED,
          scheduledFor: job.scheduledFor,
          nextAttemptAt: null,
          attempts: 0,
          canceledAt: null,
          sentAt: null,
          phone: job.phone,
          lastError: Prisma.JsonNull,
        },
      });
    }

    this.logger.log(`Agendados ${jobs.length} jobs WhatsApp para perícia ${periciaId}`);
    return { scheduled: jobs.length, canceled: false };
  }

  buildIdempotencyKey(tenantId: string, periciaId: string, jobType: WhatsAppJobType, scheduledFor: Date): string {
    return `${tenantId}:${periciaId}:${jobType}:${scheduledFor.toISOString()}`;
  }

  async cancelOpenJobs(tenantId: string, periciaId: string, reason: string) {
    await this.prisma.whatsAppJob.updateMany({
      where: {
        tenantId,
        periciaId,
        status: { in: [WhatsAppJobStatus.QUEUED, WhatsAppJobStatus.RETRYING, WhatsAppJobStatus.PROCESSING] },
      },
      data: {
        status: WhatsAppJobStatus.CANCELED,
        canceledAt: new Date(),
        lastError: {
          code: 'CANCELED_BY_RESCHEDULE',
          message: reason,
          at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  resolveTemplateKey(jobType: WhatsAppJobType): string {
    switch (jobType) {
      case WhatsAppJobType.REMINDER_48H:
        return 'reminder_48h';
      case WhatsAppJobType.REMINDER_24H:
        return 'reminder_24h';
      case WhatsAppJobType.REMINDER_2H:
        return 'reminder_2h';
      case WhatsAppJobType.POST:
      default:
        return 'post';
    }
  }
}
