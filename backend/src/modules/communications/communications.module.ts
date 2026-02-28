import { Module } from '@nestjs/common';
import { CommunicationsController, WhatsappController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, WhatsappSchedulerService, WhatsappJobsWorker],
  exports: [CommunicationsService, WhatsappSchedulerService],
})
export class CommunicationsModule {}
