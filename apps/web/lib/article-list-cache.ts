import type { ArticleListItemResp, ArticlePageResp } from "@repo/api";

export interface ArticleListCacheEntry {
  articles: ArticleListItemResp[];
  currentPage: number;
  pageData: ArticlePageResp;
  endReached: boolean;
}

const cache = new Map<string, ArticleListCacheEntry>();
/** 与 use-article-list 的 ALL_CATEGORY_ID 对齐 */
let lastCategoryId = 0;

export function getLastArticleListCategoryId(): number {
  return lastCategoryId;
}

export function setLastArticleListCategoryId(categoryId: number): void {
  lastCategoryId = categoryId;
}

/** 缓存 key 带维度前缀，避免分类 id 与标签 id 撞 key */
export function toArticleListCacheKey(categoryId: number, tagId?: number): string {
  return tagId !== undefined ? `tag:${tagId}` : `cat:${categoryId}`;
}

export function getArticleListCache(key: string): ArticleListCacheEntry | undefined {
  return cache.get(key);
}

export function setArticleListCache(key: string, entry: ArticleListCacheEntry): void {
  cache.set(key, entry);
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
