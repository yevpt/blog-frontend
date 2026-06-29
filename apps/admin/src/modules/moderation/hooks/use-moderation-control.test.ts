import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { ApiError, type AdminModerationControlResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useModerationControl } from "./use-moderation-control";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getControl: vi.fn(),
      updateControl: vi.fn(),
    },
  },
}));

const mockControl: AdminModerationControlResp = {
  registration_mode: "open",
  publishing_mode: "open",
  reason: "",
  changed_at: "2026-06-29T08:00:00Z",
  lock_version: 5,
};

describe("useModerationControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.getControl).mockResolvedValue(mockControl);
    vi.mocked(apiClient.moderation.updateControl).mockResolvedValue(mockControl);
  });

  it("挂载后加载全站控制状态", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationControl());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.moderation.getControl).toHaveBeenCalled();
    expect(result.current.control).toEqual(mockControl);
    expect(result.current.error).toBeNull();
  });

  it("saveControl 携带当前 lock_version", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationControl());

    await waitFor(() => {
      expect(result.current.control).not.toBeNull();
    });

    await act(async () => {
      await result.current.saveControl({
        registration_mode: "closed",
        publishing_mode: "pre_review_all",
        reason: "突发事件",
      });
    });

    expect(apiClient.moderation.updateControl).toHaveBeenCalledWith({
      registration_mode: "closed",
      publishing_mode: "pre_review_all",
      reason: "突发事件",
      lock_version: 5,
    });
  });

  it("saveControl 成功后用返回值更新状态", async () => {
    const next: AdminModerationControlResp = {
      registration_mode: "closed",
      publishing_mode: "pre_review_all",
      reason: "突发事件",
      changed_at: "2026-06-29T09:00:00Z",
      lock_version: 6,
    };
    vi.mocked(apiClient.moderation.updateControl).mockResolvedValue(next);

    const { result } = renderHookWithAdminRouter(() => useModerationControl());

    await waitFor(() => {
      expect(result.current.control).not.toBeNull();
    });

    await act(async () => {
      await result.current.saveControl({
        registration_mode: "closed",
        publishing_mode: "pre_review_all",
        reason: "突发事件",
      });
    });

    expect(result.current.control?.lock_version).toBe(6);
    expect(result.current.control?.publishing_mode).toBe("pre_review_all");
  });

  it("lock_version 冲突时重新加载控制状态，不覆盖服务端新值", async () => {
    vi.mocked(apiClient.moderation.updateControl).mockRejectedValue(
      new ApiError("MODERATION_CONTROL_CONFLICT", "控制状态已被其他管理员更新"),
    );
    const refreshed: AdminModerationControlResp = {
      registration_mode: "closed",
      publishing_mode: "closed",
      reason: "已被他人改",
      changed_at: "2026-06-29T10:00:00Z",
      lock_version: 9,
    };
    vi.mocked(apiClient.moderation.getControl).mockResolvedValueOnce(mockControl);
    vi.mocked(apiClient.moderation.getControl).mockResolvedValueOnce(refreshed);

    const { result } = renderHookWithAdminRouter(() => useModerationControl());

    await waitFor(() => {
      expect(result.current.control?.lock_version).toBe(5);
    });

    await act(async () => {
      try {
        await result.current.saveControl({
          registration_mode: "open",
          publishing_mode: "open",
          reason: "我改",
        });
      } catch {
        // expected
      }
    });

    expect(apiClient.moderation.getControl).toHaveBeenCalledTimes(2);
    expect(result.current.control?.lock_version).toBe(9);
    expect(result.current.control?.reason).toBe("已被他人改");
  });

  it("加载失败暴露 error", async () => {
    vi.mocked(apiClient.moderation.getControl).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHookWithAdminRouter(() => useModerationControl());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("网络错误");
    expect(result.current.control).toBeNull();
  });
});
