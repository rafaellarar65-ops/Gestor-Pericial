import { Injectable, TooManyRequestsException } from '@nestjs/common';
import { CnjSyncStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/request-context.service';
import {
  DatajudCnjDto,
  DatajudSyncDto,
  SaveIntegrationSettingsDto,
  SisperjudConsultDto,
  TjmgUtilsDto,
} from './dto/integrations.dto';

@Injectable()
export class IntegrationsService {
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly rlMap = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async saveSettings(dto: SaveIntegrationSettingsDto) {
    const existing = await this.prisma.integrationSettings.findFirst({ where: { provider: dto.provider } });

    if (existing) {
      return this.prisma.integrationSettings.update({
        where: { id: existing.id },
        data: { config: dto.config, active: dto.active ?? true },
      });
    }

    return this.prisma.integrationSettings.create({
      data: { provider: dto.provider, config: dto.config, active: dto.active ?? true },
    });
  }

  async datajudByCnj(dto: DatajudCnjDto) {
    this.assertRateLimit('DATAJUD', 60, 30);

    const cached = this.getCache(`datajud:${dto.cnj}`);
    if (cached) return { ...cached, cached: true };

    const sync = await this.prisma.cnjSync.create({
      data: {
        periciaId: dto.periciaId,
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
          },
        },
      }),
    );

    this.setCache(`datajud:${dto.cnj}`, result, 5 * 60 * 1000);
    return { ...result, cached: false };
  }

  datajudSync(dto: DatajudSyncDto) {
    this.assertRateLimit('DATAJUD_SYNC', 60, 30);

    return this.prisma.cnjSync.create({
      data: {
        periciaId: dto.periciaId,
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
    return {
      original: dto.cnj,
      normalized: onlyDigits,
      validLength: onlyDigits.length === 20,
    };
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
    return value.value as Record<string, unknown>;
  }

  private setCache(key: string, value: unknown, ttlMs: number) {
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
      throw new TooManyRequestsException(`Rate limit de integração excedido para ${provider}`);
    }

    current.count += 1;
    this.rlMap.set(key, current);
  }
}
