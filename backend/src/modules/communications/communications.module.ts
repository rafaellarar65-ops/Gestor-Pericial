import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { WhatsappJobsWorker } from './whatsapp.jobs.worker';
import { WhatsappSchedulerService } from './whatsapp.scheduler.service';

@Module({
  controllers: [CommunicationsController],
  providers: [CommunicationsService, WhatsappSchedulerService, WhatsappJobsWorker],
  exports: [CommunicationsService, WhatsappSchedulerService],
})
export class CommunicationsModule {}
