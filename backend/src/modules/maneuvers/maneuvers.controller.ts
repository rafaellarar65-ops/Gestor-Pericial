import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ManeuversService } from './maneuvers.service';
import { CreateManeuversDto, UpdateManeuversDto } from './dto/maneuvers.dto';

@ApiTags('maneuvers')
@ApiBearerAuth()
@Controller('maneuvers')
export class ManeuversController {
  constructor(private readonly service: ManeuversService) {}

  @Get()
  list() { return this.service.findAll(); }
  @Post()
  create(@Body() dto: CreateManeuversDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateManeuversDto) { return this.service.update(id, dto); }
  @Post('media-upload')
  media_upload() { return { action: 'media-upload', module: 'maneuvers' }; }
  @Post('protocols')
  protocols() { return { action: 'protocols', module: 'maneuvers' }; }

}
