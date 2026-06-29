// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import type { MomentImageItem } from "@/components/moments/types";
import { useMomentList } from "./use-moment-list";
import { useMomentModal } from "@/store/use-moment-modal";

const { mockOpenLoginModal, mockAddToast } = vi.hoisted(() => ({
  mockOpenLoginModal: vi.fn(),
  mockAddToast: vi.fn(),
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

function makePageResp(overrides: Partial<MomentPageResp> = {}): MomentPageResp {
  return {
    total: 1,
    pages: 1,
    page: 1,
    page_size: 20,
    list: [makeMoment(1)],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function getLastFetchUrl(): string {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  return String(call?.[0] ?? "");
}

/** 取最近一次 fetch 调用携带的 Idempotency-Key 请求头 */
function lastIdempotencyKey(): string | undefined {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  const init = call?.[1] as { headers?: Record<string, string> } | undefined;
  return init?.headers?.["Idempotency-Key"];
}

describe("useMomentList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    useMomentModal.setState({ isOpen: false, publishCount: 0, lastPublishedUserId: null });
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("user mode loads first page on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(5)] })));

    const emptyInitial: MomentPageResp = {
      total: 0,
      pages: 0,
      page: 1,
      page_size: 10,
      list: [],
    };

    const { result } = renderHook(() =>
      useMomentList({ initialPage: emptyInitial, mode: "user", userId: 42 }),
    );

    expect(result.current.isLoadingInitial).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
      expect(result.current.moments.map((item) => item.id)).toEqual([5]);
      expect(getLastFetchUrl()).toContain("user_id=42");
    });
  });

  // 回归：StrictMode 双执行 / userId 切换导致旧 effect 被取消时，
  // 旧拉取不能置 isLoadingInitial=false，否则新拉取完成前会闪现空态（如「暂无碎语」）。
  it("cancelled user-mode fetch keeps loading true until the new fetch resolves", async () => {
    let resolveFirst: (value: Response) => void = () => {};
    let resolveSecond: (value: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveFirst = resolve)),
    );
    vi.mocked(fetch).mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveSecond = resolve)),
    );

    const emptyInitial: MomentPageResp = {
      total: 0,
      pages: 0,
      page: 1,
      page_size: 10,
      list: [],
    };

    // 先以 userId=42 挂载，发起首个拉取（暂不 resolve）
    const { result, rerender } = renderHook(
      ({ userId }: { userId: number }) =>
        useMomentList({ initialPage: emptyInitial, mode: "user", userId }),
      { initialProps: { userId: 42 } },
    );

    expect(result.current.isLoadingInitial).toBe(true);

    // 切到 userId=43：旧 effect 被取消，新 effect 发起第二个拉取
    rerender({ userId: 43 });

    // 让被取消的旧拉取 resolve —— 不应解锁 loading，也不应写入 moments
    await act(async () => {
      resolveFirst(jsonResponse(makePageResp({ list: [makeMoment(999)] })));
      await Promise.resolve();
    });

    expect(result.current.isLoadingInitial).toBe(true);
    expect(result.current.moments).toHaveLength(0);

    // 新拉取 resolve 后才解锁 loading 并写入数据
    await act(async () => {
      resolveSecond(jsonResponse(makePageResp({ list: [makeMoment(5)] })));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
      expect(result.current.moments.map((item) => item.id)).toEqual([5]);
    });
  });

  it("feed mode does not load user page on mount", () => {
    renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ list: [makeMoment(1)] }),
        mode: "feed",
      }),
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("when active tab is friends, refresh after session change requests scope=friends", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(2)] })))
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(2)] })));

    const { result, rerender } = renderHook(() => useMomentList({ initialPage: makePageResp() }));

    await act(async () => {
      await result.current.changeTab("friends");
    });

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("/api/moments/feed?");
      expect(url).toContain("scope=friends");
      expect(url).toContain("sort=latest");
      expect(url).not.toContain("user_id=");
    });
  });

  it("when active tab is owner, refresh requests scope=owner", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(3)] })))
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(3)] })));

    const { result, rerender } = renderHook(() => useMomentList({ initialPage: makePageResp() }));

    await act(async () => {
      await result.current.changeTab("owner");
    });

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("scope=owner");
      expect(url).not.toContain("user_id=");
    });
  });

  it("when active tab is all, refresh requests scope=all", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makePageResp()));

    const { rerender } = renderHook(() => useMomentList({ initialPage: makePageResp() }));

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("/api/moments/feed?");
      expect(url).toContain("scope=all");
      expect(url).not.toContain("user_id=");
    });
  });

  it("loadMore appends items and sets end state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        makePageResp({
          page: 2,
          pages: 2,
          list: [makeMoment(2)],
        }),
      ),
    );

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ total: 2, pages: 2, page: 1, list: [makeMoment(1)] }),
      }),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.moments).toHaveLength(2);
      expect(result.current.moments.map((item) => item.id)).toEqual([1, 2]);
      expect(result.current.endReached).toBe(true);
      expect(getLastFetchUrl()).toContain("page=2");
    });
  });

  it("refreshes from first page after session change even when more pages were loaded", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(
          makePageResp({
            page: 2,
            pages: 3,
            list: [makeMoment(2)],
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          makePageResp({
            page: 1,
            pages: 3,
            list: [makeMoment(10), makeMoment(11)],
          }),
        ),
      );

    const { result, rerender } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ total: 3, pages: 3, page: 1, list: [makeMoment(1)] }),
      }),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("page=1");
      expect(result.current.moments.map((item) => item.id)).toEqual([10, 11]);
    });
  });

  it("owner Tab 在博主发布碎语后刷新第一页", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(makePageResp({ list: [makeMoment(10, { user_id: 1 })] })),
    );

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ page_size: 3, list: [makeMoment(1)] }),
        initialTab: "owner",
      }),
    );

    act(() => {
      useMomentModal.getState().markPublished(1);
    });

    await waitFor(() => {
      expect(getLastFetchUrl()).toContain("scope=owner");
      expect(getLastFetchUrl()).toContain("page_size=3");
      expect(result.current.moments.map((item) => item.id)).toEqual([10]);
    });
  });

  it("owner Tab 在非博主用户发布碎语后不刷新", async () => {
    renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ page_size: 3, list: [makeMoment(1)] }),
        initialTab: "owner",
      }),
    );

    act(() => {
      useMomentModal.getState().markPublished(6);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("failed load sets fetchError without dropping existing items", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500));

    const initialPage = makePageResp({ total: 2, pages: 2, page: 1, list: [makeMoment(1)] });
    const { result } = renderHook(() => useMomentList({ initialPage }));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.fetchError).toBe(true);
      expect(result.current.moments).toEqual(initialPage.list);
      expect(result.current.endReached).toBe(false);
    });
  });

  it("toggleTop posts top endpoint and updates is_top", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: true }));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.toggleTop(makeMoment(1));
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1/top", { method: "POST" });
    expect(result.current.moments[0]?.is_top).toBe(true);
  });

  it("toggleTop deletes top endpoint when moment is already top", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: false }));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1, { is_top: true })] }) }),
    );

    await act(async () => {
      await result.current.toggleTop(makeMoment(1, { is_top: true }));
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1/top", { method: "DELETE" });
    expect(result.current.moments[0]?.is_top).toBe(false);
  });

  it("deleteMoment deletes endpoint and removes the moment locally", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ total: 2, list: [makeMoment(1), makeMoment(2)] }),
      }),
    );

    await act(async () => {
      await result.current.deleteMoment(makeMoment(1));
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1", { method: "DELETE" });
    expect(result.current.moments.map((item) => item.id)).toEqual([2]);
    expect(result.current.pageData.total).toBe(1);
  });

  it("updateMoment saves through multipart endpoint and replaces moment locally", async () => {
    const updated = makeMoment(1, { content: "更新后的碎语" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    const images = [
      {
        id: "r1",
        remoteUrl: "https://example.com/old.png",
        previewUrl: "https://example.com/old.png",
      },
      {
        id: "f1",
        file: new File([new Uint8Array(1)], "new.png", { type: "image/png" }),
        previewUrl: "blob:new",
      },
    ];

    await act(async () => {
      await result.current.updateMoment(makeMoment(1), "更新后的碎语", images);
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/moments");
    expect(init).toMatchObject({ method: "POST" });
    const body = init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("content")).toBe("更新后的碎语");
    expect(body.getAll("image_urls")).toEqual(["https://example.com/old.png"]);
    expect(body.getAll("images").length).toBe(1);
    expect(body.getAll("image_order")).toEqual(["url:0", "file:0"]);
    expect(result.current.moments[0]?.content).toBe("更新后的碎语");
  });

  it("toggleLike 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "碎语已锁定，无法点赞" }, 400));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.toggleLike(makeMoment(1));
    });

    expect(mockAddToast).toHaveBeenCalledWith("碎语已锁定，无法点赞", "error");
  });

  it("toggleLike 网络异常时 toast 展示点赞兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.toggleLike(makeMoment(1));
    });

    expect(mockAddToast).toHaveBeenCalledWith("点赞失败，请稍后重试", "error");
  });

  it("toggleLike 取消点赞网络异常时 toast 展示取消点赞兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const liked = makeMoment(1, { is_liked: true });
    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [liked] }) }),
    );

    await act(async () => {
      await result.current.toggleLike(liked);
    });

    expect(mockAddToast).toHaveBeenCalledWith("取消点赞失败，请稍后重试", "error");
  });

  it("updateMoment 业务错误时 toast 展示后端返回的具体原因并抛出", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "内容长度不能超过 800 个字符" }, 400),
    );

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "超长", [])).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("内容长度不能超过 800 个字符", "error");
  });

  it("toggleTop 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "置顶数量已达上限" }, 400));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.toggleTop(makeMoment(1));
    });

    expect(mockAddToast).toHaveBeenCalledWith("置顶数量已达上限", "error");
  });

  it("toggleTop 网络异常时 toast 展示置顶兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.toggleTop(makeMoment(1));
    });

    expect(mockAddToast).toHaveBeenCalledWith("置顶失败，请稍后重试", "error");
  });

  it("toggleTop 取消置顶网络异常时 toast 展示取消置顶兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const topped = makeMoment(1, { is_top: true });
    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [topped] }) }),
    );

    await act(async () => {
      await result.current.toggleTop(topped);
    });

    expect(mockAddToast).toHaveBeenCalledWith("取消置顶失败，请稍后重试", "error");
  });

  it("deleteMoment 业务错误时 toast 展示后端返回的具体原因并抛出", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "无权删除该碎语" }, 403));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.deleteMoment(makeMoment(1))).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("无权删除该碎语", "error");
  });

  it("deleteMoment 网络异常时 toast 展示删除兜底文案并抛出", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.deleteMoment(makeMoment(1))).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("删除失败，请稍后重试", "error");
  });

  // ── 发布/编辑幂等键与 moderation 合并 ──

  it("updateMoment 携带 moment-edit 幂等键", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeMoment(1, { content: "x" })));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.updateMoment(makeMoment(1), "x", []);
    });

    expect(lastIdempotencyKey()).toMatch(/^moment-edit:/);
  });

  it("updateMoment 5xx 重试时保留同一幂等键", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [])).rejects.toThrow();
    });
    const key1 = lastIdempotencyKey();

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [])).rejects.toThrow();
    });
    const key2 = lastIdempotencyKey();

    expect(key2).toBe(key1);
  });

  it("updateMoment 4xx 后重试换新幂等键", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "内容违规" }, 400))
      .mockResolvedValueOnce(jsonResponse(makeMoment(1, { content: "x" })));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [])).rejects.toThrow();
    });
    const key1 = lastIdempotencyKey();

    await act(async () => {
      await result.current.updateMoment(makeMoment(1), "x", []);
    });
    const key2 = lastIdempotencyKey();

    expect(key2).not.toBe(key1);
  });

  it("updateMoment 正文变化后换新幂等键", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [])).rejects.toThrow();
    });
    const key1 = lastIdempotencyKey();

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "y", [])).rejects.toThrow();
    });
    const key2 = lastIdempotencyKey();

    expect(key2).not.toBe(key1);
  });

  it("updateMoment 图片顺序变化后换新幂等键", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: "后端异常" }, 500));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    const a: MomentImageItem = {
      id: "a",
      remoteUrl: "https://cdn/a.png",
      previewUrl: "https://cdn/a.png",
    };
    const b: MomentImageItem = {
      id: "b",
      remoteUrl: "https://cdn/b.png",
      previewUrl: "https://cdn/b.png",
    };

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [a, b])).rejects.toThrow();
    });
    const key1 = lastIdempotencyKey();

    await act(async () => {
      await expect(result.current.updateMoment(makeMoment(1), "x", [b, a])).rejects.toThrow();
    });
    const key2 = lastIdempotencyKey();

    expect(key2).not.toBe(key1);
  });

  it("低风险编辑合并新正文与待审 moderation", async () => {
    const updated = makeMoment(1, {
      content: "新正文",
      moderation: {
        public_state: "visible",
        display_version: "pending",
        has_pending_revision: true,
        pending_risk_level: "low",
        can_interact: true,
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ list: [makeMoment(1, { content: "旧正文" })] }),
      }),
    );

    await act(async () => {
      await result.current.updateMoment(makeMoment(1, { content: "旧正文" }), "新正文", []);
    });

    expect(result.current.moments[0]?.content).toBe("新正文");
    expect(result.current.moments[0]?.moderation?.has_pending_revision).toBe(true);
    expect(result.current.moments[0]?.moderation?.pending_risk_level).toBe("low");
  });

  it("中风险编辑合并最后通过正文并保留 pending_content", async () => {
    const updated = makeMoment(1, {
      content: "旧正文",
      moderation: {
        public_state: "visible",
        display_version: "last_approved",
        has_pending_revision: true,
        pending_risk_level: "medium",
        pending_content: "新正文",
        can_interact: true,
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ list: [makeMoment(1, { content: "旧正文" })] }),
      }),
    );

    await act(async () => {
      await result.current.updateMoment(makeMoment(1, { content: "旧正文" }), "新正文", []);
    });

    expect(result.current.moments[0]?.content).toBe("旧正文");
    expect(result.current.moments[0]?.moderation?.pending_content).toBe("新正文");
  });

  it("高风险错误不刷新列表并展示后端风险文案", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "内容含严重违规，已拦截" }, 400));

    const initial = makeMoment(1, { content: "旧正文" });
    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [initial] }) }),
    );

    await act(async () => {
      await expect(result.current.updateMoment(initial, "违规内容", [])).rejects.toThrow();
    });

    expect(result.current.moments[0]?.content).toBe("旧正文");
    expect(mockAddToast).toHaveBeenCalledWith("内容含严重违规，已拦截", "error");
  });

  it("updateMoment 成功 toast 优先 moderation.notice", async () => {
    const updated = makeMoment(1, {
      content: "x",
      moderation: {
        public_state: "visible",
        display_version: "pending",
        has_pending_revision: true,
        can_interact: true,
        notice: "碎语已提交，待审中",
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));

    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [makeMoment(1)] }) }),
    );

    await act(async () => {
      await result.current.updateMoment(makeMoment(1), "x", []);
    });

    expect(mockAddToast).toHaveBeenCalledWith("碎语已提交，待审中", "success");
  });

  it("can_interact=false 时 toggleLike 不发起请求也不弹登录", async () => {
    const moment = makeMoment(1, {
      moderation: {
        public_state: "visible",
        display_version: "last_approved",
        has_pending_revision: false,
        can_interact: false,
      },
    });
    const { result } = renderHook(() =>
      useMomentList({ initialPage: makePageResp({ list: [moment] }) }),
    );

    await act(async () => {
      await result.current.toggleLike(moment);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
  });
});
