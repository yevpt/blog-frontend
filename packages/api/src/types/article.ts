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
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_recommended: boolean;
  category?: ArticleRelationResp;
  created_at: string;
  updated_at: string;
}

export interface ArticlePageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: ArticleListItemResp[];
}
