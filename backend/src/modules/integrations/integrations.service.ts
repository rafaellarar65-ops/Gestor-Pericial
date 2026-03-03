import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CalendarSyncDirection, CalendarSyncMode, CalendarSyncStatus, CalendarSyncType, CnjSyncStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DatajudCnjDto,
  DatajudSyncDto,
  GoogleOAuthCallbackDto,
  GoogleOAuthConnectDto,
  GoogleSyncRunDto,
  GoogleSyncSettingsDto,
  ListSyncAuditDto,
  ResolveSyncConflictDto,
  SaveIntegrationSettingsDto,
  SelectGoogleCalendarDto,
  SisperjudConsultDto,
  TjmgUtilsDto,
} from './dto/integrations.dto';

type GoogleWebhookHeaders = {
  channelId?: string;
  resourceId?: string;
  resourceState?: string;
  resourceUri?: string;
  messageNumber?: string;
  channelExpiration?: string;
  channelToken?: string;
};

type WebhookRegistration = {
  channelId: string;
  resourceId: string;
  expiresAt: string | null;
  resourceUri: string | null;
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly cache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>();
  private readonly rlMap = new Map<string, { windowStart: number; count: number }>();
  private readonly googleSyncQueue = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async saveSettings(dto: SaveIntegrationSettingsDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const existing = await this.prisma.integrationSettings.findFirst({ where: { provider: dto.provider } });

    if (existing) {
      return this.prisma.integrationSettings.update({
        where: { id: existing.id },
        data: { config: dto.config as Prisma.InputJsonValue, active: dto.active ?? true },
      });
    }

    return this.prisma.integrationSettings.create({
      data: { tenantId, provider: dto.provider, config: dto.config as Prisma.InputJsonValue, active: dto.active ?? true },
    });
  }

  googleOAuthConnect(dto: GoogleOAuthConnectDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const redirect = dto.redirectUri ?? `${process.env.APP_URL ?? 'http://localhost:3000'}/integrations/google-calendar`;
    const state = Buffer.from(`${tenantId}:${Date.now()}`).toString('base64url');

    return {
      provider: 'GOOGLE',
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID ?? 'stub-client'}&redirect_uri=${encodeURIComponent(
        redirect,
      )}&response_type=code&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar')}&access_type=offline&prompt=consent&state=${state}`,
      state,
    };
  }

  async googleOAuthCallback(dto: GoogleOAuthCallbackDto) {
    const tenantId = this.context.get('tenantId') ?? '';

    return this.prisma.calendarIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } },
      create: {
        tenantId,
        provider: 'GOOGLE',
        email: dto.email ?? 'google-user@example.com',
        accessToken: `token-${dto.code.slice(0, 8)}`,
        refreshToken: `refresh-${dto.code.slice(0, 8)}`,
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        active: true,
      },
      update: {
        email: dto.email ?? undefined,
        accessToken: `token-${dto.code.slice(0, 8)}`,
        refreshToken: `refresh-${dto.code.slice(0, 8)}`,
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        active: true,
      },
    });
  }

  async getGoogleCalendarStatus() {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.calendarIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } } });
  }

  listGoogleCalendars() {
    return {
      items: [
        { id: 'primary', summary: 'Principal' },
        { id: 'juridico@empresa.com', summary: 'Perícias Jurídicas' },
      ],
    };
  }

  async selectGoogleCalendar(dto: SelectGoogleCalendarDto) {
    const tenantId = this.context.get('tenantId') ?? '';

    return this.prisma.calendarIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } },
      create: {
        tenantId,
        provider: 'GOOGLE',
        selectedCalendarId: dto.calendarId,
        selectedCalendarName: dto.calendarName ?? dto.calendarId,
      },
      update: {
        selectedCalendarId: dto.calendarId,
        selectedCalendarName: dto.calendarName ?? dto.calendarId,
      },
    });
  }

  async updateGoogleSyncSettings(dto: GoogleSyncSettingsDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.calendarIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } },
      create: {
        tenantId,
        provider: 'GOOGLE',
        syncEvents: dto.syncEvents ?? true,
        syncTasks: dto.syncTasks ?? false,
        mode: dto.mode ?? CalendarSyncMode.MIRROR,
        active: dto.active ?? true,
      },
      update: {
        syncEvents: dto.syncEvents,
        syncTasks: dto.syncTasks,
        mode: dto.mode,
        active: dto.active,
      },
    });
  }

  async runGoogleSync(dto: GoogleSyncRunDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.runGoogleSyncForTenant(tenantId, dto.direction);
  }

  async processGoogleWebhookNotification(headers: GoogleWebhookHeaders, payload: Record<string, unknown>) {
    const parsedHeaders = this.normalizeWebhookHeaders(headers);
    const identified = await this.identifyGoogleWebhookTarget(parsedHeaders);

    if (!identified) {
      this.logger.warn(`Webhook Google ignorado: canal não reconhecido. channelId=${parsedHeaders.channelId ?? 'n/a'}`);
      return { accepted: true, queued: false, ignored: true };
    }

    const { integration, registration, tenantId } = identified;
    const validationError = this.validateWebhookRegistration(parsedHeaders, registration);
    if (validationError) {
      await this.persistWebhookAudit({
        tenantId,
        integrationId: integration.id,
        localEntityId: integration.id,
        status: CalendarSyncStatus.ERROR,
        message: validationError,
        payload: this.toJson({ headers: parsedHeaders, body: payload }),
      });

      return { accepted: true, queued: false, error: validationError };
    }

    const now = Date.now();
    const channelExpiration = parsedHeaders.channelExpiration ? new Date(parsedHeaders.channelExpiration) : null;
    const registrationExpiration = registration.expiresAt ? new Date(registration.expiresAt) : null;
    const effectiveExpiration = channelExpiration ?? registrationExpiration;

    const needsRenewalByState = ['expired', 'stop', 'sync_failed'].includes(parsedHeaders.resourceState);
    const needsRenewalByTime = Boolean(effectiveExpiration && effectiveExpiration.getTime() - now <= 15 * 60 * 1000);

    let resubscribed = false;
    if (needsRenewalByState || needsRenewalByTime) {
      await this.resubscribeGoogleCalendarChannel(tenantId, integration.id, parsedHeaders, payload);
      resubscribed = true;
    }

    const shouldSync = ['exists', 'not_exists', 'update', 'sync'].includes(parsedHeaders.resourceState);
    let jobId: string | null = null;

    if (shouldSync && integration.active) {
      jobId = this.enqueueGoogleSyncJob(tenantId, integration.id, {
        reason: `webhook:${parsedHeaders.resourceState}`,
      });
    }

    await this.persistWebhookAudit({
      tenantId,
      integrationId: integration.id,
      localEntityId: integration.id,
      status: CalendarSyncStatus.SYNCED,
      message: `Webhook Google recebido (${parsedHeaders.resourceState}).${resubscribed ? ' Canal renovado.' : ''}${jobId ? ` Job ${jobId} enfileirado.` : ''}`,
      payload: this.toJson({
        headers: parsedHeaders,
        body: payload,
        resubscribed,
        jobId,
      }),
    });

    return {
      accepted: true,
      queued: Boolean(jobId),
      jobId,
      resubscribed,
    };
  }

  async listSyncAudit(dto: ListSyncAuditDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.syncAuditLog.findMany({
      where: {
        tenantId,
        ...(dto.status ? { status: dto.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveSyncConflict(logId: string, dto: ResolveSyncConflictDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const log = await this.prisma.syncAuditLog.findFirst({ where: { id: logId, tenantId } });
    if (!log) throw new HttpException('Log não encontrado.', HttpStatus.NOT_FOUND);

    const resolvedStatus = dto.resolution === 'LOCAL' ? CalendarSyncStatus.SYNCED : CalendarSyncStatus.WARNING;

    if (log.localEntity === 'AgendaEvent') {
      await this.prisma.agendaEvent.update({
        where: { id: log.localEntityId },
        data: { lastSyncAt: new Date() },
      });
    }

    if (log.localEntity === 'AgendaTask') {
      await this.prisma.agendaTask.update({
        where: { id: log.localEntityId },
        data: { lastSyncAt: new Date() },
      });
    }

    return this.prisma.syncAuditLog.update({
      where: { id: logId },
      data: {
        status: resolvedStatus,
        message: `Conflito resolvido usando versão ${dto.resolution}.`,
        syncedAt: new Date(),
      },
    });
  }

  async datajudByCnj(dto: DatajudCnjDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    this.assertRateLimit('DATAJUD', 60, 30);

    const cached = this.getCache(`datajud:${dto.cnj}`);
    if (cached) return { ...cached, cached: true };

    const sync = await this.prisma.cnjSync.create({
      data: {
        tenantId,
        ...(dto.periciaId ? { periciaId: dto.periciaId } : {}),
        status: CnjSyncStatus.PENDING,
        payload: { cnj: dto.cnj },
        message: 'Consulta agendada',
      },
    });

    const result = await this.withRetry(async () =>
      this.prisma.cnjSync.update({
        where: { id: sync.id },
        data: {
          status: CnjSyncStatus.SUCCESS,
          lastSyncAt: new Date(),
          payload: {
            cnj: dto.cnj,
            movimentacoes: [
              { data: new Date().toISOString(), descricao: 'Distribuição' },
              { data: new Date().toISOString(), descricao: 'Concluso para decisão' },
            ],
          } as Prisma.InputJsonValue,
        },
      }),
    );

    this.setCache(`datajud:${dto.cnj}`, result as unknown as Record<string, unknown>, 5 * 60 * 1000);
    return { ...result, cached: false };
  }

  datajudSync(dto: DatajudSyncDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    this.assertRateLimit('DATAJUD_SYNC', 60, 30);

    return this.prisma.cnjSync.create({
      data: {
        tenantId,
        ...(dto.periciaId ? { periciaId: dto.periciaId } : {}),
        status: CnjSyncStatus.PENDING,
        nextSyncAt: new Date(Date.now() + 5 * 60 * 1000),
        message: 'Sync enfileirado',
      },
    });
  }

  sisperjudConsult(dto: SisperjudConsultDto) {
    this.assertRateLimit('SISPERJUD', 60, 20);

    return {
      provider: 'SISPERJUD',
      query: dto.query,
      results: [{ id: 'sisp-1', status: 'OK' }],
    };
  }

  tjmgUtils(dto: TjmgUtilsDto) {
    const onlyDigits = dto.cnj.replace(/\D/g, '');
    return { original: dto.cnj, normalized: onlyDigits, validLength: onlyDigits.length === 20 };
  }

  private async runGoogleSyncForTenant(tenantId: string, directionInput: GoogleSyncRunDto['direction']) {
    const integration = await this.prisma.calendarIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } } });
    if (!integration?.active) {
      throw new HttpException('Integração Google Calendar não está ativa.', HttpStatus.BAD_REQUEST);
    }

    const [events, tasks] = await Promise.all([
      integration.syncEvents
        ? this.prisma.agendaEvent.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 50 })
        : Promise.resolve([]),
      integration.syncTasks
        ? this.prisma.agendaTask.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 50 })
        : Promise.resolve([]),
    ]);

    const direction = directionInput === 'push' ? CalendarSyncDirection.PUSH : CalendarSyncDirection.PULL;
    let conflicts = 0;
    let synced = 0;

    for (const event of events) {
      const status = this.calculateSyncStatus(event.updatedAt, event.externalLastModifiedAt, event.lastSyncAt);
      const eventSyncStatus = status === CalendarSyncStatus.CONFLICT ? 'CONFLICT' : status === CalendarSyncStatus.SYNCED ? 'SYNCED' : 'ERROR';
      await this.prisma.agendaEvent.update({
        where: { id: event.id },
        data: {
          syncStatus: eventSyncStatus,
          lastSyncAt: status === CalendarSyncStatus.CONFLICT ? event.lastSyncAt : new Date(),
          externalLastModifiedAt: direction === CalendarSyncDirection.PULL ? new Date() : event.externalLastModifiedAt,
        },
      });
      await this.prisma.syncAuditLog.create({
        data: {
          tenantId,
          integrationId: integration.id,
          syncType: CalendarSyncType.EVENT,
          direction,
          localEntity: 'AgendaEvent',
          localEntityId: event.id,
          externalId: event.externalId,
          status,
          message: status === CalendarSyncStatus.CONFLICT ? 'Conflito detectado entre alterações locais e externas.' : 'Evento sincronizado.',
          localUpdatedAt: event.updatedAt,
          externalUpdatedAt: event.externalLastModifiedAt,
          syncedAt: status === CalendarSyncStatus.CONFLICT ? null : new Date(),
        },
      });
      if (status === CalendarSyncStatus.CONFLICT) conflicts += 1;
      else synced += 1;
    }

    for (const task of tasks) {
      const status = this.calculateSyncStatus(task.updatedAt, null, task.lastSyncAt);
      await this.prisma.agendaTask.update({
        where: { id: task.id },
        data: {
          lastSyncAt: status === CalendarSyncStatus.CONFLICT ? task.lastSyncAt : new Date(),
        },
      });
      await this.prisma.syncAuditLog.create({
        data: {
          tenantId,
          integrationId: integration.id,
          syncType: CalendarSyncType.TASK,
          direction,
          localEntity: 'AgendaTask',
          localEntityId: task.id,
          externalId: task.externalId,
          status,
          message: status === CalendarSyncStatus.CONFLICT ? 'Conflito detectado entre alterações locais e externas.' : 'Task sincronizada.',
          localUpdatedAt: task.updatedAt,
          externalUpdatedAt: null,
          syncedAt: status === CalendarSyncStatus.CONFLICT ? null : new Date(),
        },
      });
      if (status === CalendarSyncStatus.CONFLICT) conflicts += 1;
      else synced += 1;
    }

    await this.prisma.calendarIntegration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });

    return { synced, conflicts, direction: directionInput };
  }

  private enqueueGoogleSyncJob(tenantId: string, integrationId: string, meta: { reason: string }) {
    const jobId = randomUUID();
    const queueKey = `${tenantId}:${integrationId}`;
    const previous = this.googleSyncQueue.get(queueKey) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        await this.runGoogleSyncForTenant(tenantId, 'pull');
      })
      .catch(async (error) => {
        await this.persistWebhookAudit({
          tenantId,
          integrationId,
          localEntityId: integrationId,
          status: CalendarSyncStatus.ERROR,
          message: `Falha no job assíncrono de sync (${meta.reason}): ${error instanceof Error ? error.message : 'erro desconhecido'}`,
          payload: { reason: meta.reason, jobId },
        });
      })
      .finally(() => {
        if (this.googleSyncQueue.get(queueKey) === next) {
          this.googleSyncQueue.delete(queueKey);
        }
      });

    this.googleSyncQueue.set(queueKey, next);
    return jobId;
  }

  private async identifyGoogleWebhookTarget(headers: Required<GoogleWebhookHeaders>) {
    const tokenData = this.parseGoogleChannelToken(headers.channelToken);
    if (tokenData?.tenantId) {
      const integration = tokenData.integrationId
        ? await this.prisma.calendarIntegration.findFirst({ where: { id: tokenData.integrationId, tenantId: tokenData.tenantId, provider: 'GOOGLE' } })
        : await this.prisma.calendarIntegration.findUnique({ where: { tenantId_provider: { tenantId: tokenData.tenantId, provider: 'GOOGLE' } } });

      if (integration) {
        const registration = await this.getStoredWebhookRegistration(tokenData.tenantId, integration.id);
        if (registration) {
          return {
            tenantId: tokenData.tenantId,
            integration,
            registration,
          };
        }
      }
    }

    const registrations = await this.prisma.integrationSettings.findMany({
      where: { provider: 'GOOGLE_CALENDAR_WEBHOOK_REGISTRATION', active: true },
      select: { tenantId: true, config: true },
      take: 500,
    });

    const matching = registrations.find((setting) => {
      const config = setting.config as Prisma.JsonObject;
      return config.channelId === headers.channelId && config.resourceId === headers.resourceId;
    });

    if (!matching) return null;

    const config = matching.config as Prisma.JsonObject;
    const integrationId = typeof config.integrationId === 'string' ? config.integrationId : null;
    const integration = integrationId
      ? await this.prisma.calendarIntegration.findFirst({ where: { id: integrationId, tenantId: matching.tenantId, provider: 'GOOGLE' } })
      : await this.prisma.calendarIntegration.findUnique({ where: { tenantId_provider: { tenantId: matching.tenantId, provider: 'GOOGLE' } } });

    if (!integration) return null;

    return {
      tenantId: matching.tenantId,
      integration,
      registration: {
        channelId: String(config.channelId ?? ''),
        resourceId: String(config.resourceId ?? ''),
        expiresAt: typeof config.expiresAt === 'string' ? config.expiresAt : null,
        resourceUri: typeof config.resourceUri === 'string' ? config.resourceUri : null,
      } as WebhookRegistration,
    };
  }

  private validateWebhookRegistration(headers: Required<GoogleWebhookHeaders>, registration: WebhookRegistration) {
    if (!headers.channelId || !headers.resourceId) {
      return 'Headers X-Goog-Channel-ID/X-Goog-Resource-ID são obrigatórios.';
    }

    if (headers.channelId !== registration.channelId) {
      return 'Channel ID do webhook Google não confere com o canal registrado.';
    }

    if (headers.resourceId !== registration.resourceId) {
      return 'Resource ID do webhook Google não confere com o recurso registrado.';
    }

    return null;
  }

  private normalizeWebhookHeaders(headers: GoogleWebhookHeaders): Required<GoogleWebhookHeaders> {
    return {
      channelId: headers.channelId ?? '',
      resourceId: headers.resourceId ?? '',
      resourceState: headers.resourceState?.toLowerCase() ?? 'exists',
      resourceUri: headers.resourceUri ?? '',
      messageNumber: headers.messageNumber ?? '',
      channelExpiration: headers.channelExpiration ?? '',
      channelToken: headers.channelToken ?? '',
    };
  }

  private parseGoogleChannelToken(token: string | undefined) {
    if (!token) return null;

    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { tenantId?: string; integrationId?: string };
      if (!parsed?.tenantId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async getStoredWebhookRegistration(tenantId: string, integrationId: string) {
    const setting = await this.prisma.integrationSettings.findFirst({
      where: { tenantId, provider: 'GOOGLE_CALENDAR_WEBHOOK_REGISTRATION', active: true },
    });
    if (!setting) return null;

    const config = setting.config as Prisma.JsonObject;
    if (config.integrationId !== integrationId) return null;

    return {
      channelId: String(config.channelId ?? ''),
      resourceId: String(config.resourceId ?? ''),
      expiresAt: typeof config.expiresAt === 'string' ? config.expiresAt : null,
      resourceUri: typeof config.resourceUri === 'string' ? config.resourceUri : null,
    } as WebhookRegistration;
  }

  private async resubscribeGoogleCalendarChannel(
    tenantId: string,
    integrationId: string,
    headers: Required<GoogleWebhookHeaders>,
    payload: Record<string, unknown>,
  ) {
    const renewal = {
      integrationId,
      channelId: randomUUID(),
      resourceId: randomUUID(),
      resourceUri: headers.resourceUri || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      refreshedAt: new Date().toISOString(),
      previousChannelId: headers.channelId,
      previousResourceId: headers.resourceId,
    };

    const existing = await this.prisma.integrationSettings.findFirst({
      where: { tenantId, provider: 'GOOGLE_CALENDAR_WEBHOOK_REGISTRATION' },
    });

    if (existing) {
      await this.prisma.integrationSettings.update({
        where: { id: existing.id },
        data: { config: renewal as Prisma.InputJsonValue, active: true },
      });
    } else {
      await this.prisma.integrationSettings.create({
        data: {
          tenantId,
          provider: 'GOOGLE_CALENDAR_WEBHOOK_REGISTRATION',
          active: true,
          config: renewal as Prisma.InputJsonValue,
        },
      });
    }

    await this.persistWebhookAudit({
      tenantId,
      integrationId,
      localEntityId: integrationId,
      status: CalendarSyncStatus.WARNING,
      message: 'Canal Google Calendar renovado automaticamente.',
      payload: this.toJson({
        previous: {
          channelId: headers.channelId,
          resourceId: headers.resourceId,
        },
        renewal,
        webhookPayload: payload,
      }),
    });
  }

  private async persistWebhookAudit(input: {
    tenantId: string;
    integrationId: string;
    localEntityId: string;
    status: CalendarSyncStatus;
    message: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.prisma.syncAuditLog.create({
      data: {
        tenantId: input.tenantId,
        integrationId: input.integrationId,
        syncType: CalendarSyncType.EVENT,
        direction: CalendarSyncDirection.PULL,
        localEntity: 'GoogleCalendarWebhook',
        localEntityId: input.localEntityId,
        externalId: null,
        status: input.status,
        message: input.message,
        syncedAt: input.status === CalendarSyncStatus.ERROR ? null : new Date(),
        payload: input.payload,
      },
    });
  }

  private calculateSyncStatus(localUpdatedAt: Date, externalLastModifiedAt: Date | null, lastSyncAt: Date | null) {
    if (!lastSyncAt) return CalendarSyncStatus.SYNCED;
    const localChanged = localUpdatedAt.getTime() > lastSyncAt.getTime();
    const externalChanged = Boolean(externalLastModifiedAt && externalLastModifiedAt.getTime() > lastSyncAt.getTime());
    if (localChanged && externalChanged) return CalendarSyncStatus.CONFLICT;
    if (localChanged || externalChanged) return CalendarSyncStatus.WARNING;
    return CalendarSyncStatus.SYNCED;
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < retries; i += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  private getCache(key: string) {
    const value = this.cache.get(key);
    if (!value) return null;
    if (Date.now() > value.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return value.value;
  }

  private setCache(key: string, value: Record<string, unknown>, ttlMs: number) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private assertRateLimit(provider: string, windowSeconds: number, max: number) {
    const userId = this.context.get('userId') ?? 'anonymous';
    const key = `${provider}:${userId}`;
    const now = Date.now();
    const current = this.rlMap.get(key);

    if (!current || now - current.windowStart > windowSeconds * 1000) {
      this.rlMap.set(key, { windowStart: now, count: 1 });
      return;
    }

    if (current.count >= max) {
      throw new HttpException(`Rate limit de integração excedido para ${provider}`, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    this.rlMap.set(key, current);
  }
}
