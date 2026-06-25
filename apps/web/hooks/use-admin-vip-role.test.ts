import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminVipRole } from "./use-admin-vip-role";

const mockApiJson = vi.fn();
const mockAddToast = vi.fn();

vi.mock("@/lib/client-fetch", () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

describe("useAdminVipRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grantVip 调用 POST 并回传 roles", async () => {
    const onRolesChange = vi.fn();
    mockApiJson.mockResolvedValue({ user_id: 42, roles: ["ROLE_NORMAL", "ROLE_VIP"] });

    const { result } = renderHook(() => useAdminVipRole(42, onRolesChange));

    await act(async () => {
      await result.current.grantVip();
    });

    expect(mockApiJson).toHaveBeenCalledWith("/api/admin/users/42/roles/vip", { method: "POST" });
    expect(onRolesChange).toHaveBeenCalledWith(["ROLE_NORMAL", "ROLE_VIP"]);
  });

  it("revokeVip 调用 DELETE 并回传 roles", async () => {
    const onRolesChange = vi.fn();
    mockApiJson.mockResolvedValue({ user_id: 42, roles: ["ROLE_NORMAL"] });

    const { result } = renderHook(() => useAdminVipRole(42, onRolesChange));

    await act(async () => {
      await result.current.revokeVip();
    });

    expect(mockApiJson).toHaveBeenCalledWith("/api/admin/users/42/roles/vip", { method: "DELETE" });
    expect(onRolesChange).toHaveBeenCalledWith(["ROLE_NORMAL"]);
  });

  it("请求失败时 toast 错误且不更新 roles", async () => {
    const onRolesChange = vi.fn();
    mockApiJson.mockRejectedValue(new Error("无权限"));

    const { result } = renderHook(() => useAdminVipRole(42, onRolesChange));

    await act(async () => {
      await expect(result.current.grantVip()).rejects.toThrow("无权限");
    });

    expect(mockAddToast).toHaveBeenCalledWith("操作失败", "error");
    expect(onRolesChange).not.toHaveBeenCalled();
  });
});
