export interface ArticleRelationResp {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
}

export interface ArticleUserResp {
  id: number;
  username: string;
  nickname?: string;
  /** 后端返回的 CDN 化头像地址 */
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export type ArticleListSortBy = "created_at" | "updated_at" | "category" | "status" | "recommended";

export type ArticleListSortOrder = "asc" | "desc";

export interface ArticleListReq {
  page?: number;
  page_size?: number;
  recommend?: boolean;
  /** Must be a positive integer (uint on backend) */
  category_id?: number;
  /** Must be a positive integer (uint on backend) */
  tag_id?: number;
  /** 搜索关键词，匹配标题和摘要 */
  search?: string;
  sort_by?: ArticleListSortBy;
  sort_order?: ArticleListSortOrder;
}

export interface ArticleListItemResp {
  id: number;
  title: string;
  cover_img_url?: string;
  short_content?: string;
  user_id: number;
  status: number;
  comment_status: number;
  read_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
  is_liked: boolean;
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_recommended: boolean;
  user?: ArticleUserResp;
  category?: ArticleRelationResp;
  created_at: string;
  updated_at: string;
}

export interface ArticleLikeResp {
  is_liked: boolean;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
}

export interface ArticlePageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: ArticleListItemResp[];
}

/** 管理端文章列表项，含软删除时间 */
export interface AdminArticleListItemResp extends ArticleListItemResp {
  deleted_at?: string;
}

/** 管理端文章分页响应 */
export interface AdminArticlePageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: AdminArticleListItemResp[];
}

export interface MusicItem {
  id: number;
  name: string;
  singer: string;
  album: string;
  url: string;
  duration: number;
}

export interface ArticleDetailResp {
  id: number;
  title: string;
  cover_img_url?: string;
  content: string;
  short_content?: string;
  user_id: number;
  status: number;
  comment_status: number;
  read_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_liked?: boolean;
  is_recommended: boolean;
  music_ids?: number[];
  music?: MusicItem[];
  user?: ArticleUserResp;
  category?: ArticleRelationResp;
  tags?: ArticleRelationResp[];
  created_at: string;
  updated_at: string;
}
