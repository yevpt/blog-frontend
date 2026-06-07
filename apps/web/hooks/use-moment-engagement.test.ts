import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import { useMomentEngagement } from "./use-moment-engagement";

const mockOpenLoginModal = vi.fn();
const toastMockState = vi.hoisted(() => ({
  addToast: vi.fn(),
}));
let mockSessionUserId: number | null = 7;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: toastMockState.addToast,
}));

function makeMoment(id: number, overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id,
    user_id: 1,
    content: `碎语 ${id}`,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 3,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

const INITIAL_MOMENTS = [makeMoment(1)];
const REFRESH_PARAMS = { page: 1, pageSize: 3 };

describe("useMomentEngagement", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mockOpenLoginModal.mockReset();
    toastMockState.addToast.mockReset();
  });

  it("已登录时点赞会调用接口并更新状态", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ is_liked: true, like_count: 8 }),
    } as Response);

    const { result } = renderHook(() =>
      useMomentEngagement({
        initialMoments: INITIAL_MOMENTS,
        getRefreshParams: () => REFRESH_PARAMS,
      }),
    );

    await act(async () => {
      await result.current.handleLike(makeMoment(1));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/moments/1/like", { method: "POST" });
      expect(result.current.moments[0]?.is_liked).toBe(true);
      expect(result.current.moments[0]?.like_count).toBe(8);
    });
  });

  it("未登录时点赞会打开登录弹窗", async () => {
    mockSessionUserId = null;

    const { result } = renderHook(() =>
      useMomentEngagement({
        initialMoments: [makeMoment(2)],
        getRefreshParams: () => REFRESH_PARAMS,
      }),
    );

    await act(async () => {
      await result.current.handleLike(makeMoment(2));
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("openComment 会设置 activeComment", () => {
    const { result } = renderHook(() =>
      useMomentEngagement({
        initialMoments: [makeMoment(3)],
        getRefreshParams: () => REFRESH_PARAMS,
      }),
    );

    act(() => {
      result.current.openComment(makeMoment(3));
    });

    expect(result.current.activeComment).toEqual({ momentId: 3 });
  });
});
