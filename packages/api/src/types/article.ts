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
  category_id?: number;
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
  like_count: number;
  comment_count: number;
  is_recommended: boolean;
  category?: ArticleRelationResp;
  created_at: string;
  updated_at: string;
}

export interface ArticlePageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: ArticleListItemResp[];
}
