import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto } from './dto/knowledge.dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Get()
  list() { return this.service.findAll(); }
  @Post()
  create(@Body() dto: CreateKnowledgeDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDto) { return this.service.update(id, dto); }
  @Get('search-fulltext')
  search_fulltext() { return { action: 'search-fulltext', module: 'knowledge' }; }
  @Post('categorize')
  categorize() { return { action: 'categorize', module: 'knowledge' }; }

}
