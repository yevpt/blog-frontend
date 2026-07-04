import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AdminModerationEmergencyBatchResp,
  AdminModerationProfileResp,
} from "@repo/api";
import { apiClient } from "../../../lib/api";
import { useUserModeration } from "./use-user-moderation";

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

vi.mock("../../../lib/toast", () => ({ addToast: vi.fn() }));

const profile: AdminModerationProfileResp = {
  user_id: 7,
  trust_level: "normal",
  trust_source: "auto",
  manual_trust_locked: false,
  sanction_state: "active",
  clean_approval_streak: 0,
  corrected_count: 0,
  rejected_count: 0,
  high_risk_count: 0,
  violation_score: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const batch: AdminModerationEmergencyBatchResp = {
  processed: 8,
  next_cursor: 100,
  has_more: true,
};

describe("useUserModeration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.getUserProfile).mockResolvedValue(profile);
    vi.mocked(apiClient.moderation.hideUserContent).mockResolvedValue(batch);
  });

  it("userId 变化时自动加载画像", async () => {
    const { result, rerender } = renderHook(
      ({ userId }: { userId: number | null }) => useUserModeration(userId),
      { initialProps: { userId: 7 as number | null } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.moderation.getUserProfile).toHaveBeenCalledWith(7);
    expect(result.current.profile?.trust_level).toBe("normal");

    rerender({ userId: null });
    await waitFor(() => expect(result.current.profile).toBeNull());
  });

  it("批量隐藏使用真实数值游标并保留下一批状态", async () => {
    const { result } = renderHook(() => useUserModeration(7));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.hideContentBatch({ cursor: 0, reason: "清理广告" });
    });

    expect(apiClient.moderation.hideUserContent).toHaveBeenCalledWith(7, {
      cursor: 0,
      limit: undefined,
      reason: "清理广告",
    });
    expect(result.current.batch).toEqual({
      operation: "hide",
      processed: 8,
      next_cursor: 100,
      has_more: true,
    });
  });
});
