import {
  Controller,
  Post,
  Body,
  Inject,
  Get,
  Query,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';
import { LoginUserDto } from './dto/LoginUser.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RequireLogin, UserInfo } from 'src/custom.decoretor';
import { UserDetailVo } from './vo/user.info.vo';
import { UpdateUserPasswordDto } from './dto/UpdateUserPassword.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { generateParseIntPipe } from 'src/utils/generateParseIntPipe';
import {
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RefreshTokenVo } from './vo/refresh-token.vo';

interface UserInfoForToken {
  id: number;
  username: string;
  isAdmin: boolean;
  roles: string[];
  permissions: any[];
}

@ApiTags('用户管理模块')
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

  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱地址',
    required: true,
    example: 'xxx@xx.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '发送成功',
    type: String,
  })
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

  @ApiBody({
    type: RegisterUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/验证码不正确/用户已存在',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '注册成功/失败',
    type: String,
  })
  @Post('register')
  register(@Body() registerUser: RegisterUserDto) {
    return this.userService.register(registerUser);
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '用户不存在/密码错误',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息/token',
    type: String,
  })
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

  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: '刷新Token',
    required: true,
    example: '很长的Token',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'token 已失效，请重新登录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: RefreshTokenVo,
  })
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

  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'success',
    type: UserDetailVo,
  })
  @Get('info')
  @RequireLogin()
  async info(@UserInfo('id') id: number) {
    const user = await this.userService.findUserDetailById(id);
    const vo = new UserDetailVo();
    vo.id = user.id;
    vo.email = user.email;
    vo.username = user.username;
    vo.nickName = user.nickName;
    vo.avatar = user.avatar;
    vo.phoneNumber = user.phoneNumber;
    vo.isFrozen = user.isFrozen;
    vo.createTime = user.createTime;
    return vo;
  }

  @ApiBearerAuth()
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiResponse({
    type: String,
    description: '验证码已失效/不正确',
  })
  @Post(['update_password', 'admin/update_password'])
  @RequireLogin()
  async updatePassword(
    @UserInfo('id') id: number,
    @Body() passwordDto: UpdateUserPasswordDto,
  ) {
    return await this.userService.updatePassword(id, passwordDto);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱',
  })
  @ApiResponse({
    type: String,
    description: '发送成功',
  })
  @RequireLogin()
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(
      `update_password_captcha_${address}`,
      code,
      10 * 60,
    );
    await this.emailService.sendMail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>你的更改密码验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/不正确',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    description: '更新成功',
  })
  @Post('update')
  @RequireLogin()
  async update(
    @UserInfo('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱',
  })
  @ApiResponse({
    type: String,
    description: '发送成功',
  })
  @Get('update/captcha')
  async updateCaptcha(@UserInfo('address') address: string) {
    if (!address) {
      throw new HttpException(
        '参数错误，请提供邮箱地址',
        HttpStatus.BAD_REQUEST,
      );
    }
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`update_captcha_${address}`, code, 10 * 60);
    await this.emailService.sendMail({
      to: address,
      subject: '更新个人信息验证码',
      html: `<p>你的验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'id',
    type: String,
    description: '用户id',
  })
  @ApiResponse({
    type: String,
    description: '冻结成功',
  })
  @Post('freeze')
  async freeze(@UserInfo('id') id: number) {
    return await this.userService.updateFreezeStatus(id, true);
  }

  @Post('unfreeze')
  async unfreeze(@UserInfo('id') id: number) {
    return await this.userService.updateFreezeStatus(id, false);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'pageNo',
    type: Number,
    description: '第几页',
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
    description: '每页几条',
  })
  @ApiQuery({
    name: 'username',
    type: String,
    description: '用户名',
  })
  @ApiQuery({
    name: 'nickName',
    type: String,
    description: '昵称',
  })
  @ApiQuery({
    name: 'email',
    type: String,
    description: '邮箱',
  })
  @RequireLogin()
  @Get('list')
  async list(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo'))
    pageNo: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(0),
      generateParseIntPipe('pageSize'),
    )
    pageSize: number,
    @Query('username') username?: string,
    @Query('nickName') nickName?: string,
    @Query('email') email?: string,
  ) {
    return await this.userService.findUsers(
      pageNo,
      pageSize,
      username,
      nickName,
      email,
    );
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
    const vo = new RefreshTokenVo();
    vo.access_token = access_token;
    vo.refresh_token = refresh_token;
    return vo;
  }
}
