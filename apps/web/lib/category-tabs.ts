import type { CategoryTabItem } from "@repo/api";
import { ALL_CATEGORY_ID } from "@/hooks/use-article-list";

/** 分类文章数超过该阈值时使用分页，否则使用滚动加载 */
export const CATEGORY_PAGINATION_THRESHOLD = 60;

/** 过滤掉无文章的分类 Tab */
export function filterVisibleCategories(categories: CategoryTabItem[]): CategoryTabItem[] {
  return categories.filter((category) => category.article_count > 0);
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
