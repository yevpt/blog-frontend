// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ArticleListItemResp, ArticlePageResp } from "@repo/api";
import { useArticleList } from "./use-article-list";

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

function makeArticle(id: number, title: string): ArticleListItemResp {
  return {
    id,
    title,
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 10,
    like_count: 2,
    is_liked: false,
    comment_count: 1,
    is_recommended: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makePageResp(overrides: Partial<ArticlePageResp> = {}): ArticlePageResp {
  return {
    total: 2,
    pages: 1,
    page: 1,
    page_size: 10,
    list: [makeArticle(1, "文章一"), makeArticle(2, "文章二")],
    ...overrides,
  };
}

describe("useArticleList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("initializes from initialPage", () => {
    const initialPage = makePageResp({ page: 2, pages: 3 });
    const { result } = renderHook(() => useArticleList({ initialPage }));

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageData).toEqual(initialPage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchError).toBe(false);
    expect(result.current.currentCategoryId).toBe(0);
  });

  it("changeCategory(id) resets to page 1 and requests /api/articles?page=1&category_id=ID", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makePageResp({ list: [makeArticle(3, "编程文章")] })), {
        status: 200,
      }),
    );

    const { result } = renderHook(() => useArticleList({ initialPage: makePageResp() }));

    await act(async () => {
      result.current.changeCategory(1);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
      const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
      expect(url).toBe("/api/articles?page=1&category_id=1");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.currentCategoryId).toBe(1);
      expect(result.current.pageData.list[0]?.title).toBe("编程文章");
    });
  });

  it("changePage(page) requests current category", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makePageResp({ page: 2, list: [makeArticle(11, "第二页")] })), {
        status: 200,
      }),
    );

    const { result } = renderHook(() =>
      useArticleList({ initialPage: makePageResp({ pages: 3 }) }),
    );

    await act(async () => {
      result.current.changeCategory(2);
    });
    await waitFor(() => expect(result.current.currentCategoryId).toBe(2));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makePageResp({ page: 2, list: [makeArticle(11, "第二页")] })), {
        status: 200,
      }),
    );

    await act(async () => {
      result.current.changePage(2);
    });

    await waitFor(() => {
      const lastCall = vi.mocked(fetch).mock.calls.at(-1);
      expect(lastCall?.[0]).toBe("/api/articles?page=2&category_id=2");
      expect(result.current.currentPage).toBe(2);
      expect(result.current.pageData.list[0]?.title).toBe("第二页");
    });
  });

  it("aborts/replaces in-flight list request when a new list request starts", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirst!: (value: Response) => void;

    vi.mocked(fetch)
      .mockImplementationOnce((_url, init) => {
        firstSignal = init?.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makePageResp({ list: [makeArticle(5, "分类结果")] })), {
          status: 200,
        }),
      );

    const { result } = renderHook(() =>
      useArticleList({ initialPage: makePageResp({ pages: 3, total: 25 }) }),
    );

    act(() => {
      void result.current.changePage(2);
    });

    await waitFor(() => {
      expect(firstSignal).toBeInstanceOf(AbortSignal);
    });

    await act(async () => {
      result.current.changeCategory(1);
    });

    expect(firstSignal?.aborted).toBe(true);

    await act(async () => {
      resolveFirst(
        new Response(
          JSON.stringify(makePageResp({ page: 2, list: [makeArticle(99, "过期结果")] })),
          {
            status: 200,
          },
        ),
      );
    });

    await waitFor(() => {
      expect(result.current.pageData.list[0]?.title).toBe("分类结果");
    });
  });

  it("toggleLike(article) opens login modal when user is missing", async () => {
    mockSessionUserId = null;
    const { result } = renderHook(() => useArticleList({ initialPage: makePageResp() }));

    await act(async () => {
      await result.current.toggleLike(makeArticle(1, "文章一"));
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("successful like updates only the matching article item", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ is_liked: true, like_count: 9 }), { status: 200 }),
    );

    const initialPage = makePageResp({
      list: [makeArticle(1, "文章一"), makeArticle(2, "文章二")],
    });
    const { result } = renderHook(() => useArticleList({ initialPage }));

    await act(async () => {
      await result.current.toggleLike(makeArticle(1, "文章一"));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/articles/1/like", { method: "POST" });
      expect(result.current.pageData.list[0]?.is_liked).toBe(true);
      expect(result.current.pageData.list[0]?.like_count).toBe(9);
      expect(result.current.pageData.list[1]?.is_liked).toBe(false);
      expect(result.current.pageData.list[1]?.like_count).toBe(2);
    });
  });

  it("toggleLike 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "文章已锁定，无法点赞" }), { status: 400 }),
    );

    const { result } = renderHook(() => useArticleList({ initialPage: makePageResp() }));

    await act(async () => {
      await result.current.toggleLike(makeArticle(1, "文章一"));
    });

    expect(mockAddToast).toHaveBeenCalledWith("文章已锁定，无法点赞", "error");
  });

  it("toggleLike 网络异常时 toast 展示点赞兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useArticleList({ initialPage: makePageResp() }));

    await act(async () => {
      await result.current.toggleLike(makeArticle(1, "文章一"));
    });

    expect(mockAddToast).toHaveBeenCalledWith("点赞失败，请稍后重试", "error");
  });

  it("toggleLike 取消点赞网络异常时 toast 展示取消点赞兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const liked = makeArticle(1, "文章一");
    liked.is_liked = true;
    const { result } = renderHook(() =>
      useArticleList({ initialPage: makePageResp({ list: [liked] }) }),
    );

    await act(async () => {
      await result.current.toggleLike(liked);
    });

    expect(mockAddToast).toHaveBeenCalledWith("取消点赞失败，请稍后重试", "error");
  });
});
