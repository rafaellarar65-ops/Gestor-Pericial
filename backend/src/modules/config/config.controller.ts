import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigDomainService } from './config.service';
import { CreateConfigDomainDto, UpdateConfigDomainDto } from './dto/config.dto';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigDomainController {
  constructor(private readonly service: ConfigDomainService) {}

  @Get()
  list() { return this.service.findAll(); }
  @Get(':id')
  get(@Param('id') id: string) { return this.service.findOne(id); }
  @Post()
  create(@Body() dto: CreateConfigDomainDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConfigDomainDto) { return this.service.update(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return { id, removed: true }; }

}
