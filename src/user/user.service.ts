import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { md5 } from 'src/utils/md5';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { RedisService } from 'src/redis/redis.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { LoginUserDto } from './dto/LoginUser.dto';
import { LoginUserVo } from './vo/login-user.vo';
import { UpdateUserPasswordDto } from './dto/UpdateUserPassword.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  @InjectRepository(Role)
  private roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  @Inject(RedisService)
  private redisService: RedisService;

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }

  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }
    if (user.captcha !== captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });

    if (foundUser) {
      throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
    }

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);
    newUser.nickName = user.nickname;
    newUser.email = user.email;

    try {
      await this.userRepository.save(newUser);
      return `注册成功`;
    } catch (e) {
      this.logger.error(e, UserService);
      return `注册失败`;
    }
  }

  async login(loginUserDto: LoginUserDto, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        username: loginUserDto.username,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    if (user.password !== md5(loginUserDto.password)) {
      throw new HttpException('密码错误', HttpStatus.BAD_REQUEST);
    }
    const vo = new LoginUserVo();
    vo.userInfo = {
      id: user.id,
      username: user.username,
      nickname: user.nickName,
      email: user.email,
      avatar: user.avatar,
      phonenumber: user.phoneNumber,
      isFrozen: user.isFrozen,
      isAdmin: user.isAdmin,
      createTime: user.createTime.getTime(),
      roles: user.roles.map((role) => role.name),
      permissions: user.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };

    return vo;
  }

  async findUserById(userId: number, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });
    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      roles: user.roles.map((item) => item.name),
      permissions: user.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };
  }

  async findUserDetailById(id: number) {
    return await this.userRepository.findOne({
      where: {
        id,
      },
    });
  }

  async updatePassword(id: number, passwordDto: UpdateUserPasswordDto) {
    const captcha = await this.redisService.get(
      `update_password_captcha_${passwordDto.email}`,
    );
    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }
    if (captcha !== passwordDto.captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.userRepository.findOneBy({
      id,
    });

    foundUser.password = md5(passwordDto.password);

    try {
      await this.userRepository.save(foundUser);
      return '密码修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '密码修改失败';
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisService.get(
      `update_captcha_${updateUserDto.email}`,
    );
    if (!captcha) {
      throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
    }
    if (captcha !== updateUserDto.captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.userRepository.findOneBy({
      id,
    });

    if (updateUserDto.nickName) {
      foundUser.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.email) {
      foundUser.avatar = updateUserDto.avatar;
    }
    try {
      await this.userRepository.save(foundUser);
      return '修改成功';
    } catch (e) {
      await this.logger.error(e, UserService);
      return '用户信息修改成功';
    }
  }
}
