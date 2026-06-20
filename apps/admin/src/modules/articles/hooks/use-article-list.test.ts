import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AdminArticlePageResp } from "@repo/api";
import { useAdminArticleList } from "./use-article-list";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    articles: {
      listAdmin: vi.fn(),
    },
  },
}));

const mockPage: AdminArticlePageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 9,
      title: "后台文章",
      short_content: "摘要",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      is_liked: false,
      comment_count: 0,
      is_recommended: false,
      category: { id: 1, name: "前端" },
      user: { id: 1, username: "admin" },
      created_at: "2026-06-16T00:00:00Z",
      updated_at: "2026-06-16T00:00:00Z",
    },
  ],
};

describe("useAdminArticleList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(apiClient.articles.listAdmin).mockResolvedValue(mockPage);
  });

  it("挂载后请求管理端文章列表并映射表格行", async () => {
    const { result } = renderHook(() => useAdminArticleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.articles.listAdmin).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      sort_by: "created_at",
      sort_order: "desc",
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]?.title).toBe("后台文章");
    expect(result.current.rows[0]?.createdAt).toMatch(/2026/);
    expect(result.current.error).toBeNull();
  });

  it("分类筛选变更时携带 query 参数", async () => {
    const { result } = renderHook(() => useAdminArticleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setCategoryId("3");

    await waitFor(() => {
      expect(apiClient.articles.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        category_id: 3,
        sort_by: "created_at",
        sort_order: "desc",
      });
    });
  });

  it("setSort 更新排序参数", async () => {
    const { result } = renderHook(() => useAdminArticleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSort({ column: "status", direction: "ascending" });
    });

    await waitFor(() => {
      expect(apiClient.articles.listAdmin).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort_by: "status",
          sort_order: "asc",
        }),
      );
    });
  });

  it("setSearch 更新 filters.search", async () => {
    const { result } = renderHook(() => useAdminArticleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("Go");
    });

    await waitFor(() => {
      expect(result.current.filters.search).toBe("Go");
    });
  });

  it("请求失败时暴露 error", async () => {
    vi.mocked(apiClient.articles.listAdmin).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHook(() => useAdminArticleList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("网络错误");
    expect(result.current.rows).toEqual([]);
  });
});
