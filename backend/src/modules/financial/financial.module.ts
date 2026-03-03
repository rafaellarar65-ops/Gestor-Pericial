import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { ConciliationService } from './conciliation.service';
import { ConciliationController } from './conciliation.controller';

@Module({
  controllers: [FinancialController, ConciliationController],
  providers: [FinancialService, ConciliationService],
  exports: [FinancialService, ConciliationService],
})
export class FinancialModule {}
