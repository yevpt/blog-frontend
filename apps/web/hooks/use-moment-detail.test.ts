// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import { useMomentDetail } from "./use-moment-detail";

const { mockOpenLoginModal, mockAddToast, mockRouterPush } = vi.hoisted(() => ({
  mockOpenLoginModal: vi.fn(),
  mockAddToast: vi.fn(),
  mockRouterPush: vi.fn(),
}));
let mockSessionUserId: number | null = 7;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: mockAddToast,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "详情碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function lastFetchInit(): { headers?: Record<string, string> } | undefined {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  return call?.[1] as { headers?: Record<string, string> } | undefined;
}

describe("useMomentDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
    mockRouterPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("初始状态返回传入的碎语", () => {
    const { result } = renderHook(() => useMomentDetail(makeMoment()));
    expect(result.current.moment.content).toBe("详情碎语");
    expect(result.current.likePending).toBe(false);
    expect(result.current.actionPending).toBe(false);
  });

  it("toggleLike 未登录时打开登录弹窗且不发请求", async () => {
    mockSessionUserId = null;
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(mockOpenLoginModal).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("toggleLike 内容不可交互时不发请求", async () => {
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(
        makeMoment({
          moderation: {
            public_state: "visible",
            display_version: "last_approved",
            has_pending_revision: false,
            can_interact: false,
          },
        }),
      );
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("toggleLike 成功后更新点赞状态与数量", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ is_liked: true, like_count: 3 }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/moments/1/like",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.moment.is_liked).toBe(true);
    expect(result.current.moment.like_count).toBe(3);
  });

  it("toggleLike 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "碎语已锁定，无法点赞" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(mockAddToast).toHaveBeenCalledWith("碎语已锁定，无法点赞", "error");
  });

  it("updateMoment 成功后更新碎语并 toast", async () => {
    const updated = makeMoment({ content: "更新后的碎语" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.updateMoment("更新后的碎语", []);
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/moments");
    expect(init).toMatchObject({ method: "POST" });
    expect(result.current.moment.content).toBe("更新后的碎语");
    expect(mockAddToast).toHaveBeenCalledWith("碎语已更新", "success");
  });

  it("updateMoment 携带 moment-edit 幂等键", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeMoment({ content: "x" })));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.updateMoment("x", []);
    });

    expect(lastFetchInit()?.headers?.["Idempotency-Key"]).toBeTruthy();
  });

  it("updateMoment 业务错误时 toast 展示具体原因并抛出", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "内容包含敏感词" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await expect(result.current.updateMoment("超长", [])).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("内容包含敏感词", "error");
  });

  it("toggleTop 未置顶时调用 POST，已置顶时调用 DELETE", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: true }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/moments/1/top",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.moment.is_top).toBe(true);

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: false }));
    await act(async () => {
      await result.current.toggleTop(makeMoment({ is_top: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/moments/1/top",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.current.moment.is_top).toBe(false);
  });

  it("toggleTop 业务错误时 toast 展示具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "置顶数量已达上限" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(mockAddToast).toHaveBeenCalledWith("置顶数量已达上限", "error");
  });

  it("deleteMoment 成功后 toast 并跳转到碎语列表页", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1 }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.deleteMoment(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/moments/1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockAddToast).toHaveBeenCalledWith("碎语已删除", "success");
    expect(mockRouterPush).toHaveBeenCalledWith("/moments");
  });

  it("deleteMoment 业务错误时 toast 展示具体原因并抛出，不跳转", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "无权删除该碎语" }, 403));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await expect(result.current.deleteMoment(makeMoment())).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("无权删除该碎语", "error");
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("401 时统一打开登录弹窗（以 toggleTop 为例）", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(mockOpenLoginModal).toHaveBeenCalled();
  });
});
