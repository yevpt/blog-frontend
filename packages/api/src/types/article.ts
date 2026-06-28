import type { MusicItemResp } from "./music";

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
  /** 是否为加密文章 */
  passworded?: boolean;
  category_ids?: number[];
  categories?: ArticleRelationResp[];
  tag_ids?: number[];
  music_ids?: number[];
  music?: MusicItemResp[];
  user?: ArticleUserResp;
  category?: ArticleRelationResp;
  tags?: ArticleRelationResp[];
  recommend_seq?: number;
  created_at: string;
  updated_at: string;
}

/** 文章标签关联保存请求 */
export interface ArticleTagSaveReq {
  tag_id: number;
  seq: number;
}

/** 新增或更新文章请求 */
export interface ArticleSaveReq {
  id?: number;
  title: string;
  cover_img_url?: string;
  short_content?: string;
  content: string;
  /** 0 隐藏，1 公开，2 加密，3 草稿 */
  status: 0 | 1 | 2 | 3;
  /** 0 关闭，1 开启 */
  comment_status: 0 | 1;
  password?: string;
  category_ids: number[];
  tag_ids?: number[];
  tags?: ArticleTagSaveReq[];
  music_ids?: number[];
  recommend?: boolean;
  recommend_seq?: number;
}

/** 管理端文章详情响应，含软删除时间 */
export interface AdminArticleDetailResp extends ArticleDetailResp {
  deleted_at?: string;
}
