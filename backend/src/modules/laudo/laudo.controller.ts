import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CoherenceCheckDto,
  CreateExamPerformedDto,
  CreateExamPlanDto,
  CreatePreLaudoDto,
  ExportPdfDto,
  TranscriptionDto,
  UpdateSectionsDto,
} from './dto/laudo.dto';
import { LaudoService } from './laudo.service';

@ApiTags('laudo')
@ApiBearerAuth()
@Controller('laudo')
export class LaudoController {
  constructor(private readonly service: LaudoService) {}

  @Post('pre-laudo')
  createPreLaudo(@Body() dto: CreatePreLaudoDto) {
    return this.service.createPreLaudo(dto);
  }

  @Post('sections')
  updateSections(@Body() dto: UpdateSectionsDto) {
    return this.service.updateSections(dto);
  }

  @Post('exam-plan')
  createExamPlan(@Body() dto: CreateExamPlanDto) {
    return this.service.createExamPlan(dto);
  }

  @Post('exam-performed')
  createExamPerformed(@Body() dto: CreateExamPerformedDto) {
    return this.service.createExamPerformed(dto);
  }

  @Post('transcription')
  @ApiOperation({ summary: 'Proxy de transcrição de áudio para IA' })
  transcription(@Body() dto: TranscriptionDto) {
    return this.service.transcription(dto);
  }

  @Post('export-pdf')
  exportPdf(@Body() dto: ExportPdfDto) {
    return this.service.exportPdf(dto);
  }

  @Post('coherence-check')
  coherenceCheck(@Body() dto: CoherenceCheckDto) {
    return this.service.coherenceCheck(dto);
  }
}
