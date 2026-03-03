import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConciliationService } from './conciliation.service';

@ApiTags('financial-conciliation')
@ApiBearerAuth()
@Controller('financial/conciliation')
export class ConciliationController {
  constructor(private readonly service: ConciliationService) {}

  @Post('transactions/:id/run')
  @ApiOperation({ summary: 'Executa matching automático para uma transação não vinculada' })
  runForTransaction(@Param('id') id: string) {
    return this.service.runForTransaction(id);
  }

  @Post('batch/run')
  @ApiOperation({ summary: 'Executa matching automático em lote para transações não vinculadas' })
  runBatch(@Body() body: { transactionIds?: string[] }) {
    return this.service.runBatch(body.transactionIds);
  }

  @Get('transactions/:id/suggestions')
  @ApiOperation({ summary: 'Consulta sugestões já calculadas para uma transação' })
  getSuggestions(@Param('id') id: string) {
    return this.service.getSuggestions(id);
  }
}
