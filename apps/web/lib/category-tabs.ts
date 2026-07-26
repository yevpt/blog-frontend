import type { CategoryTabItem } from "@repo/api";

/** 虚拟「全部」分类 ID，对应不带 category_id 的请求 */
export const ALL_CATEGORY_ID = 0;

/** 分类文章数超过该阈值时使用分页，否则使用滚动加载 */
export const CATEGORY_PAGINATION_THRESHOLD = 60;

/** 过滤掉无文章的分类/标签项（公开导航只展示有内容的维度） */
export function filterVisibleCategories<T extends { article_count: number }>(items: T[]): T[] {
  return items.filter((item) => item.article_count > 0);
}

/** 根据 /categories 返回的 article_count 判断是否使用分页 */
export function shouldUseCategoryPagination(articleCount: number): boolean {
  return articleCount > CATEGORY_PAGINATION_THRESHOLD;
}

export function getCategoryArticleCount(
  categoryId: number,
  categories: CategoryTabItem[],
  allTotal: number,
): number {
  if (categoryId === ALL_CATEGORY_ID) {
    return allTotal;
  }
  return categories.find((category) => category.id === categoryId)?.article_count ?? 0;
}
