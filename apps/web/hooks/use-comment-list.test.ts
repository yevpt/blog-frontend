// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { useCommentList } from "./use-comment-list";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论 ${id}`,
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function mockPage(list: CommentItemResp[], page = 1, pages = 1): CommentPageResp {
  return { total: list.length, pages, page, page_size: 10, list };
}

describe("useCommentList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("article 类型使用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    renderHook(() => useCommentList("article", 42));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/articles/42/comments"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("moment 类型使用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    renderHook(() => useCommentList("moment", 7));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/moments/7/comments"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("挂载时自动加载第 1 页", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeComment(1), makeComment(2)])),
    );

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore 追加下一页", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(mockPage([makeComment(1)], 1, 2)))
      .mockResolvedValueOnce(jsonResponse(mockPage([makeComment(2)], 2, 2)));

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
  });

  it("addComment 插入到列表头部（时间倒序）", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addComment(makeComment(99)));
    expect(result.current.comments[0].id).toBe(99);
  });

  it("incrementReplyCount 将指定评论 reply_count +1", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.incrementReplyCount(1));
    expect(result.current.comments[0].reply_count).toBe(1);
  });

  it("updateCommentLike 更新指定评论的 is_liked 和 like_count", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateCommentLike(1, true, 5));
    expect(result.current.comments[0].is_liked).toBe(true);
    expect(result.current.comments[0].like_count).toBe(5);
  });

  it("卸载时中止进行中的首屏请求", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(global.fetch).mockImplementation((_url, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useCommentList("article", 1));
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("fetch 失败时设置 error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "failed" }, 500));

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
