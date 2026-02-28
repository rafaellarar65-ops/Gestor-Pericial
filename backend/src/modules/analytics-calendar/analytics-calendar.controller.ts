import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsCalendarService } from './analytics-calendar.service';
import { AnalyticsCalendarQueryDto } from './dto/analytics-calendar.dto';

@ApiTags('analytics-calendar')
@ApiBearerAuth()
@Controller('analytics-calendar')
export class AnalyticsCalendarController {
  constructor(private readonly service: AnalyticsCalendarService) {}

  @Get('overview')
  @ApiOperation({ summary: 'KPIs, timeline e dados diários para heatmap financeiro' })
  overview(@Query() query: AnalyticsCalendarQueryDto) {
    return this.service.overview(query);
  }
}
