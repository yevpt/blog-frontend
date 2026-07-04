import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminUserDetailResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { useUserDetail } from "./use-user-detail";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      getAdminDetail: vi.fn(),
      grantVipRole: vi.fn(),
      revokeVipRole: vi.fn(),
      disableAccount: vi.fn(),
      enableAccount: vi.fn(),
    },
  },
}));

const detail: AdminUserDetailResp = {
  id: 7,
  username: "vpt",
  email: "vpt@example.com",
  email_verified: true,
  password_set: true,
  roles: ["ROLE_NORMAL"],
  register_at: "2026-01-01T00:00:00Z",
  is_online: false,
  sanction_state: "active",
  status: 1,
};

describe("useUserDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.getAdminDetail).mockResolvedValue(detail);
    vi.mocked(apiClient.users.grantVipRole).mockResolvedValue({
      user_id: 7,
      roles: ["ROLE_NORMAL", "ROLE_VIP"],
    });
  });

  it("userId 为 null 时不发请求", () => {
    const { result } = renderHook(() => useUserDetail(null));
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.users.getAdminDetail).not.toHaveBeenCalled();
  });

  it("加载详情成功", async () => {
    const { result } = renderHook(() => useUserDetail(7));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail?.username).toBe("vpt");
  });

  it("grantVip 成功后重新加载详情", async () => {
    const { result } = renderHook(() => useUserDetail(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.grantVip();
    });

    expect(apiClient.users.grantVipRole).toHaveBeenCalledWith(7);
    expect(apiClient.users.getAdminDetail).toHaveBeenCalledTimes(2);
  });
});
