// packages/api/src/types/moment.ts

export interface MomentListReq {
  user_id?: number;
  role_id?: number;
  page?: number;
  page_size?: number;
}

export interface MomentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface MomentMediaResp {
  id: number;
  name: string;
  file_type: string;
  url: string;
  /** 可直接访问的图片地址 */
  access_url: string;
  size: number;
  seq: number;
}

export interface MomentItemResp {
  id: number;
  user_id: number;
  content: string;
  status: 0 | 1;
  comment_status: 0 | 1;
  read_count: number;
  is_top: boolean;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_liked: boolean;
  user?: MomentUserResp;
  images: MomentMediaResp[];
  created_at: string;
  updated_at: string;
}

export interface MomentPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: MomentItemResp[];
}
