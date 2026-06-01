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
