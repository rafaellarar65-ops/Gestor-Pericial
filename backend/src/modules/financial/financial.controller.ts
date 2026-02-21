import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { CreateFinancialDto, UpdateFinancialDto } from './dto/financial.dto';

@ApiTags('financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Post('recebimentos')
  recebimentos() { return { action: 'recebimentos', module: 'financial' }; }
  @Post('despesas')
  despesas() { return { action: 'despesas', module: 'financial' }; }
  @Post('import-batch')
  import_batch() { return { action: 'import-batch', module: 'financial' }; }
  @Get('unmatched')
  unmatched() { return { action: 'unmatched', module: 'financial' }; }
  @Post('reconcile')
  reconcile() { return { action: 'reconcile', module: 'financial' }; }
  @Get('analytics')
  analytics() { return { action: 'analytics', module: 'financial' }; }
  @Post('charge-automation')
  charge_automation() { return { action: 'charge-automation', module: 'financial' }; }

}
