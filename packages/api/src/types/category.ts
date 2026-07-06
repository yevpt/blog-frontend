export interface CategoryTabItem {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  article_count: number;
}

export interface CategoryTabsResp {
  list: CategoryTabItem[];
}

/** 分类图标/封面上传响应 */
export interface CategoryAssetUploadResp {
  key: string;
  url: string;
  size: number;
  mime: string;
}

/** POST /admin/categories 请求 */
export interface CategoryCreateReq {
  parent_id?: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
}

/** PUT /admin/categories/:id 请求；未传字段保持原值 */
export interface CategoryUpdateReq {
  parent_id?: number;
  name?: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq?: number;
}

/** 分类详情响应，含文章数量 */
export interface CategoryItemResp {
  id: number;
  parent_id?: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  article_count: number;
}

/** POST/DELETE /admin/categories/:id/articles 请求 */
export interface CategoryArticlesReq {
  article_ids: number[];
}

/** POST/DELETE /admin/categories/:id/articles 响应 */
export interface CategoryArticlesResp {
  category_id: number;
  article_ids: number[];
  /** Go int64 — safe as JS number for blog-scale counts */
  affected_count: number;
}
