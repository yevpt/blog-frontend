import type { ArticleListItemResp, ArticlePageResp } from "@repo/api";

export interface ArticleListCacheEntry {
  articles: ArticleListItemResp[];
  currentPage: number;
  pageData: ArticlePageResp;
  endReached: boolean;
}

const cache = new Map<number, ArticleListCacheEntry>();
/** 与 use-article-list 的 ALL_CATEGORY_ID 对齐 */
let lastCategoryId = 0;

export function getLastArticleListCategoryId(): number {
  return lastCategoryId;
}

export function setLastArticleListCategoryId(categoryId: number): void {
  lastCategoryId = categoryId;
}

export function getArticleListCache(categoryId: number): ArticleListCacheEntry | undefined {
  return cache.get(categoryId);
}

export function setArticleListCache(categoryId: number, entry: ArticleListCacheEntry): void {
  cache.set(categoryId, entry);
}

export function shouldRestoreArticleListCache(
  cached: ArticleListCacheEntry,
  initialPage: ArticlePageResp,
): boolean {
  return cached.currentPage > 1 || cached.articles.length > initialPage.list.length;
}

/** 测试复位用 */
export function clearArticleListCache(): void {
  cache.clear();
  lastCategoryId = 0;
}
