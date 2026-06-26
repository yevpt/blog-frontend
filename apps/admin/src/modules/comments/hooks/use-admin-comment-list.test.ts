import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AdminCommentPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { useAdminCommentList } from "./use-admin-comment-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    comments: {
      listAdmin: vi.fn(),
    },
  },
}));

const mockPage: AdminCommentPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 9,
      target_type: "article",
      target_id: 3,
      user_id: 7,
      content: "测试评论",
      user: { id: 7, username: "vpt" },
      reply_count: 2,
      like_count: 4,
      is_liked: false,
      created_at: "2026-06-26T08:00:00Z",
      updated_at: "2026-06-26T08:00:00Z",
    },
  ],
};

describe("useAdminCommentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(apiClient.comments.listAdmin).mockResolvedValue(mockPage);
  });

  it("挂载后请求后台评论列表并映射行数据", async () => {
    const { result } = renderHook(() => useAdminCommentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.comments.listAdmin).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      target_type: "all",
    });
    expect(result.current.rows[0]?.content).toBe("测试评论");
    expect(result.current.rows[0]?.authorName).toBe("vpt");
    expect(result.current.error).toBeNull();
  });

  it("目标类型筛选变更时回到第一页并携带筛选参数", async () => {
    const { result } = renderHook(() => useAdminCommentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTargetType("moment");
    });

    await waitFor(() => {
      expect(apiClient.comments.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        target_type: "moment",
      });
    });
  });

  it("搜索输入会去除首尾空白后发起查询", async () => {
    const { result } = renderHook(() => useAdminCommentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("  测试  ");
    });

    await waitFor(() => {
      expect(apiClient.comments.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        target_type: "all",
        search: "测试",
      });
    });
  });

  it("请求失败时暴露 error 并清空行数据", async () => {
    vi.mocked(apiClient.comments.listAdmin).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHook(() => useAdminCommentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("加载失败");
    expect(result.current.rows).toEqual([]);
  });
});
