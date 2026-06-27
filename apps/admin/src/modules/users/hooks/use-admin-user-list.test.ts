import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { UserPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useAdminUserList } from "./use-admin-user-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      listPublic: vi.fn(),
    },
  },
}));

const mockPage: UserPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 7,
      nickname: "VPT",
      mark: "博主",
      roles: ["ROLE_ADMIN"],
      is_online: true,
      last_active_at: "2026-06-26T08:00:00Z",
    },
  ],
};

describe("useAdminUserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.listPublic).mockResolvedValue(mockPage);
  });

  it("挂载后请求用户列表并映射行数据", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.users.listPublic).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    expect(result.current.rows[0]?.displayName).toBe("VPT");
    expect(result.current.rows[0]?.isAdmin).toBe(true);
  });

  it("搜索会在当前页用户中筛选", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("博主");
    });

    expect(result.current.visibleRows).toHaveLength(1);
  });

  it("请求失败时暴露 error", async () => {
    vi.mocked(apiClient.users.listPublic).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("加载失败");
    expect(result.current.rows).toEqual([]);
  });
});
