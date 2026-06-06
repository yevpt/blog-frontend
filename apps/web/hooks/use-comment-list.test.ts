// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { useCommentList } from "./use-comment-list";

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
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    renderHook(() => useCommentList("article", 42));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/articles/42/comments"),
      );
    });
  });

  it("moment 类型使用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    renderHook(() => useCommentList("moment", 7));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/moments/7/comments"),
      );
    });
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

  it("loadMore 追加下一页", async () => {
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

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
  });

  it("addComment 追加到列表末尾", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addComment(makeComment(99)));
    expect(result.current.comments[1].id).toBe(99);
  });

  it("incrementReplyCount 将指定评论 reply_count +1", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.incrementReplyCount(1));
    expect(result.current.comments[0].reply_count).toBe(1);
  });

  it("fetch 失败时设置 error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
