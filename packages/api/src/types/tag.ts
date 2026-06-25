export interface TagItemResp {
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

export interface TagListResp {
  list: TagItemResp[];
}

/** POST /admin/tags 请求 */
export interface TagCreateReq {
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
}

/** PUT /admin/tags/:id 请求；未传字段保持原值 */
export interface TagUpdateReq {
  name?: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq?: number;
}

/** POST/DELETE /admin/tags/:id/articles 请求 */
export interface TagArticlesReq {
  article_ids: number[];
}

/** POST/DELETE /admin/tags/:id/articles 响应 */
export interface TagArticlesResp {
  tag_id: number;
  article_ids: number[];
  /** Go int64 — safe as JS number for blog-scale counts */
  affected_count: number;
}
