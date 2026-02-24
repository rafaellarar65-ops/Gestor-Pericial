import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CategorizeDocumentDto, LinkPericiaDocumentDto, SignedUrlDto, UploadDocumentDto } from './dto/documents.dto';

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
}
