import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { TelepericiaController } from './telepericia.controller';
import { TelepericiaService } from './telepericia.service';

@Module({
  imports: [CommunicationsModule],
  controllers: [TelepericiaController],
  providers: [TelepericiaService],
  exports: [TelepericiaService],
})
export class TelepericiaModule {}
