import { Module } from '@nestjs/common';
import { ManeuversController } from './maneuvers.controller';
import { ManeuversService } from './maneuvers.service';

@Module({
  controllers: [ManeuversController],
  providers: [ManeuversService],
  exports: [ManeuversService],
})
export class ManeuversModule {}
