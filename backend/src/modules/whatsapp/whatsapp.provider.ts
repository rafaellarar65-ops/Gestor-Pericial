import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface SendMessageInput {
  token: string;
  phoneNumberId: string;
  to: string;
  message: string;
  timeoutMs?: number;
}

@Injectable()
export class WhatsappProvider {
  private readonly baseUrl = process.env.WHATSAPP_CLOUD_API_BASE_URL ?? 'https://graph.facebook.com/v20.0';

  async sendTextMessage(input: SendMessageInput) {
    const endpoint = `${this.baseUrl}/${input.phoneNumberId}/messages`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 10_000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'text',
          text: { body: input.message },
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw this.normalizeError(payload, response.status);
      }

      return payload;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new HttpException({ message: 'Timeout ao chamar Meta Cloud API', provider: 'whatsapp-cloud-api' }, HttpStatus.GATEWAY_TIMEOUT);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException({ message: 'Falha ao chamar Meta Cloud API', provider: 'whatsapp-cloud-api' }, HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }

  validateMetaSignature(rawBody: string, signature: string | undefined, appSecret: string | undefined) {
    if (!signature || !appSecret) {
      return false;
    }

    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private normalizeError(payload: any, status: number) {
    const providerError = payload?.error;
    return new HttpException(
      {
        message: providerError?.message ?? 'Erro na Meta Cloud API',
        provider: 'whatsapp-cloud-api',
        code: providerError?.code,
        type: providerError?.type,
        details: providerError?.error_data,
      },
      status >= 400 && status < 600 ? status : HttpStatus.BAD_GATEWAY,
    );
  }
}
