import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { CalendarSyncDirection, CalendarSyncMode, CalendarSyncStatus, CalendarSyncType, CnjSyncStatus, Prisma } from '@prisma/client';
import { google } from 'googleapis';
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

@Injectable()
export class IntegrationsService {
  private readonly cache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>();
  private readonly rlMap = new Map<string, { windowStart: number; count: number }>();
  private readonly googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
  private readonly googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  private readonly googleRedirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';

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
    const redirectUri = dto.redirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_URL ?? 'http://localhost:3000'}/integrations/google-calendar`;
    const nonce = randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = { tenantId, nonce, expiresAt, redirectUri };
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getOAuthStateSecret()).update(payloadEncoded).digest('base64url');
    const state = `${payloadEncoded}.${signature}`;

    this.setCache(this.getOAuthStateCacheKey(tenantId, nonce), payload, 10 * 60 * 1000);

    const oauth2Client = this.createGoogleOAuthClient(redirectUri);

    return {
      provider: 'GOOGLE',
      authUrl: oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar'],
        prompt: 'consent',
        state,
      }),
      state,
    };
  }

  async googleOAuthCallback(dto: GoogleOAuthCallbackDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const statePayload = this.validateOAuthState(dto.state, tenantId);

    const oauth2Client = this.createGoogleOAuthClient(statePayload.redirectUri);
    const { tokens } = await this.withRetry(() => oauth2Client.getToken(dto.code));

    if (!tokens.access_token) {
      throw new HttpException('Falha ao obter access_token do Google OAuth.', HttpStatus.BAD_REQUEST);
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await this.withRetry(() => oauth2.userinfo.get());
    const email = dto.email ?? userInfo.data.email ?? null;

    return this.prisma.calendarIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } },
      create: {
        tenantId,
        provider: 'GOOGLE',
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        active: true,
      },
      update: {
        email: email ?? undefined,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
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
    const integration = await this.prisma.calendarIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider: 'GOOGLE' } } });
    if (!integration?.active) {
      throw new HttpException('Integração Google Calendar não está ativa.', HttpStatus.BAD_REQUEST);
    }

    await this.refreshGoogleTokenIfNeeded(integration);

    const [events, tasks] = await Promise.all([
      integration.syncEvents
        ? this.prisma.agendaEvent.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 50 })
        : Promise.resolve([]),
      integration.syncTasks
        ? this.prisma.agendaTask.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 50 })
        : Promise.resolve([]),
    ]);

    const direction = dto.direction === 'push' ? CalendarSyncDirection.PUSH : CalendarSyncDirection.PULL;
    let conflicts = 0;
    let synced = 0;

    for (const event of events) {
      const status = this.calculateSyncStatus(event.updatedAt, event.externalLastModifiedAt, event.lastSyncAt);
      const eventSyncStatus = status === CalendarSyncStatus.CONFLICT ? "CONFLICT" : status === CalendarSyncStatus.SYNCED ? "SYNCED" : "ERROR";
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

    return { synced, conflicts, direction: dto.direction };
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

  private createGoogleOAuthClient(redirectUri?: string) {
    return new google.auth.OAuth2(this.googleClientId, this.googleClientSecret, redirectUri ?? this.googleRedirectUri);
  }

  private getOAuthStateSecret() {
    return process.env.GOOGLE_OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'dev-google-oauth-state-secret';
  }

  private getOAuthStateCacheKey(tenantId: string, nonce: string) {
    return `google-oauth-state:${tenantId}:${nonce}`;
  }

  private validateOAuthState(state: string, tenantId: string) {
    const [payloadEncoded, signature] = state.split('.');
    if (!payloadEncoded || !signature) {
      throw new HttpException('State OAuth inválido.', HttpStatus.BAD_REQUEST);
    }

    const expectedSignature = createHmac('sha256', this.getOAuthStateSecret()).update(payloadEncoded).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new HttpException('Assinatura do state OAuth inválida.', HttpStatus.BAD_REQUEST);
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf-8')) as {
      tenantId: string;
      nonce: string;
      expiresAt: number;
      redirectUri: string;
    };

    if (payload.tenantId !== tenantId) {
      throw new HttpException('State OAuth não pertence ao tenant atual.', HttpStatus.BAD_REQUEST);
    }

    if (Date.now() > payload.expiresAt) {
      throw new HttpException('State OAuth expirado.', HttpStatus.BAD_REQUEST);
    }

    const cacheKey = this.getOAuthStateCacheKey(payload.tenantId, payload.nonce);
    const cached = this.getCache(cacheKey);
    if (!cached) {
      throw new HttpException('State OAuth inexistente ou já utilizado.', HttpStatus.BAD_REQUEST);
    }

    this.cache.delete(cacheKey);

    return payload;
  }

  private async refreshGoogleTokenIfNeeded(integration: { id: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null }) {
    if (!integration.refreshToken) return;

    const isExpired = !integration.tokenExpiresAt || integration.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;
    if (!isExpired) return;

    const oauth2Client = this.createGoogleOAuthClient();

    oauth2Client.setCredentials({
      access_token: integration.accessToken ?? undefined,
      refresh_token: integration.refreshToken,
      expiry_date: integration.tokenExpiresAt?.getTime(),
    });

    const { credentials } = await this.withRetry(() => oauth2Client.refreshAccessToken());
    if (!credentials.access_token) {
      throw new HttpException('Falha ao renovar token Google.', HttpStatus.BAD_GATEWAY);
    }

    await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token ?? integration.refreshToken,
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
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
