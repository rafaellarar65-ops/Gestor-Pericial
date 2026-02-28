import { Module } from '@nestjs/common';
import { CommunicationsController, WhatsappController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { WhatsappRulesEngine } from './whatsapp.rules-engine';

@Module({
  controllers: [CommunicationsController, WhatsappController],
  providers: [CommunicationsService, WhatsappRulesEngine],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
