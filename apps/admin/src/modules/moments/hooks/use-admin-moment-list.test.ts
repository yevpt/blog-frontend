import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminMomentPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useAdminMomentList } from "./use-admin-moment-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moments: {
      listAdmin: vi.fn(),
    },
  },
}));

const mockPage: AdminMomentPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 9,
      user_id: 7,
      content: "风",
      status: 1,
      comment_status: 1,
      read_count: 10,
      is_top: false,
      like_count: 2,
      comment_count: 3,
      is_liked: false,
      user: { id: 7, username: "vpt" },
      images: [],
      created_at: "2026-06-26T08:00:00Z",
      updated_at: "2026-06-26T08:00:00Z",
    },
  ],
};

describe("useAdminMomentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(apiClient.moments.listAdmin).mockResolvedValue(mockPage);
  });

  it("挂载后请求后台碎语列表并映射行数据", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminMomentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.moments.listAdmin).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      status: "all",
    });
    expect(result.current.rows[0]?.content).toBe("风");
    expect(result.current.rows[0]?.authorName).toBe("vpt");
  });

  it("状态筛选变更时回到第一页并携带筛选参数", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminMomentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setStatus("hidden");
    });

    await waitFor(() => {
      expect(apiClient.moments.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        status: "hidden",
      });
    });
  });

  it("搜索输入会去除首尾空白后发起查询", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminMomentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("  风  ");
    });

    await waitFor(() => {
      expect(apiClient.moments.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        status: "all",
        search: "风",
      });
    });
  });

  it("请求失败时暴露 error 并清空行数据", async () => {
    vi.mocked(apiClient.moments.listAdmin).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHookWithAdminRouter(() => useAdminMomentList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("加载失败");
    expect(result.current.rows).toEqual([]);
  });
});
