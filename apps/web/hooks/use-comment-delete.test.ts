// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCommentDelete } from "./use-comment-delete";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("useCommentDelete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("deleteComment 按 targetType 调用一级评论删除接口", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ id: 9 }));
    const { result } = renderHook(() => useCommentDelete("article"));

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteComment(9);
    });

    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/articles/comments/9", { method: "DELETE" });
  });

  it("deleteReply 使用扁平的评论回复删除 route", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ id: 12 }));
    const { result } = renderHook(() => useCommentDelete("moment"));

    await act(async () => {
      await result.current.deleteReply(12);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/moments/comment-replies/12", {
      method: "DELETE",
    });
  });

  it("删除失败时返回 false", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "Forbidden" }, 403));
    const { result } = renderHook(() => useCommentDelete("article"));

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteComment(9);
    });

    expect(ok).toBe(false);
  });
});
