import { Module } from '@nestjs/common';
import { LaudoController } from './laudo.controller';
import { LaudoService } from './laudo.service';

@Module({
  controllers: [LaudoController],
  providers: [LaudoService],
  exports: [LaudoService],
})
export class LaudoModule {}
