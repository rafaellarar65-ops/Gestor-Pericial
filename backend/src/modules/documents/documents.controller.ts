import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';
import { DocumentsService } from './documents.service';
import {
  CategorizeDocumentDto,
  CreateDocumentDto,
  GetDocumentSignedUrlDto,
  LinkPericiaDocumentDto,
  SignedUrlDto,
  UploadDocumentDto,
} from './dto/documents.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(@Query('periciaId') periciaId?: string) {
    return this.service.list(periciaId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Registra upload de documento para storage' })
  upload(@Body() dto: UploadDocumentDto) {
    return this.service.upload(dto);
  }

  @Post('download-signed-url')
  @ApiOperation({ summary: 'Gera signed URL temporária para download' })
  downloadSignedUrl(@Body() dto: SignedUrlDto) {
    return this.service.downloadSignedUrl(dto);
  }

  @Post('categorize')
  categorize(@Body() dto: CategorizeDocumentDto) {
    return this.service.categorize(dto);
  }

  @Post('link-pericia')
  linkPericia(@Body() dto: LinkPericiaDocumentDto) {
    return this.service.linkPericia(dto);
  }

  // ── Patient-scoped Document endpoints (PR #137) ─────────────────────────

  @Get('v2')
  @ApiOperation({ summary: 'Lista documentos (patient-scoped)' })
  listDocuments(
    @Query('periciaId') periciaId?: string,
    @Query('categoria') categoria?: DocumentCategory,
  ) {
    return this.service.listDocuments(periciaId, categoria);
  }

  @Post('v2')
  @ApiOperation({ summary: 'Cria documento (patient-scoped)' })
  createDocument(@Body() dto: CreateDocumentDto) {
    return this.service.createDocument(dto);
  }

  @Get('v2/:id/signed-url')
  @ApiOperation({ summary: 'Gera URL assinada para download' })
  getDocumentSignedUrl(
    @Param('id') id: string,
    @Query() query: GetDocumentSignedUrlDto,
  ) {
    return this.service.getDocumentSignedUrl(id, query.expiresInSeconds);
  }

  @Delete('v2/:id')
  @ApiOperation({ summary: 'Remove documento' })
  deleteDocument(@Param('id') id: string) {
    return this.service.deleteDocument(id);
  }
}
