import { Module } from '@nestjs/common';
import { TelepericiaController } from './telepericia.controller';
import { TelepericiaService } from './telepericia.service';

@Module({
  controllers: [TelepericiaController],
  providers: [TelepericiaService],
  exports: [TelepericiaService],
})
export class TelepericiaModule {}
