import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp, CommentReplyResp } from "@repo/api";
import { useCommentList } from "./use-comment-list";

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论 ${id}`,
    replies: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function makeReply(id: number, commentId: number): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: commentId,
    from_user_id: 2,
    to_user_id: 1,
    parent_reply_id: 0,
    content: `回复 ${id}`,
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

  it("挂载时自动加载第 1 页", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("hasMore 在 page < pages 时为 true", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)], 1, 3)),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore 追加下一页数据到列表末尾", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage([makeComment(1)], 1, 2)),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage([makeComment(2)], 2, 2)),
      } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBe(1);
    expect(result.current.comments[1].id).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("addComment 在列表末尾追加新评论", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addComment(makeComment(99));
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[1].id).toBe(99);
  });

  it("addReply 追加回复到正确的评论下", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addReply(1, makeReply(10, 1));
    });

    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies[0].id).toBe(10);
    expect(result.current.comments[1].replies).toHaveLength(0);
  });

  it("fetch 失败时设置 error 并停止 loading", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.comments).toHaveLength(0);
  });
});
