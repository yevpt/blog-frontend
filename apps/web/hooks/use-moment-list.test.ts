// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { useMomentList } from "./use-moment-list";
import { useSnippetModal } from "@/store/use-snippet-modal";

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

describe("useMomentList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    useSnippetModal.setState({ isOpen: false, publishCount: 0, lastPublishedUserId: null });
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
      useSnippetModal.getState().markPublished(1);
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
      useSnippetModal.getState().markPublished(6);
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

  it("toggleTop deletes top endpoint when snippet is already top", async () => {
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

  it("deleteMoment deletes endpoint and removes the snippet locally", async () => {
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

  it("updateMoment saves through multipart endpoint and replaces snippet locally", async () => {
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
});
