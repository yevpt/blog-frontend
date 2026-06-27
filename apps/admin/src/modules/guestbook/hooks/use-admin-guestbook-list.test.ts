import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminGuestbookPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useAdminGuestbookList } from "./use-admin-guestbook-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    guestbook: {
      listAdmin: vi.fn(),
    },
  },
}));

const mockPage: AdminGuestbookPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 9,
      owner_user_id: 1,
      from_user_id: 7,
      content: "你好",
      user: { id: 7, username: "vpt" },
      reply_count: 2,
      like_count: 3,
      is_liked: false,
      created_at: "2026-06-26T08:00:00Z",
      updated_at: "2026-06-26T08:00:00Z",
    },
  ],
};

describe("useAdminGuestbookList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(apiClient.guestbook.listAdmin).mockResolvedValue(mockPage);
  });

  it("挂载后请求后台留言列表并映射行数据", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminGuestbookList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.guestbook.listAdmin).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    expect(result.current.rows[0]?.content).toBe("你好");
    expect(result.current.rows[0]?.authorName).toBe("vpt");
  });

  it("搜索输入会去除首尾空白后发起查询", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminGuestbookList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("  你好  ");
    });

    await waitFor(() => {
      expect(apiClient.guestbook.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        search: "你好",
      });
    });
  });

  it("请求失败时暴露 error 并清空行数据", async () => {
    vi.mocked(apiClient.guestbook.listAdmin).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHookWithAdminRouter(() => useAdminGuestbookList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("加载失败");
    expect(result.current.rows).toEqual([]);
  });
});
