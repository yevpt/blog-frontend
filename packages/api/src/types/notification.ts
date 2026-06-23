export interface NotificationListReq {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
}

export interface NotificationActorUserResp {
  id: number;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface NotificationItemResp {
  id: number;
  event_id: number;
  type: string;
  title: string;
  content_excerpt: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  actor_user_id?: number;
  actor_user?: NotificationActorUserResp;
  source_type: string;
  source_id: number;
  root_type: string;
  root_id: number;
  source_deleted: boolean;
  root_deleted: boolean;
  metadata?: string;
  /** 当前点赞数；仅 comment / reply / guestbook 来源填充 */
  like_count?: number;
  /** 当前登录用户是否已点赞；仅 comment / reply / guestbook 来源填充 */
  is_liked?: boolean;
  /** 回复数：评论/留言为其下全部回复数，回复为其跟评数 */
  reply_count?: number;
}

export interface NotificationPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  page: number;
  page_size: number;
  list: NotificationItemResp[];
}

export interface NotificationUnreadCountResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  count: number;
}

export interface NotificationReadAllReq {
  ids?: number[];
  all?: boolean;
}

export interface NotificationReadResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  updated: number;
}
