import { Module } from '@nestjs/common';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';
import { WhatsappProvider } from './whatsapp.provider';
import { WhatsappService } from './whatsapp.service';

@Module({
  controllers: [WhatsappWebhookController],
  providers: [WhatsappProvider, WhatsappService],
  exports: [WhatsappProvider, WhatsappService],
})
export class WhatsappModule {}
