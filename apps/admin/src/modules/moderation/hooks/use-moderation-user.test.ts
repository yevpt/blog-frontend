import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import {
  ApiError,
  type AdminModerationEmergencyBatchResp,
  type AdminModerationProfileResp,
} from "@repo/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useModerationUser } from "./use-moderation-user";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getUserProfile: vi.fn(),
      updateUserProfile: vi.fn(),
      muteUser: vi.fn(),
      banUser: vi.fn(),
      releaseUser: vi.fn(),
      hideUserContent: vi.fn(),
      restoreUserContent: vi.fn(),
    },
  },
}));

const mockProfile: AdminModerationProfileResp = {
  user_id: 42,
  trust_level: "normal",
  trust_source: "auto",
  manual_trust_locked: false,
  sanction_state: "active",
  clean_approval_streak: 10,
  corrected_count: 1,
  rejected_count: 0,
  high_risk_count: 0,
  violation_score: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-29T00:00:00Z",
};

const mockBatch: AdminModerationEmergencyBatchResp = {
  processed: 8,
  next_cursor: 100,
  has_more: true,
};

describe("useModerationUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.getUserProfile).mockResolvedValue(mockProfile);
    vi.mocked(apiClient.moderation.updateUserProfile).mockResolvedValue(undefined);
    vi.mocked(apiClient.moderation.muteUser).mockResolvedValue(undefined);
    vi.mocked(apiClient.moderation.banUser).mockResolvedValue(undefined);
    vi.mocked(apiClient.moderation.releaseUser).mockResolvedValue(undefined);
    vi.mocked(apiClient.moderation.hideUserContent).mockResolvedValue(mockBatch);
    vi.mocked(apiClient.moderation.restoreUserContent).mockResolvedValue(mockBatch);
  });

  it("loadProfile 调用 getUserProfile 并暴露画像", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    expect(apiClient.moderation.getUserProfile).toHaveBeenCalledWith(42);
    expect(result.current.profile?.trust_level).toBe("normal");
    expect(result.current.error).toBeNull();
  });

  it("updateProfile 携带 trust_level / manual_locked", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    await act(async () => {
      await result.current.updateProfile({ trust_level: "trusted", manual_locked: true });
    });

    expect(apiClient.moderation.updateUserProfile).toHaveBeenCalledWith(42, {
      trust_level: "trusted",
      manual_locked: true,
      restricted_until: undefined,
    });
  });

  it("mute / ban / release 调用对应端点", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    await act(async () => {
      await result.current.muteUser({ reason: "广告", until: "2026-08-01T00:00:00Z" });
    });
    expect(apiClient.moderation.muteUser).toHaveBeenCalledWith(42, {
      reason: "广告",
      until: "2026-08-01T00:00:00Z",
    });

    await act(async () => {
      await result.current.banUser({ reason: "恶意" });
    });
    expect(apiClient.moderation.banUser).toHaveBeenCalledWith(42, {
      reason: "恶意",
      until: undefined,
    });

    await act(async () => {
      await result.current.releaseUser();
    });
    expect(apiClient.moderation.releaseUser).toHaveBeenCalledWith(42);
  });

  it("hideContentBatch 严格按 cursor 单批推进，不自动循环", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    await act(async () => {
      await result.current.hideContentBatch({ cursor: 0 });
    });

    expect(apiClient.moderation.hideUserContent).toHaveBeenCalledWith(42, {
      cursor: 0,
      limit: undefined,
      reason: undefined,
    });
    expect(result.current.batch).toEqual({
      operation: "hide",
      processed: 8,
      next_cursor: 100,
      has_more: true,
    });

    // 第二批：使用上批返回的 next_cursor
    await act(async () => {
      await result.current.hideContentBatch({ cursor: 100, reason: "继续清理" });
    });

    expect(apiClient.moderation.hideUserContent).toHaveBeenLastCalledWith(42, {
      cursor: 100,
      limit: undefined,
      reason: "继续清理",
    });
    expect(result.current.batch?.next_cursor).toBe(100);
  });

  it("restoreContentBatch 与 hideContentBatch 互不干扰", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    await act(async () => {
      await result.current.restoreContentBatch({ cursor: 50 });
    });

    expect(apiClient.moderation.restoreUserContent).toHaveBeenCalledWith(42, {
      cursor: 50,
      limit: undefined,
      reason: undefined,
    });
    expect(result.current.batch?.operation).toBe("restore");
  });

  it("画像更新可清空 restricted_until，并以服务端最新画像为准", async () => {
    vi.mocked(apiClient.moderation.getUserProfile)
      .mockResolvedValueOnce({ ...mockProfile, restricted_until: "2026-08-01T00:00:00Z" })
      .mockResolvedValueOnce({
        ...mockProfile,
        trust_level: "trusted",
        restricted_until: undefined,
      });
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });
    await act(async () => {
      await result.current.updateProfile({
        trust_level: "trusted",
        manual_locked: true,
        restricted_until: null,
      });
    });

    expect(result.current.profile?.restricted_until).toBeUndefined();
    expect(apiClient.moderation.getUserProfile).toHaveBeenCalledTimes(2);
  });

  it("禁言、封禁和释放后重新读取服务端画像", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });
    await act(async () => {
      await result.current.muteUser({ reason: "广告" });
    });
    await act(async () => {
      await result.current.banUser({ reason: "恶意" });
    });
    await act(async () => {
      await result.current.releaseUser();
    });

    expect(apiClient.moderation.getUserProfile).toHaveBeenCalledTimes(4);
  });

  it("操作失败暴露 error 且不抛散状态", async () => {
    vi.mocked(apiClient.moderation.muteUser).mockRejectedValue(
      new ApiError("MODERATION_USER_SANCTION_CONFLICT", "处罚状态冲突"),
    );

    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });

    await act(async () => {
      try {
        await result.current.muteUser({ reason: "广告" });
      } catch {
        // expected
      }
    });

    expect(result.current.error?.message).toBe("处罚状态冲突");
  });

  it("resetProfile 清空当前画像", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationUser());

    await act(async () => {
      await result.current.loadProfile(42);
    });
    expect(result.current.profile).not.toBeNull();

    act(() => {
      result.current.resetProfile();
    });

    expect(result.current.profile).toBeNull();
  });
});
