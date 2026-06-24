import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useArticleEditorDetail } from "./use-article-editor-detail";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    articles: { getAdminDetail: vi.fn() },
  },
}));

const mockDetail = {
  id: 12,
  title: "已有文章",
  content: "正文",
  user_id: 1,
  status: 0,
  comment_status: 1,
  read_count: 0,
  like_count: 0,
  comment_count: 0,
  is_recommended: false,
  category_ids: [1],
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("useArticleEditorDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.articles.getAdminDetail).mockResolvedValue(mockDetail);
  });

  it("新建页不请求详情", async () => {
    const { result } = renderHook(() => useArticleEditorDetail(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.articles.getAdminDetail).not.toHaveBeenCalled();
    expect(result.current.isNew).toBe(true);
  });

  it("编辑页加载详情", async () => {
    const { result } = renderHook(() => useArticleEditorDetail("12"));

    await waitFor(() => {
      expect(result.current.detail?.title).toBe("已有文章");
    });

    expect(apiClient.articles.getAdminDetail).toHaveBeenCalledWith(12);
  });

  it("非法 articleId 返回错误", async () => {
    const { result } = renderHook(() => useArticleEditorDetail("abc"));

    await waitFor(() => {
      expect(result.current.error).toContain("文章 ID 无效");
    });

    expect(apiClient.articles.getAdminDetail).not.toHaveBeenCalled();
  });
});
