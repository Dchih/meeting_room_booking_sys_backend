import {
  Controller,
  Post,
  Body,
  Inject,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';
import { LoginUserDto } from './dto/LoginUser.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface UserInfoForToken {
  id: number;
  username: string;
  isAdmin: boolean;
  roles: string[];
  permissions: any[];
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(ConfigService)
  private configService: ConfigService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`captcha_${address}`, code, 5 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<p>你的注册码是：${code}`,
    });
    return '发送成功';
  }

  @Post('register')
  register(@Body() registerUser: RegisterUserDto) {
    return this.userService.register(registerUser);
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @Post('login')
  async userLogin(@Body() loginUserDto: LoginUserDto) {
    const vo = await this.userService.login(loginUserDto, false);
    const token = this.generateToken(vo.userInfo);
    Object.assign(vo, token);
    return vo;
  }

  @Post('admin/login')
  async adminLogin(@Body() loginUserDto: LoginUserDto) {
    const vo = await this.userService.login(loginUserDto, true);
    const token = this.generateToken(vo.userInfo);
    Object.assign(vo, token);
    return vo;
  }

  @Get('refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.id, false);

      return this.generateToken(user);
    } catch (e) {
      throw new UnauthorizedException('token 已失效, 请重新登录');
    }
  }

  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.userId, true);

      return this.generateToken(user);
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  generateToken(user: UserInfoForToken) {
    const access_token = this.jwtService.sign(
      {
        id: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
      },
      {
        expiresIn:
          this.configService.get('jwt_access_token_expires_time') || '30m',
      },
    );

    const refresh_token = this.jwtService.sign(
      {
        id: user.id,
      },
      {
        expiresIn:
          this.configService.get('jwt_refresh_token_expres_time') || '10s',
      },
    );
    return {
      access_token,
      refresh_token,
    };
  }
}
