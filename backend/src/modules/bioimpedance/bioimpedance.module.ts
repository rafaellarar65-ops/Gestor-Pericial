import { Module } from '@nestjs/common';
import { BioimpedanceController } from './bioimpedance.controller';
import { BioimpedanceService } from './bioimpedance.service';

@Module({
  controllers: [BioimpedanceController],
  providers: [BioimpedanceService],
  exports: [BioimpedanceService],
})
export class BioimpedanceModule {}
