import { Controller, Get, Inject, Query } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { RequireLogin } from 'src/custom.decoretor';

@Controller('statistic')
export class StatisticController {
  @Inject(StatisticService)
  private statisticService: StatisticService;

  @RequireLogin()
  @Get('user-booking-count')
  async userBookingCount(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return await this.statisticService.userBookingCount(startTime, endTime);
  }

  @RequireLogin()
  @Get('meeting-room-used-count')
  async meetingRoomUsedCount(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return await this.statisticService.meetingRoomUsedCount(startTime, endTime);
  }
}
