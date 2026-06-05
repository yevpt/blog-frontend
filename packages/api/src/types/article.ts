export interface ArticleRelationResp {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
}

export interface ArticleListReq {
  page?: number;
  page_size?: number;
  recommend?: boolean;
  /** Must be a positive integer (uint on backend) */
  category_id?: number;
  /** Must be a positive integer (uint on backend) */
  tag_id?: number;
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
  category?: ArticleRelationResp;
  tags?: ArticleRelationResp[];
  created_at: string;
  updated_at: string;
}
