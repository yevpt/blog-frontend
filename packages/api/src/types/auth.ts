// packages/api/src/types/auth.ts

/** 发送邮箱验证码 */
export interface SendCodeReq {
  email: string;
}

/** 邮箱注册 */
export interface RegisterReq {
  email: string;
  password: string;
  code: string;
  nickname?: string;
}

/** 登录（username / email / phone 三合一） */
export interface LoginReq {
  identifier: string;
  password: string;
}

/** 刷新 token */
export interface RefreshReq {
  refresh_token: string;
}

/** 用户信息（注册 / 登录均返回） */
export interface UserResp {
  id: number;
  username: string;
  email?: string;
  nickname?: string;
  roles?: string[];
}

/** 登录成功响应 */
export interface LoginResp {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserResp;
}

/** 刷新 token 响应 */
export interface TokenResp {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
