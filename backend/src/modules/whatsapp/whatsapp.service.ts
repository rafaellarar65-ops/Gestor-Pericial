import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappProvider } from './whatsapp.provider';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: WhatsappProvider,
  ) {}

  async sendTenantMessage(params: { tenantId: string; to: string; message: string; periciaId?: string }) {
    const settings = await this.resolveTenantSettings(params.tenantId);
    if (!settings?.token || !settings?.phoneNumberId) {
      throw new HttpException('Integração WhatsApp não configurada para tenant', HttpStatus.PRECONDITION_FAILED);
    }

    const providerResponse = await this.provider.sendTextMessage({
      token: settings.token,
      phoneNumberId: settings.phoneNumberId,
      to: params.to,
      message: params.message,
    });

    const providerMessageId = providerResponse?.messages?.[0]?.id as string | undefined;

    const row = await this.prisma.whatsappMessage.create({
      data: {
        tenantId: params.tenantId,
        ...(params.periciaId ? { periciaId: params.periciaId } : {}),
        direction: 'outbound',
        messageType: 'text',
        status: 'sent',
        providerMessageId,
        payloadJson: providerResponse as Prisma.InputJsonValue,
      },
    });

    return { queued: true, provider: 'whatsapp-cloud-api', messageId: row.id, providerMessageId };
  }

  async processWebhook(body: any, rawBody: string, signature: string | undefined) {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;

    const integration = await this.findByPhoneNumberId(phoneNumberId);
    const tenantId = integration?.tenantId;

    if (!tenantId) {
      return { ok: true, ignored: true, reason: 'tenant-not-found' };
    }

    const appSecret = this.readConfigValue(integration?.config, 'appSecret');
    if (signature && appSecret) {
      const isValid = this.provider.validateMetaSignature(rawBody, signature, appSecret);
      if (!isValid) {
        throw new HttpException('Assinatura webhook inválida', HttpStatus.UNAUTHORIZED);
      }
    }

    const messages = value?.messages ?? [];
    const statuses = value?.statuses ?? [];

    for (const incoming of messages) {
      await this.prisma.whatsappMessage.create({
        data: {
          tenantId,
          direction: 'inbound',
          messageType: incoming?.type ?? 'message',
          status: 'received',
          providerMessageId: incoming?.id,
          payloadJson: {
            incoming,
            meta: body,
            fromPhone: incoming?.from,
            toPhone: value?.metadata?.display_phone_number,
            messageBody: incoming?.text?.body ?? incoming?.button?.text ?? incoming?.interactive?.body?.text,
          } as Prisma.InputJsonValue,
        },
      });
    }

    for (const statusEvent of statuses) {
      const mappedStatus = this.mapStatus(statusEvent?.status);
      await this.prisma.whatsappMessage.create({
        data: {
          tenantId,
          direction: 'status',
          messageType: 'status',
          status: mappedStatus,
          providerMessageId: statusEvent?.id,
          erro: statusEvent?.errors?.[0]?.title ?? null,
          payloadJson: { statusEvent, meta: body } as Prisma.InputJsonValue,
        },
      });

      if (statusEvent?.id) {
        await this.prisma.whatsappMessage.updateMany({
          where: { tenantId, providerMessageId: statusEvent.id, direction: 'outbound' },
          data: {
            status: mappedStatus,
            erro: statusEvent?.errors?.[0]?.title ?? null,
          },
        });
      }
    }

    return { ok: true };
  }

  async verifyChallenge(mode?: string, token?: string, challenge?: string) {
    if (mode !== 'subscribe' || !token) {
      throw new HttpException('Invalid challenge', HttpStatus.BAD_REQUEST);
    }

    const integration = await this.prisma.integrationSettings.findFirst({
      where: {
        provider: 'WHATSAPP_CLOUD_API',
        active: true,
        config: {
          path: ['verifyToken'],
          equals: token,
        },
      },
    });

    if (!integration || !challenge) {
      throw new HttpException('Token inválido', HttpStatus.FORBIDDEN);
    }

    return challenge;
  }

  private async resolveTenantSettings(tenantId: string) {
    const integration = await this.prisma.integrationSettings.findFirst({
      where: { tenantId, provider: 'WHATSAPP_CLOUD_API', active: true },
    });

    return {
      token: this.readConfigValue(integration?.config, 'token'),
      phoneNumberId: this.readConfigValue(integration?.config, 'phoneNumberId'),
    };
  }

  private async findByPhoneNumberId(phoneNumberId?: string) {
    if (!phoneNumberId) return null;
    return this.prisma.integrationSettings.findFirst({
      where: {
        provider: 'WHATSAPP_CLOUD_API',
        active: true,
        config: {
          path: ['phoneNumberId'],
          equals: phoneNumberId,
        },
      },
    });
  }

  private mapStatus(status?: string) {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'sent') return 'sent';
    if (normalized === 'delivered') return 'delivered';
    if (normalized === 'read') return 'read';
    if (normalized === 'failed') return 'failed';
    return 'sent';
  }

  private readConfigValue(config: Prisma.JsonValue | null | undefined, key: string): string | undefined {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return undefined;
    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
}
