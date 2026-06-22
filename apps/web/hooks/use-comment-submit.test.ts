// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

const addToastMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/toast", () => ({ addToast: addToastMock }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("useCommentSubmit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("submitComment article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
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
    );

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/5/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitComment moment 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
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
    );

    const { result } = renderHook(() => useCommentSubmit("moment", 3));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/moments/3/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitReply article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
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
    );

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitReply(1, "reply content"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/comments/1/replies",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("401 时返回 null 并 toast 提示登录", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "Unauthorized" }, 401));

    const { result } = renderHook(() => useCommentSubmit("article", 1));
    let ret: unknown;
    await act(async () => {
      ret = await result.current.submitComment("test");
    });

    expect(ret).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("请先登录", "error");
  });

  it("业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ error: "内容长度不能超过 2000 个字符" }, 400),
    );

    const { result } = renderHook(() => useCommentSubmit("article", 1));
    let ret: unknown;
    await act(async () => {
      ret = await result.current.submitComment("超长内容");
    });

    expect(ret).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("内容长度不能超过 2000 个字符", "error");
  });
});
