// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

describe("useCommentSubmit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("submitComment article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 1,
          content: "test",
          reply_count: 0,
          like_count: 0,
          is_liked: false,
          target_type: "article",
          target_id: 5,
          user_id: 1,
          created_at: "",
          updated_at: "",
        }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/5/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitComment moment 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 1,
          content: "test",
          reply_count: 0,
          like_count: 0,
          is_liked: false,
          target_type: "moment",
          target_id: 3,
          user_id: 1,
          created_at: "",
          updated_at: "",
        }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("moment", 3));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/moments/3/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitReply article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 10,
          content: "reply",
          like_count: 0,
          is_liked: false,
          target_type: "article",
          comment_id: 1,
          from_user_id: 2,
          to_user_id: 1,
          parent_reply_id: 0,
          created_at: "",
          updated_at: "",
        }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitReply(1, "reply content"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/comments/1/replies",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("401 时返回 null 并设置 error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 1));
    let ret: unknown;
    await act(async () => {
      ret = await result.current.submitComment("test");
    });

    expect(ret).toBeNull();
    expect(result.current.error).toBe("请先登录");
  });
});
