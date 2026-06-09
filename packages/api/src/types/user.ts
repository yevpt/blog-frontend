// packages/api/src/types/user.ts

/** 用户扩展资料 */
export interface UserMetaResp {
  name?: string;
  description?: string;
  gender?: number;
  birthday?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
}

/** 用户偏好设置 */
export interface UserSettingResp {
  mail_show: number;
  mail_receive: number;
  dark_mode: number;
  receive_mail: boolean;
  show_name: boolean;
  show_age: boolean;
  show_phone: boolean;
  show_qq: boolean;
  show_wechat: boolean;
  show_zhihu: boolean;
  show_sina: boolean;
  show_bili: boolean;
  show_position: boolean;
}

/** 用户社交链接 */
export interface UserSocialLinkResp {
  platform: string;
  url: string;
}

/** 当前登录用户详情（GET /users/me） */
export interface UserDetailResp {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  site?: string;
  avatar_url?: string;
  mark?: string;
  status: number;
  last_login_at?: string;
  roles: string[];
  meta?: UserMetaResp;
  setting?: UserSettingResp;
  social_links?: UserSocialLinkResp[];
}

export interface UserListReq {
  page?: number;
  page_size?: number;
  role_id?: number;
}

export interface UserListItemResp {
  id: number;
  nickname?: string;
  avatar_url?: string;
  mark?: string;
  roles: string[];
  last_login_at?: string;
}

export interface UserPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: UserListItemResp[];
}
