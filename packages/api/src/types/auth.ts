// packages/api/src/types/auth.ts

/** 发送邮箱验证码 */
export interface SendCodeReq {
  email: string;
  captcha_token: string;
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

/** 管理后台登录（仅用户名 + 密码） */
export interface AdminLoginReq {
  username: string;
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

/** GoCaptcha 注册挑战 */
export interface CaptchaChallengeResp {
  challenge_id: string;
  master_image: string;
  tile_image: string;
  tile_x: number;
  tile_y: number;
  tile_width: number;
  tile_height: number;
  image_width: number;
  image_height: number;
}

/** GoCaptcha 注册校验 */
export interface CaptchaVerifyReq {
  challenge_id: string;
  x: number;
  y: number;
}

/** GoCaptcha 校验通过票据 */
export interface CaptchaVerifyResp {
  captcha_token: string;
}

/** 获取 OAuth 授权地址响应 */
export interface OAuthAuthorizeResp {
  authorize_url: string;
}

/**
 * OAuth callback 处理响应
 * - action="login" 时 login 字段存在，包含 token 和用户信息
 * - action="bind" 时 binding 字段存在（本次不实现）
 */
export interface OAuthCallbackResp {
  action: "login" | "bind";
  login?: LoginResp;
}
