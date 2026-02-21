import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentsDto, UpdateDocumentsDto } from './dto/documents.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post('upload')
  upload() { return { action: 'upload', module: 'documents' }; }
  @Get('download-signed-url')
  download_signed_url() { return { action: 'download-signed-url', module: 'documents' }; }
  @Post('categorize')
  categorize() { return { action: 'categorize', module: 'documents' }; }
  @Post('link-pericia')
  link_pericia() { return { action: 'link-pericia', module: 'documents' }; }

}
