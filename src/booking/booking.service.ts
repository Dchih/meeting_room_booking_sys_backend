import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager, LessThan, Like, MoreThan } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { MeetingRoom } from 'src/meeting_room/entities/meeting_room.entity';
import { Booking } from './entities/booking.entity';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class BookingService {
  @InjectEntityManager()
  private entityManager: EntityManager;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  async initData() {
    const user1 = await this.entityManager.findOneBy(User, {
      id: 1,
    });
    const user2 = await this.entityManager.findOneBy(User, {
      id: 2,
    });

    const room1 = await this.entityManager.findOneBy(MeetingRoom, {
      id: 3,
    });
    const room2 = await this.entityManager.findOneBy(MeetingRoom, {
      id: 6,
    });

    const booking1 = new Booking();
    booking1.user = user1;
    booking1.room = room1;
    booking1.createTime = new Date();
    booking1.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking1);

    const booking2 = new Booking();
    booking2.room = room2;
    booking2.user = user2;
    booking2.startTime = new Date();
    booking2.endTime = new Date(Date.now() + 1000 * 60 * 60);

    await this.entityManager.save(Booking, booking2);
  }

  create(createBookingDto: CreateBookingDto) {
    return 'This action adds a new booking';
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }

  async find(
    pageNo,
    pageSize,
    username,
    meetingRoomName,
    meetingRoomLocation,
    bookingTimeRangeStart,
    bookingTimeRangeEnd,
  ) {
    if (pageNo < 1) {
      throw new BadRequestException('页码不能小于1');
    }
    const skipCount = pageSize * (pageNo - 1);
    const condition: Record<string, any> = {};

    if (username) {
      condition.user = { username: Like(`%${username}%`) };
    }
    if (meetingRoomName) {
      condition.room = {
        name: Like(`%${meetingRoomName}%`),
      };
    }
    if (meetingRoomLocation) {
      if (!condition.room) {
        condition.room = {};
      }
      condition.room.location = Like(`%${meetingRoomLocation}%`);
    }

    if (bookingTimeRangeStart) {
      if (bookingTimeRangeEnd) {
        condition.startTime = Between(
          new Date(bookingTimeRangeStart),
          new Date(bookingTimeRangeEnd),
        );
      }
    }

    const [booking, totalCount] = await this.entityManager.findAndCount(
      Booking,
      {
        skip: skipCount,
        take: pageSize,
        where: condition,
        relations: {
          user: true,
          room: true,
        },
        select: {
          id: true,
          startTime: true,
          user: {
            id: true,
            nickName: true,
          },
        },
      },
    );
    return {
      booking: booking.map((b) => {
        delete b.user.password;
        return b;
      }),
      totalCount,
    };
  }

  async add(bookingDto: CreateBookingDto, userId: number) {
    const meetingRoom = await this.entityManager.findOneBy(MeetingRoom, {
      id: bookingDto.meetingRoomId,
    });
    if (!meetingRoom) {
      throw new BadRequestException('会议室不存在');
    }

    const user = await this.entityManager.findOneBy(User, {
      id: userId,
    });
    const booking = new Booking();
    booking.room = meetingRoom;
    booking.user = user;
    booking.startTime = new Date(bookingDto.startTime);
    booking.endTime = new Date(bookingDto.endTime);

    const res = await this.entityManager.findOneBy(Booking, {
      room: {
        id: meetingRoom.id,
      },
      // 存在 bug
      startTime: LessThan(booking.startTime),
      endTime: MoreThan(booking.endTime),
    });

    if (res) {
      throw new BadRequestException('该时间段已经被锁定');
    }

    await this.entityManager.save(Booking, booking);
  }

  async apply(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '审批通过' });
    return '审批通过';
  }

  async reject(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '审批驳回' });
    return '审批驳回';
  }

  async unbind(id: number) {
    await this.entityManager.update(Booking, { id }, { status: '申请解除' });
    return '申请解除';
  }

  async urge(id: number) {
    const alreadyUrged = await this.redisService.get(`urge_${id}`);
    if (alreadyUrged) {
      return '半小时内只能催办一次，请耐心等待';
    }
    let email = await this.redisService.get(`admin_email`);
    if (!email) {
      const admin = await this.entityManager.findOne(User, {
        select: {
          email: true,
        },
        where: {
          isAdmin: true,
        },
      });
      email = admin.email;
      this.redisService.set(`admin_email`, admin.email, -1);
    }

    await this.emailService.sendMail({
      to: email,
      subject: '预定申请催办提醒',
      html: `id 为 ${id} 的预定申请正在等待审批`,
    });
    this.redisService.set(`urge_${id}`, '1', 30 * 60);
    return '催办成功';
  }
}
