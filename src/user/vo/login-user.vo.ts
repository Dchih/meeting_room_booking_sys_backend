interface UserInfo {
  id: number;

  username: string;

  nickname: string;

  email: string;

  avatar: string;

  phonenumber: string;

  isFrozen: boolean;

  isAdmin: boolean;

  createTime: number;

  roles: string[];

  permissions: string[];
}

export class LoginUserVo {
  userInfo: UserInfo;
  accessToken: string;
  refreshToken: string;
}
