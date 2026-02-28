import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import {
  BulkDeleteRecebimentosDto,
  CreateDespesaDto,
  CreateRecebimentoDto,
  ImportRecebimentosDto,
  ReconcileDto,
  UpdateRecebimentoDto,
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
  listRecebimentos(@Query('periciaId') periciaId?: string, @Query('search') search?: string) {
    return this.service.listRecebimentos(periciaId, search);
  }

  @Patch('recebimentos/:id')
  updateRecebimento(@Param('id') id: string, @Body() dto: UpdateRecebimentoDto) {
    return this.service.updateRecebimento(id, dto);
  }

  @Post('recebimentos/bulk-delete')
  bulkDeleteRecebimentos(@Body() dto: BulkDeleteRecebimentosDto) {
    return this.service.bulkDeleteRecebimentos(dto);
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

  @Get('import-batches')
  listImportBatches() {
    return this.service.listImportBatches();
  }

  @Post('import-batches/:id/revert')
  revertBatch(@Param('id') id: string) {
    return this.service.revertBatch(id);
  }

  @Delete('import-batches/:id')
  deleteBatchAndRecebimentos(@Param('id') id: string) {
    return this.service.deleteBatchAndRecebimentos(id);
  }

  @Post('clear-all-financial-data')
  clearAllFinancialData() {
    return this.service.clearAllFinancialData();
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

  @Post('charge-automation')
  chargeAutomation() {
    return this.service.chargeAutomation();
  }
}
