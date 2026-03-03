import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  AutocompleteDto,
  GenerateReportDto,
  ReprocessPericiaDto,
  SaveTemplateDto,
} from './dto/pericia-inteligente.dto';
import { PericiaInteligenteService } from './pericia-inteligente.service';

@ApiTags('pericia-inteligente')
@ApiBearerAuth()
@Controller('api/pericia')
export class PericiaInteligenteController {
  constructor(private readonly service: PericiaInteligenteService) {}

  @Post('extract/:periciaId')
  @ApiOperation({ summary: 'Viagem 1: extrai JSON inicial do PDF sem persistir arquivo bruto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async extract(
    @Param('periciaId', ParseUUIDPipe) periciaId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('PDF obrigatório.');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Envie um arquivo PDF válido.');
    return this.service.extractInitialFromPdf(periciaId, file);
  }

  @Post('reprocess/:periciaId')
  @ApiOperation({ summary: 'Viagem 2: reprocessa discussão com achados + imagens' })
  reprocess(@Param('periciaId', ParseUUIDPipe) periciaId: string, @Body() dto: ReprocessPericiaDto) {
    return this.service.reprocessDiscussion(periciaId, dto);
  }


  @Post('autocomplete/:periciaId')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Autocomplete técnico com contexto do pré-laudo (estilo Google Suggest)' })
  async autocomplete(@Param('periciaId', ParseUUIDPipe) periciaId: string, @Body() dto: AutocompleteDto) {
    const { completion } = await this.service.autocomplete(periciaId, dto);
    return completion;
  }

  @Post('template/:periciaId')
  @ApiOperation({ summary: 'Salva template DOCX oficial do perito' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  saveTemplate(
    @Param('periciaId', ParseUUIDPipe) periciaId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Template DOCX obrigatório.');
    return this.service.saveDocxTemplate(periciaId, file);
  }

  @Post('generate-report/:periciaId')
  @ApiOperation({ summary: 'Gera laudo final preenchendo template DOCX e convertendo para PDF' })
  generateReport(@Param('periciaId', ParseUUIDPipe) periciaId: string, @Body() dto: GenerateReportDto) {
    return this.service.generateReport(periciaId, dto);
  }

  @Post('save-template-path/:periciaId')
  @ApiOperation({ summary: 'Fallback para registrar referência de template externo' })
  saveTemplatePath(@Param('periciaId', ParseUUIDPipe) periciaId: string, @Body() dto: SaveTemplateDto) {
    return this.service.saveTemplatePath(periciaId, dto.templateDocxPath, dto.templateName);
  }
}
