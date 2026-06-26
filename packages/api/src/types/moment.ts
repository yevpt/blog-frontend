export interface MomentListReq {
  user_id?: number;
  role_id?: number;
  page?: number;
  page_size?: number;
  /** 随机抽样模式：忽略 page，从公开碎语池中随机抽 page_size 条 */
  random?: boolean;
  /** 随机模式下排除的碎语 ID，用于避免连续换一批时重复展示 */
  exclude_ids?: number[];
}

export type AdminMomentStatusFilter = "all" | "public" | "hidden";

export interface AdminMomentListReq {
  page?: number;
  page_size?: number;
  status?: AdminMomentStatusFilter;
  search?: string;
}

/** 碎语独立页 feed 范围 */
export type MomentFeedScope = "all" | "owner" | "friends";

/** 碎语独立页 feed 排序 */
export type MomentFeedSort = "latest" | "hot";

export interface MomentFeedListReq {
  scope: MomentFeedScope;
  sort: MomentFeedSort;
  page?: number;
  page_size?: number;
}

export interface MomentSaveReq {
  id?: number;
  user_id?: number;
  content: string;
  status: 0 | 1;
  comment_status: 0 | 1;
  image_urls?: string[];
  image_order?: string[];
}

export interface MomentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
  roles?: string[];
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

export interface MomentLikeResp {
  is_liked: boolean;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
}

export interface MomentDeleteResp {
  id: number;
}

export interface MomentTopResp {
  id: number;
  is_top: boolean;
}

export interface MomentPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: MomentItemResp[];
}

export interface AdminMomentPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: MomentItemResp[];
}
