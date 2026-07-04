import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminUserPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useAdminUserList } from "./use-admin-user-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      listAdmin: vi.fn(),
    },
  },
}));

const mockPage: AdminUserPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 7,
      username: "vpt",
      nickname: "VPT",
      email: "vpt@example.com",
      mark: "博主",
      roles: ["ROLE_ADMIN"],
      status: 1,
      sanction_state: "active",
      is_online: true,
      last_active_at: "2026-06-26T08:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("useAdminUserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.listAdmin).mockResolvedValue(mockPage);
  });

  it("挂载后请求用户列表并映射行数据", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.users.listAdmin).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    expect(result.current.rows[0]?.displayName).toBe("VPT");
    expect(result.current.rows[0]?.isAdmin).toBe(true);
  });

  it("筛选变更时回到第一页并携带后端查询参数", async () => {
    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilters((previous) => ({
        ...previous,
        keyword: "  vpt  ",
        role: "ROLE_ADMIN",
        status: "disabled",
      }));
    });

    await waitFor(() => {
      expect(apiClient.users.listAdmin).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        keyword: "vpt",
        role: "ROLE_ADMIN",
        status: "disabled",
      });
    });
  });

  it("请求失败时暴露 error", async () => {
    vi.mocked(apiClient.users.listAdmin).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHookWithAdminRouter(() => useAdminUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("加载失败");
    expect(result.current.rows).toEqual([]);
  });
});
