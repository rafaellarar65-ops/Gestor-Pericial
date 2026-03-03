import { Module } from '@nestjs/common';
import { CommunicationsController, WhatsappController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { WhatsappJobsWorker } from './whatsapp.jobs.worker';
import { WhatsappSchedulerService } from './whatsapp.scheduler.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [CommunicationsController, WhatsappController],
  providers: [CommunicationsService, WhatsappSchedulerService, WhatsappJobsWorker],
  exports: [CommunicationsService, WhatsappSchedulerService],
})
export class CommunicationsModule {}
