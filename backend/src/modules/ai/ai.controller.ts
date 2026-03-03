import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import {
  AnalyzeDocumentDto,
  BatchActionDto,
  CoherenceCheckDto,
  ExecuteAiTaskDto,
  LaudoAssistDto,
  ProcessAiOutputDto,
  SpecificAnalysisDto,
} from './dto/ai.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('analyze-document')
  @ApiOperation({ summary: 'Monta prompt mestre para análise inicial de PDF processual' })
  analyzeDocument(@Body() dto: AnalyzeDocumentDto) {
    return this.service.analyzeDocument(dto);
  }

  @Post('specific-analysis')
  @ApiOperation({ summary: 'Monta prompt específico por tipo de perícia' })
  specificAnalysis(@Body() dto: SpecificAnalysisDto) {
    return this.service.specificAnalysis(dto);
  }

  @Post('batch-action')
  @ApiOperation({ summary: 'Gera plano de ação em lote baseado em instrução natural (com revisão humana)' })
  batchAction(@Body() dto: BatchActionDto) {
    return this.service.batchAction(dto);
  }

  @Post('coherence-check')
  @ApiOperation({ summary: 'Monta prompt para verificação de coerência clínica' })
  coherenceCheck(@Body() dto: CoherenceCheckDto) {
    return this.service.coherenceCheck(dto);
  }

  @Post('laudo-assist')
  @ApiOperation({ summary: 'Monta prompt para sugestão de seção do laudo (sem conclusão pericial)' })
  laudoAssist(@Body() dto: LaudoAssistDto) {
    return this.service.laudoAssist(dto);
  }

  @Post('execute-task')
  @ApiOperation({ summary: 'Executa task de IA (provider primário/fallback) e aplica pós-processamento' })
  executeTask(@Body() dto: ExecuteAiTaskDto) {
    return this.service.executeTask(dto);
  }

  @Post('process-output')
  @ApiOperation({ summary: 'Valida e pós-processa a resposta do LLM com guardrails de segurança' })
  processOutput(@Body() dto: ProcessAiOutputDto) {
    return this.service.processAiOutput(dto);
  }
}
