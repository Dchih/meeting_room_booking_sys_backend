import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMeetingRoomDto } from './dto/create-meeting_room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting_room.dto';
import { MeetingRoom } from './entities/meeting_room.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

@Injectable()
export class MeetingRoomService {
  @InjectRepository(MeetingRoom)
  private repository: Repository<MeetingRoom>;

  initData() {
    const room1 = new MeetingRoom();
    room1.name = '一层会议室';
    room1.capacity = 10;
    room1.equipment = '白板';
    room1.location = '一层西';

    const room2 = new MeetingRoom();
    room2.name = '金星';
    room2.capacity = 5;
    room2.equipment = '';
    room2.location = '二层东';

    const room3 = new MeetingRoom();
    room3.name = '天王星';
    room3.capacity = 30;
    room3.equipment = '白板，电视';
    room3.location = '三层东';

    this.repository.insert([room1, room2, room3]);
  }

  async create(createMeetingRoomDto: CreateMeetingRoomDto) {
    const room = await this.repository.findOneBy({
      name: createMeetingRoomDto.name,
    });
    if (room) {
      throw new BadRequestException('会议室名字已存在');
    }
    return await this.repository.save(createMeetingRoomDto);
  }

  findAll() {
    return `This action returns all meetingRoom`;
  }

  async findOne(id: number) {
    return await this.repository.findOneBy({
      id,
    });
  }

  updatePart(id: number, updateMeetingRoomDto: UpdateMeetingRoomDto) {
    return `This action updates a #${id}, ${updateMeetingRoomDto} meetingRoom`;
  }

  async remove(id: number) {
    await this.repository.delete({
      id,
    });
    return '删除成功';
  }

  async find(
    pageNo: number,
    pageSize: number,
    capacity: number,
    name: string,
    equipment: string,
  ) {
    if (pageNo < 1) {
      throw new BadRequestException('页码最小为1');
    }
    const skipCount = pageSize * (pageNo - 1);

    const condition: Record<string, any> = {};
    if (capacity) {
      condition.capacity = capacity;
    }
    if (name) {
      condition.name = Like(`%${name}%`);
    }
    if (equipment) {
      condition.equipment = Like(`%${equipment}%`);
    }

    const [meetingRoom, totalCount] = await this.repository.findAndCount({
      skip: skipCount,
      take: pageSize,
      where: condition,
    });
    return {
      meetingRoom,
      totalCount,
    };
  }

  async update(meetingRoomDto: UpdateMeetingRoomDto) {
    const meetingRoom = await this.repository.findOneBy({
      id: meetingRoomDto.id,
    });
    if (!meetingRoom) {
      throw new BadRequestException('会议室不存在');
    }
    meetingRoom.capacity = meetingRoomDto.capacity;
    meetingRoom.location = meetingRoomDto.location;
    meetingRoom.name = meetingRoomDto.name;

    if (meetingRoomDto.equipment) {
      meetingRoom.equipment = meetingRoomDto.equipment;
    }

    if (meetingRoomDto.description) {
      meetingRoom.description = meetingRoomDto.description;
    }

    await this.repository.update({ id: meetingRoom.id }, meetingRoom);
    return '更新成功';
  }
}
