export interface NotificationListReq {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
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
  source_type: string;
  source_id: number;
  root_type: string;
  root_id: number;
  metadata?: string;
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
