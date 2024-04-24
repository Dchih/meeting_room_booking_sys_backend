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
  Put,
} from '@nestjs/common';
import { MeetingRoomService } from './meeting_room.service';
import { CreateMeetingRoomDto } from './dto/create-meeting_room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting_room.dto';
import { generateParseIntPipe } from 'src/utils/generateParseIntPipe';
import { RequireLogin } from 'src/custom.decoretor';

@Controller('meeting-room')
export class MeetingRoomController {
  constructor(private readonly meetingRoomService: MeetingRoomService) {}

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
    @Query('capacity') capacity: number,
    @Query('name') name: string,
    @Query('equipment') equipment: string,
  ) {
    return await this.meetingRoomService.find(
      pageNo,
      pageSize,
      capacity,
      name,
      equipment,
    );
  }

  @RequireLogin()
  @Post('create')
  create(@Body() createMeetingRoomDto: CreateMeetingRoomDto) {
    return this.meetingRoomService.create(createMeetingRoomDto);
  }

  @RequireLogin()
  @Put('update')
  async update(@Body() meetingRoomDto: UpdateMeetingRoomDto) {
    return this.meetingRoomService.update(meetingRoomDto);
  }

  @RequireLogin()
  @Get()
  findAll() {
    return this.meetingRoomService.findAll();
  }

  @RequireLogin()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingRoomService.findOne(+id);
  }

  @RequireLogin()
  @Patch(':id')
  updatePart(
    @Param('id') id: string,
    @Body() updateMeetingRoomDto: UpdateMeetingRoomDto,
  ) {
    return this.meetingRoomService.updatePart(+id, updateMeetingRoomDto);
  }

  @RequireLogin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.meetingRoomService.remove(+id);
  }
}
