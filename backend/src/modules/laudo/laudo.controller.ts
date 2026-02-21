import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LaudoService } from './laudo.service';
import { CreateLaudoDto, UpdateLaudoDto } from './dto/laudo.dto';

@ApiTags('laudo')
@ApiBearerAuth()
@Controller('laudo')
export class LaudoController {
  constructor(private readonly service: LaudoService) {}

  @Post('pre-laudo')
  pre_laudo() { return { action: 'pre-laudo', module: 'laudo' }; }
  @Post('sections')
  sections() { return { action: 'sections', module: 'laudo' }; }
  @Post('exam-plan')
  exam_plan() { return { action: 'exam-plan', module: 'laudo' }; }
  @Post('exam-performed')
  exam_performed() { return { action: 'exam-performed', module: 'laudo' }; }
  @Post('transcription')
  transcription() { return { action: 'transcription', module: 'laudo' }; }
  @Post('export-pdf')
  export_pdf() { return { action: 'export-pdf', module: 'laudo' }; }
  @Post('coherence-check')
  coherence_check() { return { action: 'coherence-check', module: 'laudo' }; }

}
