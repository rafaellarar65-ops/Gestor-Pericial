import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FinancialService } from './financial.service';
import {
  BulkDeleteRecebimentosDto,
  CreateDespesaDto,
  CreateRecebimentoDto,
  FinancialImportAiPrintResponseDto,
  ImportAiPrintDto,
  ImportRecebimentosDto,
  ImportUnmatchedTransactionsDto,
  LinkPaymentToPericiaDto,
  ReconcileDto,
  LinkUnmatchedPaymentDto,
  UpdateUnmatchedPaymentDto,
  UpdateRecebimentoDto,
  SplitUnmatchedPaymentDto,
  UpdateRecebimentoDto,
  UpdateUnmatchedPaymentDto,
} from './dto/financial.dto';
import { ImportCsvDto } from './dto/import.dto';

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


  @Post('import-ai-print')
  @ApiOperation({ summary: 'Importa print financeiro com IA' })
  importAiPrint(@Body() dto: ImportAiPrintDto): Promise<FinancialImportAiPrintResponseDto> {
    return this.service.importAiPrint(dto);
  }

  @Post('import-batch')
  importBatch(@Body() dto: ImportRecebimentosDto) {
    return this.service.importBatch(dto);
  }

  @Post('import-csv')
  @ApiOperation({ summary: 'Importa CSV financeiro com matching automático por CNJ' })
  importCsv(@Body() dto: ImportCsvDto) {
    return this.service.importCsv(dto);
  }

  @Get('unmatched-payments')
  @ApiOperation({ summary: 'Lista pagamentos financeiros não vinculados' })
  getUnmatchedPayments() {
    return this.service.unmatched();
  }

  @Post('unmatched-payments/:id/link')
  @ApiOperation({ summary: 'Vincula manualmente pagamento não vinculado a uma perícia' })
  linkPayment(@Param('id') paymentId: string, @Body() dto: LinkPaymentToPericiaDto) {
    return this.service.linkPaymentToPericia(paymentId, dto);
  }

  @Get('import-batches')
  @ApiOperation({ summary: 'Histórico de lotes importados' })
  listImportBatches() {
    return this.service.listImportBatches();
  }

  @Post('unmatched')
  importUnmatched(@Body() dto: ImportUnmatchedTransactionsDto) {
    return this.service.importUnmatched(dto);
  }

  @Get('unmatched')
  unmatched() {
    return this.service.unmatched();
  }

  @Get('conciliation/stats')
  conciliationStats() {
    return this.service.conciliationStats();
  }

  @Post('reconcile')
  reconcile(@Body() dto: ReconcileDto) {
    return this.service.reconcile(dto);
  }


  @Patch('unmatched/:id')
  updateUnmatched(@Param('id') id: string, @Body() dto: UpdateUnmatchedPaymentDto) {
    return this.service.updateUnmatched(id, dto);
  }

  @Post('unmatched/:id/link')
  linkUnmatched(@Param('id') id: string, @Body() body: LinkUnmatchedPaymentDto) {
    return this.service.linkUnmatched(id, body);
  }

  @Post('unmatched/:id/discard')
  discardUnmatched(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.discardUnmatched(id, body.note);
  }

  @Post('conciliation/:unmatchedId/split')
  splitUnmatched(
    @Param('unmatchedId') unmatchedId: string,
    @Body() dto: SplitUnmatchedPaymentDto,
  ) {
    return this.service.splitUnmatched(unmatchedId, dto);
  }

  @Delete('unmatched/:id')
  deleteUnmatched(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.deleteUnmatched(id, body.reason);
  }

  @Get('analytics')
  analytics() {
    return this.service.analytics();
  }

  @Get('revenue-forecast')
  revenueForecast() {
    return this.service.revenueForecast();
  }

  @Post('charge-automation')
  chargeAutomation() {
    return this.service.chargeAutomation();
  }
}
