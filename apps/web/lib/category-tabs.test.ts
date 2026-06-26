import { describe, it, expect } from "vitest";
import type { CategoryTabItem } from "@repo/api";
import { ALL_CATEGORY_ID } from "@/hooks/use-article-list";
import {
  CATEGORY_PAGINATION_THRESHOLD,
  filterVisibleCategories,
  getCategoryArticleCount,
  shouldUseCategoryPagination,
} from "./category-tabs";

function makeCategory(id: number, articleCount: number): CategoryTabItem {
  return { id, name: `分类${id}`, seq: id, article_count: articleCount };
}

describe("category-tabs", () => {
  it("filterVisibleCategories 移除 article_count 为 0 的分类", () => {
    const categories = [makeCategory(1, 5), makeCategory(2, 0), makeCategory(3, 1)];
    expect(filterVisibleCategories(categories)).toEqual([makeCategory(1, 5), makeCategory(3, 1)]);
  });

  it("shouldUseCategoryPagination 在文章数大于阈值时返回 true", () => {
    expect(CATEGORY_PAGINATION_THRESHOLD).toBe(60);
    expect(shouldUseCategoryPagination(60)).toBe(false);
    expect(shouldUseCategoryPagination(61)).toBe(true);
  });

  it("getCategoryArticleCount 对全部分类返回总数，对具体分类返回 article_count", () => {
    const categories = [makeCategory(1, 8), makeCategory(2, 15)];
    expect(getCategoryArticleCount(ALL_CATEGORY_ID, categories, 42)).toBe(42);
    expect(getCategoryArticleCount(1, categories, 42)).toBe(8);
    expect(getCategoryArticleCount(99, categories, 42)).toBe(0);
  });
});
