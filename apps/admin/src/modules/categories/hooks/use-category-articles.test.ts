import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCategoryArticles } from "./use-category-articles";
import { apiClient } from "../../../lib/api";
import type { CategoryRow } from "../model";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    articles: {
      listAdmin: vi.fn(),
    },
    categories: {
      addArticles: vi.fn(),
      removeArticles: vi.fn(),
    },
  },
}));

const category: CategoryRow = {
  id: "1",
  name: "编程",
  seq: 0,
  articleCount: 2,
};

const articleInCategory = {
  id: 10,
  title: "Go 入门",
  short_content: "简介",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 0,
  like_count: 0,
  is_liked: false,
  comment_count: 0,
  is_recommended: false,
  category: { id: 1, name: "编程" },
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const articleOtherCategory = {
  ...articleInCategory,
  id: 11,
  title: "React 技巧",
  category: { id: 2, name: "前端" },
};

describe("useCategoryArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.articles.listAdmin).mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 10,
      list: [articleInCategory],
    });
    vi.mocked(apiClient.categories.removeArticles).mockResolvedValue({ affected: 1 });
    vi.mocked(apiClient.categories.addArticles).mockResolvedValue({ affected: 1 });
  });

  it("打开时加载分类内文章", async () => {
    const { result } = renderHook(() =>
      useCategoryArticles({ category, isOpen: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([
      expect.objectContaining({ id: "10", title: "Go 入门" }),
    ]);
    expect(apiClient.articles.listAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 1 }),
    );
  });

  it("关闭时不请求列表", async () => {
    renderHook(() => useCategoryArticles({ category, isOpen: false }));

    await waitFor(() => {
      expect(apiClient.articles.listAdmin).not.toHaveBeenCalled();
    });
  });

  it("removeArticle 调用 API 并 refetch", async () => {
    const onArticlesChanged = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCategoryArticles({ category, isOpen: true, onArticlesChanged }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeArticle("10");
    });

    expect(apiClient.categories.removeArticles).toHaveBeenCalledWith(1, {
      article_ids: [10],
    });
    expect(onArticlesChanged).toHaveBeenCalled();
    expect(apiClient.articles.listAdmin).toHaveBeenCalledTimes(2);
  });

  it("openAddView 加载候选文章并过滤已在当前分类的项", async () => {
    vi.mocked(apiClient.articles.listAdmin).mockResolvedValue({
      total: 2,
      pages: 1,
      page: 1,
      page_size: 10,
      list: [articleInCategory, articleOtherCategory],
    });

    const { result } = renderHook(() =>
      useCategoryArticles({ category, isOpen: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.openAddView();
    });

    await waitFor(() => {
      expect(result.current.isPickerLoading).toBe(false);
    });

    expect(result.current.pickerRows).toEqual([
      expect.objectContaining({
        id: "11",
        title: "React 技巧",
        otherCategory: "前端",
      }),
    ]);
  });

  it("addSelectedArticles 批量添加并关闭添加视图", async () => {
    vi.mocked(apiClient.articles.listAdmin).mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 10,
      list: [articleOtherCategory],
    });

    const onArticlesChanged = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCategoryArticles({ category, isOpen: true, onArticlesChanged }),
    );

    act(() => {
      result.current.openAddView();
    });

    await waitFor(() => {
      expect(result.current.pickerRows.length).toBe(1);
    });

    act(() => {
      result.current.toggleSelectedArticle("11");
    });

    await act(async () => {
      await result.current.addSelectedArticles();
    });

    expect(apiClient.categories.addArticles).toHaveBeenCalledWith(1, {
      article_ids: [11],
    });
    expect(result.current.isAddViewOpen).toBe(false);
    expect(onArticlesChanged).toHaveBeenCalled();
  });
});
