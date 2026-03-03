import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class WhatsappJobsWorker implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    // Worker desativado temporariamente para evitar processamento em ambiente de build.
  }

  onModuleDestroy() {
    // noop
  }
}
