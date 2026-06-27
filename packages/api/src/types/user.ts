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
  /** 副邮箱（后端在 GET /users/me 的 meta 中返回） */
  sub_email?: string | null;
  /** 副邮箱是否已验证 */
  sub_email_verified?: boolean;
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
  /** 主邮箱是否已验证；旧用户缺省视为 false */
  email_verified?: boolean;
  phone?: string;
  site?: string;
  avatar_url?: string;
  mark?: string;
  status: number;
  last_login_at?: string;
  last_active_at?: string;
  is_online?: boolean;
  roles: string[];
  /** 是否已设置登录密码（第三方注册用户可能为 false） */
  password_set?: boolean;
  meta?: UserMetaResp;
  setting?: UserSettingResp;
  social_links?: UserSocialLinkResp[];
}

/** GET /users/:id — 某用户的公开详情 */
export interface UserPublicProfileResp {
  id: number;
  nickname: string;
  avatar_url: string | null;
  mark: string | null;
  description: string | null;
  last_login_at: string | null;
  last_active_at?: string | null;
  is_online?: boolean;
  register_at: string;
  roles: string[];
  display_email: string | null;
  site: string | null;
  social_links: UserSocialLinkResp[];
  gender: string | null;
  birthday: string | null;
}

/** PATCH /users/me/email/display */
export type EmailDisplaySetting = "main" | "sub" | "none";

/** GET /users/me/oauth-bindings | GET /oauth/bindings — 已绑定的第三方 */
export interface OAuthBindingResp {
  source: string;
  social_user_id: number;
}

/** PATCH /users/me/email */
export interface UpdateEmailReq {
  target: "main" | "sub";
  email: string;
  code: string;
}

/** POST /users/me/email/code */
export interface SendAccountEmailCodeReq {
  email: string;
  captcha_token: string;
}

/** PATCH /users/me/password/initial */
export interface SetInitialPasswordReq {
  new_password: string;
  code: string;
}

/** PATCH /users/me/profile 请求体 */
export interface UpdateProfileReq {
  nickname?: string;
  mark?: string;
  description?: string;
  site?: string | null;
}

/** PATCH /users/me/meta 请求体 */
export interface UpdateMetaReq {
  gender?: string | null;
  birthday?: string | null;
  phone?: string | null;
  sub_email?: string | null;
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
  last_active_at?: string;
  is_online?: boolean;
}

export interface UserPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: UserListItemResp[];
}

/** GET /users/:id/likes — type 查询参数 */
export type LikedContentFilter = "article" | "comment" | "guestbook" | "moment";

/** 点赞列表项内容类型（含回复） */
export type LikedContentKind = "article" | "comment" | "reply" | "guestbook" | "moment";

export interface UserLikedContentListReq {
  page?: number;
  page_size?: number;
  type?: LikedContentFilter;
}

export interface UserLikedContentAuthorResp {
  id: number;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  roles?: string[];
}

export interface UserLikedContentItemResp {
  id: number;
  liked_at: string;
  kind: LikedContentKind;
  filter: LikedContentFilter;
  author?: UserLikedContentAuthorResp;
  content: {
    id: number;
    title?: string;
    excerpt: string;
    cover_img_url?: string;
    deleted?: boolean;
  };
  parent?: {
    kind: "comment" | "guestbook";
    id: number;
    excerpt: string;
    deleted?: boolean;
  };
  root?: {
    kind: "article" | "moment" | "guestbook";
    id: number;
    title?: string;
    excerpt?: string;
    deleted?: boolean;
  };
  /** 回复被 @ 的用户（reply 类型；与评论模块 to_user 对齐） */
  reply_to?: UserLikedContentAuthorResp;
  to_user?: UserLikedContentAuthorResp;
  stats?: {
    like_count?: number;
    comment_count?: number;
  };
}

export interface UserLikedContentPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: UserLikedContentItemResp[];
}

/** GET /users/:id/likes/count */
export interface UserLikesCountResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  count: number;
}

/** GET /users/:id/moments/count */
export interface UserMomentsCountResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  count: number;
}

/** POST/DELETE /admin/users/:id/roles/vip — 授予或取消 VIP 后的角色快照 */
export interface AdminUserRolesResp {
  user_id: number;
  roles: string[];
}

/** POST /admin/users/avatars/normalize — 归一化老用户头像请求；不传 user_id 时处理全部 */
export interface NormalizeAvatarsReq {
  user_id?: number;
  clear_invalid?: boolean;
}

/** POST /admin/users/avatars/normalize — 单个用户处理结果 */
export interface NormalizeAvatarItem {
  user_id: number;
  status: string;
  old_key?: string;
  new_key?: string;
  message?: string;
}

/** POST /admin/users/avatars/normalize — 批量归一化老用户头像响应 */
export interface NormalizeAvatarsResp {
  scanned: number;
  storage_scanned?: number;
  updated: number;
  cleared: number;
  purged?: number;
  skipped: number;
  ok: number;
  failed: number;
  items: NormalizeAvatarItem[];
}

/** POST /admin/users/:id/avatar/clear — 清除用户头像响应 */
export interface ClearUserAvatarResp {
  user_id: number;
  old_key?: string;
}

/** GET /users/presence — 在线状态批次查询响应 */
export interface BatchPresenceResp {
  data: Record<string, { is_online: boolean; last_active_at?: number; last_login_at?: number }>;
}
