import { ApiProperty } from '@nestjs/swagger';

class UserVo {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  nickName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  isFrozen: boolean;

  @ApiProperty()
  avatar: string;

  @ApiProperty()
  createTime: Date;
}

export class UserListVo {
  @ApiProperty({ type: [UserVo] })
  users: UserVo[];

  @ApiProperty()
  totalCount: number;
}
