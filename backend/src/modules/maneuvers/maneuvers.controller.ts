import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateManeuversDto, MediaUploadDto, ProtocolDto, SearchManeuversDto, UpdateManeuversDto } from './dto/maneuvers.dto';
import { ManeuversService } from './maneuvers.service';

@ApiTags('maneuvers')
@ApiBearerAuth()
@Controller('maneuvers')
export class ManeuversController {
  constructor(private readonly service: ManeuversService) {}

  @Get()
  list(@Query() query: SearchManeuversDto) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateManeuversDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateManeuversDto) {
    return this.service.update(id, dto);
  }

  @Post('media-upload')
  @ApiOperation({ summary: 'Vincula mídia a uma manobra física' })
  mediaUpload(@Body() dto: MediaUploadDto) {
    return this.service.mediaUpload(dto);
  }

  @Post('protocols')
  protocols(@Body() dto: ProtocolDto) {
    return this.service.protocols(dto);
  }
}
