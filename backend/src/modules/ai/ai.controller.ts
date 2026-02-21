import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AnalyzeDocumentDto, BatchActionDto, LaudoAssistDto } from './dto/ai.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('analyze-document')
  @ApiOperation({ summary: 'Analisa documento PDF e retorna insights' })
  analyzeDocument(@Body() dto: AnalyzeDocumentDto) {
    return this.service.analyzeDocument(dto);
  }

  @Post('batch-action')
  @ApiOperation({ summary: 'Gera plano de ação em lote baseado em instrução natural' })
  batchAction(@Body() dto: BatchActionDto) {
    return this.service.batchAction(dto);
  }

  @Post('laudo-assist')
  @ApiOperation({ summary: 'Sugere texto para seção do laudo' })
  laudoAssist(@Body() dto: LaudoAssistDto) {
    return this.service.laudoAssist(dto);
  }
}
