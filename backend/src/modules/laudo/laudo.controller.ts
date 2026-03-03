import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CoherenceCheckDto,
  CreateExamPerformedDto,
  CreateExamPlanDto,
  CreatePreLaudoDto,
  ExportPdfDto,
  TranscribeLaudoDto,
  TranscriptionDto,
  UpdateSectionsDto,
} from './dto/laudo.dto';
import { LaudoService } from './laudo.service';

@ApiTags('laudo')
@ApiBearerAuth()
@Controller('laudo')
export class LaudoController {
  constructor(private readonly service: LaudoService) {}


  @Get('pre-laudos')
  listPreLaudos() {
    return this.service.listPreLaudos();
  }
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



  @Post(':id/transcribe')
  @ApiOperation({ summary: 'Transcreve áudio do laudo e atualiza seções do PreLaudo' })
  transcribe(@Param('id') laudoId: string, @Body() dto: TranscribeLaudoDto) {
    return this.service.transcribeLaudo(laudoId, dto);
  }

  @Post(':id/export-docx')
  @ApiOperation({ summary: 'Gera DOCX do laudo com todas as seções' })
  async exportDocx(@Param('id') laudoId: string, @Res({ passthrough: true }) res: {
    setHeader(name: string, value: string): void;
  }) {
    const exported = await this.service.exportDocx(laudoId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
    return exported.buffer;
  }

  @Post('coherence-check')
  coherenceCheck(@Body() dto: CoherenceCheckDto) {
    return this.service.coherenceCheck(dto);
  }
}
