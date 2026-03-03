import { Module } from '@nestjs/common';
import { AnalyticsCalendarController } from './analytics-calendar.controller';
import { AnalyticsCalendarService } from './analytics-calendar.service';

@Module({
  controllers: [AnalyticsCalendarController],
  providers: [AnalyticsCalendarService],
  exports: [AnalyticsCalendarService],
})
export class AnalyticsCalendarModule {}
