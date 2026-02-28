import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import {
  CreateDespesaDto,
  CreateRecebimentoDto,
  FinancialTimelineQueryDto,
  ImportRecebimentosDto,
  ReconcileDto,
} from './dto/financial.dto';

@ApiTags('financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Post('recebimentos')
  @ApiOperation({ summary: 'Cria recebimento' })
  createRecebimento(@Body() dto: CreateRecebimentoDto) {
    return this.service.createRecebimento(dto);
  }

  @Get('recebimentos')
  listRecebimentos(@Query('periciaId') periciaId?: string) {
    return this.service.listRecebimentos(periciaId);
  }

  @Post('despesas')
  @ApiOperation({ summary: 'Cria despesa' })
  createDespesa(@Body() dto: CreateDespesaDto) {
    return this.service.createDespesa(dto);
  }

  @Get('despesas')
  listDespesas() {
    return this.service.listDespesas();
  }

  @Post('import-batch')
  importBatch(@Body() dto: ImportRecebimentosDto) {
    return this.service.importBatch(dto);
  }

  @Get('unmatched')
  unmatched() {
    return this.service.unmatched();
  }

  @Post('reconcile')
  reconcile(@Body() dto: ReconcileDto) {
    return this.service.reconcile(dto);
  }

  @Get('analytics')
  analytics() {
    return this.service.analytics();
  }

  @Get('analytics/timeline')
  timeline(@Query() query: FinancialTimelineQueryDto) {
    return this.service.analyticsTimeline(query);
  }

  @Post('charge-automation')
  chargeAutomation() {
    return this.service.chargeAutomation();
  }
}
