export interface CategoryTabItem {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
  article_count: number;
}

export interface CategoryTabsResp {
  list: CategoryTabItem[];
}
