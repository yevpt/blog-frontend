import { describe, it, expect, beforeEach } from "vitest";
import type { ArticlePageResp } from "@repo/api";
import {
  clearArticleListCache,
  getArticleListCache,
  getLastArticleListCategoryId,
  setArticleListCache,
  setLastArticleListCategoryId,
  shouldRestoreArticleListCache,
} from "./article-list-cache";

const initialPage: ArticlePageResp = {
  total: 4,
  pages: 2,
  page: 1,
  page_size: 2,
  list: [
    {
      id: 1,
      title: "第一页",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 1,
      like_count: 0,
      is_liked: false,
      comment_count: 0,
      is_recommended: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("article-list-cache", () => {
  beforeEach(() => {
    clearArticleListCache();
  });

  it("shouldRestoreArticleListCache 在已加载更多页时返回 true", () => {
    expect(
      shouldRestoreArticleListCache(
        {
          articles: [...initialPage.list, { ...initialPage.list[0]!, id: 2, title: "第二页" }],
          currentPage: 2,
          pageData: { ...initialPage, page: 2 },
          endReached: true,
        },
        initialPage,
      ),
    ).toBe(true);
  });

  it("shouldRestoreArticleListCache 在仅首屏数据时返回 false", () => {
    expect(
      shouldRestoreArticleListCache(
        {
          articles: initialPage.list,
          currentPage: 1,
          pageData: initialPage,
          endReached: false,
        },
        initialPage,
      ),
    ).toBe(false);
  });

  it("读写分类缓存并记住最后访问分类", () => {
    setLastArticleListCategoryId(3);
    setArticleListCache(3, {
      articles: initialPage.list,
      currentPage: 1,
      pageData: initialPage,
      endReached: false,
    });

    expect(getLastArticleListCategoryId()).toBe(3);
    expect(getArticleListCache(3)?.currentPage).toBe(1);
  });

  it("clearArticleListCache 复位缓存", () => {
    setLastArticleListCategoryId(2);
    setArticleListCache(2, {
      articles: initialPage.list,
      currentPage: 2,
      pageData: initialPage,
      endReached: false,
    });

    clearArticleListCache();

    expect(getLastArticleListCategoryId()).toBe(0);
    expect(getArticleListCache(2)).toBeUndefined();
  });
});
