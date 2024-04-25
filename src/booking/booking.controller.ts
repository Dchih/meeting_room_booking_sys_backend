import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { generateParseIntPipe } from 'src/utils/generateParseIntPipe';
import { RequireLogin, UserInfo } from 'src/custom.decoretor';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @RequireLogin()
  @Get('list')
  async list(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo'))
    pageNo: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(10),
      generateParseIntPipe('pageSize'),
    )
    pageSize: number,
    @Query('username') username: string,
    @Query('meetingRoomName') meetingRoomName: string,
    @Query('meetingRoomLocation') meetingRoomLocation: string,
    @Query('bookingTimeRangeStart') bookingTimeRangeStart: string,
    @Query('bookingTimeRangeEnd') bookingTimeRangeEnd: string,
  ) {
    return await this.bookingService.find(
      pageNo,
      pageSize,
      username,
      meetingRoomName,
      meetingRoomLocation,
      bookingTimeRangeStart,
      bookingTimeRangeEnd,
    );
  }

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }

  @RequireLogin()
  @Post('add')
  async add(@Body() booking: CreateBookingDto, @UserInfo('id') userId: number) {
    await this.bookingService.add(booking, userId);
    return '添加成功';
  }

  @RequireLogin()
  @Get('apply/:id')
  async apply(@Param('id') id: number) {
    return await this.bookingService.apply(id);
  }

  @RequireLogin()
  @Get('reject/:id')
  async reject(@Param('id') id: number) {
    return await this.bookingService.reject(id);
  }

  @RequireLogin()
  @Get('unbind/:id')
  async unbind(@Param('id') id: number) {
    return await this.bookingService.unbind(id);
  }

  @RequireLogin()
  @Get('urge/:id')
  async urge(@Param('id') id: number) {
    return this.bookingService.urge(id);
  }
}
