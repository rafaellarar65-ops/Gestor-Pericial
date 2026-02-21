import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategorizeKnowledgeDto, CreateKnowledgeDto, SearchKnowledgeDto, UpdateKnowledgeDto } from './dto/knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateKnowledgeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDto) {
    return this.service.update(id, dto);
  }

  @Get('search-fulltext')
  @ApiOperation({ summary: 'Busca textual em base de conhecimento' })
  searchFulltext(@Query() query: SearchKnowledgeDto) {
    return this.service.searchFulltext(query);
  }

  @Post('categorize')
  categorize(@Body() dto: CategorizeKnowledgeDto) {
    return this.service.categorize(dto);
  }
}
