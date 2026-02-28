import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, WhatsAppJob, WhatsAppJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from './communications.service';

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

@Injectable()
export class WhatsappJobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappJobsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 30_000);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      const dueJobs = await this.prisma.whatsAppJob.findMany({
        where: {
          status: { in: [WhatsAppJobStatus.QUEUED, WhatsAppJobStatus.RETRYING] },
          scheduledFor: { lte: now },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        orderBy: [{ scheduledFor: 'asc' }],
        take: 50,
      });

      for (const job of dueJobs) {
        await this.processJob(job);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processJob(job: WhatsAppJob) {
    try {
      await this.prisma.whatsAppJob.update({
        where: { id: job.id },
        data: { status: WhatsAppJobStatus.PROCESSING },
      });

      this.assertDefinitiveFailures(job);
      const response = await this.sendViaProvider(job);

      await this.prisma.whatsAppJob.update({
        where: { id: job.id },
        data: {
          status: WhatsAppJobStatus.SENT,
          attempts: { increment: 1 },
          providerRef: response.messageId,
          sentAt: new Date(),
          lastError: Prisma.JsonNull,
        },
      });
    } catch (error) {
      await this.handleError(job, error);
    }
  }

  private async sendViaProvider(job: WhatsAppJob) {
    if (!job.phone) {
      const err = new Error('Telefone ausente para envio.');
      (err as Error & { code?: string }).code = 'INVALID_PHONE';
      throw err;
    }

    return this.communicationsService.sendWhatsappMessage({
      to: job.phone,
      message: `Mensagem automática (${job.jobType}) para perícia ${job.periciaId}`,
      periciaId: job.periciaId,
    });
  }

  private assertDefinitiveFailures(job: WhatsAppJob) {
    if (!job.phone || job.phone.replace(/\D/g, '').length < 10) {
      const err = new Error('Telefone inválido para envio WhatsApp.');
      (err as Error & { code?: string; definitive?: boolean }).code = 'INVALID_PHONE';
      (err as Error & { code?: string; definitive?: boolean }).definitive = true;
      throw err;
    }

    const payload = (job.payload ?? {}) as Record<string, unknown>;
    if (!payload.templateKey) {
      const err = new Error('Template obrigatório ausente.');
      (err as Error & { code?: string; definitive?: boolean }).code = 'TEMPLATE_REQUIRED';
      (err as Error & { code?: string; definitive?: boolean }).definitive = true;
      throw err;
    }

    if (Date.now() - new Date(job.scheduledFor).getTime() > 24 * 60 * 60_000) {
      const err = new Error('Template obrigatório fora da janela permitida.');
      (err as Error & { code?: string; definitive?: boolean }).code = 'TEMPLATE_REQUIRED_OUT_OF_WINDOW';
      (err as Error & { code?: string; definitive?: boolean }).definitive = true;
      throw err;
    }
  }

  private async handleError(job: WhatsAppJob, error: unknown) {
    const err = error as Error & { code?: string; definitive?: boolean };
    const attempts = job.attempts + 1;
    const definitive = Boolean(err.definitive) || ['INVALID_PHONE', 'TEMPLATE_REQUIRED', 'TEMPLATE_REQUIRED_OUT_OF_WINDOW'].includes(err.code ?? '');

    if (!definitive && attempts <= RETRY_DELAYS_MS.length) {
      const delayMs = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await this.prisma.whatsAppJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: WhatsAppJobStatus.RETRYING,
          nextAttemptAt: new Date(Date.now() + delayMs),
          lastError: this.buildLastError(err, false, attempts),
        },
      });

      this.logger.warn(`Falha transitória no job ${job.id}. Reagendado em ${Math.round(delayMs / 60_000)} minuto(s).`);
      return;
    }

    await this.prisma.whatsAppJob.update({
      where: { id: job.id },
      data: {
        attempts,
        status: WhatsAppJobStatus.FAILED,
        nextAttemptAt: null,
        lastError: this.buildLastError(err, true, attempts),
      },
    });

    this.logger.error(`Job ${job.id} falhou definitivamente: ${err.code ?? 'UNEXPECTED_ERROR'} - ${err.message}`);
  }

  private buildLastError(error: Error & { code?: string }, definitive: boolean, attempts: number): Prisma.InputJsonValue {
    return {
      code: error.code ?? 'UNEXPECTED_ERROR',
      message: error.message,
      definitive,
      attempts,
      at: new Date().toISOString(),
    } as Prisma.InputJsonValue;
  }
}
