// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentLike } from "./use-comment-like";

describe("useCommentLike", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("toggleCommentLike article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 1 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("article"));
    await act(() => result.current.toggleCommentLike(42));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/comments/42/like",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("toggleReplyLike moment 调用正确 URL（含 commentId）", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 2 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("moment"));
    await act(() => result.current.toggleReplyLike(10, 99));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/moments/comments/10/replies/99/like",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("401 时返回 null", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentLike("article"));
    let ret: unknown;
    await act(async () => {
      ret = await result.current.toggleCommentLike(1);
    });
    expect(ret).toBeNull();
  });

  it("toggleCommentLike guestbook 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 1 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("guestbook"));
    await act(() => result.current.toggleCommentLike(3));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/guestbook/3/like",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("toggleReplyLike guestbook 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 1 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("guestbook"));
    await act(() => result.current.toggleReplyLike(5, 20));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/guestbook/comments/5/replies/20/like",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
