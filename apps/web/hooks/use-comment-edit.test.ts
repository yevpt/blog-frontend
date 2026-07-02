// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentEdit } from "./use-comment-edit";

const addToastMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/toast", () => ({ addToast: addToastMock }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function makeCommentResp(overrides: Partial<object> = {}): object {
  return {
    id: 7,
    content: "edited",
    reply_count: 0,
    like_count: 1,
    is_liked: false,
    target_type: "article",
    target_id: 5,
    user_id: 1,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeReplyResp(overrides: Partial<object> = {}): object {
  return {
    id: 11,
    content: "edited reply",
    like_count: 1,
    is_liked: false,
    target_type: "article",
    comment_id: 1,
    from_user_id: 2,
    to_user_id: 1,
    parent_reply_id: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function headers(call: unknown): Record<string, string> {
  const init = (call as [unknown, { headers?: Record<string, string> } | undefined])[1];
  return init?.headers ?? {};
}

describe("useCommentEdit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  describe("editComment", () => {
    it("article 类型 PATCH 转发到 /api/articles/comments/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));

      const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, unknown];
      expect(url).toBe("/api/articles/comments/7");
      expect(init).toMatchObject({ method: "PATCH" });
    });

    it("moment 类型 PATCH 转发到 /api/moments/comments/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(makeCommentResp({ target_type: "moment" })),
      );

      const { result } = renderHook(() => useCommentEdit("moment"));
      await act(() => result.current.editComment(7, "edited"));

      const [url] = vi.mocked(global.fetch).mock.calls[0] as [string, unknown];
      expect(url).toBe("/api/moments/comments/7");
    });

    it("body 仅包含 content", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));

      const init = (vi.mocked(global.fetch).mock.calls[0] as [unknown, { body?: string }])[1];
      expect(JSON.parse(init.body ?? "{}")).toEqual({ content: "edited" });
    });

    it("携带非空 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));

      expect(headers(vi.mocked(global.fetch).mock.calls[0])["Idempotency-Key"]).toBeTruthy();
    });

    it("成功返回更新后的评论", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(makeCommentResp({ content: "new content" })),
      );

      const { result } = renderHook(() => useCommentEdit("article"));
      let ret: unknown;
      await act(async () => {
        ret = await result.current.editComment(7, "new content");
      });

      expect(ret).toMatchObject({ id: 7, content: "new content" });
    });

    it("成功 toast 优先使用 moderation.notice", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse({
          ...makeCommentResp(),
          moderation: {
            public_state: "visible",
            display_version: "last_approved",
            has_pending_revision: true,
            pending_risk_level: "medium",
            can_interact: true,
            notice: "新版本已提交，等待人工审核",
          },
        }),
      );

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "new"));

      expect(addToastMock).toHaveBeenCalledWith(
        "新版本已提交，等待人工审核",
        expect.not.stringMatching("error"),
      );
    });
  });

  describe("editReply", () => {
    it("guestbook 类型 PATCH 转发到 /api/guestbook/comment-replies/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentEdit("guestbook"));
      await act(() => result.current.editReply(11, 2, "edited reply"));

      const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, unknown];
      expect(url).toBe("/api/guestbook/comment-replies/11");
      expect(init).toMatchObject({ method: "PATCH" });
    });

    it("article 类型 PATCH 转发到 /api/articles/comment-replies/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editReply(11, 2, "edited reply"));

      const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, unknown];
      expect(url).toBe("/api/articles/comment-replies/11");
      expect(init).toMatchObject({ method: "PATCH" });
    });

    it("moment 类型 PATCH 转发到 /api/moments/comment-replies/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(makeReplyResp({ target_type: "moment" })),
      );

      const { result } = renderHook(() => useCommentEdit("moment"));
      await act(() => result.current.editReply(11, 2, "edited reply"));

      const [url] = vi.mocked(global.fetch).mock.calls[0] as [string, unknown];
      expect(url).toBe("/api/moments/comment-replies/11");
    });

    it("body 包含 parent_reply_id 和 content", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editReply(11, 2, "edited reply"));

      const init = (vi.mocked(global.fetch).mock.calls[0] as [unknown, { body?: string }])[1];
      expect(JSON.parse(init.body ?? "{}")).toEqual({
        parent_reply_id: 2,
        content: "edited reply",
      });
    });

    it("携带非空 Idempotency-Key 且与评论编辑分开复用", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse(makeReplyResp()))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editReply(11, 2, "edited reply"));
      await act(() => result.current.editComment(11, "edited"));

      const replyHeaders = headers(vi.mocked(global.fetch).mock.calls[0]);
      const commentHeaders = headers(vi.mocked(global.fetch).mock.calls[1]);
      expect(replyHeaders["Idempotency-Key"]).toBeTruthy();
      expect(commentHeaders["Idempotency-Key"]).toBeTruthy();
      expect(replyHeaders["Idempotency-Key"]).not.toBe(commentHeaders["Idempotency-Key"]);
    });
  });

  describe("幂等键复用规则", () => {
    it("编辑请求进行中时忽略重复提交", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentEdit("article"));

      const first = result.current.editComment(7, "edited");
      const duplicateRequest = result.current.editComment(7, "edited");
      resolvers.forEach((resolve) => resolve(jsonResponse(makeCommentResp())));
      let duplicate: unknown = "sentinel";
      await act(async () => {
        await first;
        duplicate = await duplicateRequest;
      });

      expect(duplicate).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("不同评论并发编辑互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentEdit("article"));

      const forCommentA = result.current.editComment(7, "编辑A");
      const forCommentB = result.current.editComment(9, "编辑B");
      resolvers.forEach((resolve) => resolve(jsonResponse(makeCommentResp())));

      let resultA: unknown;
      let resultB: unknown;
      await act(async () => {
        resultA = await forCommentA;
        resultB = await forCommentB;
      });

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("5xx 失败期间保留同一个 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));
      await act(() => result.current.editComment(7, "edited"));

      const firstHeaders = headers(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = headers(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).toBe(secondHeaders["Idempotency-Key"]);
    });

    it("成功后下一次逻辑提交生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));
      await act(() => result.current.editComment(7, "edited"));

      const firstHeaders = headers(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = headers(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("401 拒绝后下一次逻辑提交生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "edited"));
      await act(() => result.current.editComment(7, "edited"));

      const firstHeaders = headers(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = headers(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("评论编辑载荷变化时生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentEdit("article"));
      await act(() => result.current.editComment(7, "a"));
      await act(() => result.current.editComment(7, "b"));

      const firstHeaders = headers(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = headers(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });
  });

  describe("错误处理", () => {
    it("401 返回 null 且 toast 提示登录", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "Unauthorized" }, 401));

      const { result } = renderHook(() => useCommentEdit("article"));
      let ret: unknown = "sentinel";
      await act(async () => {
        ret = await result.current.editComment(7, "edited");
      });

      expect(ret).toBeNull();
      expect(addToastMock).toHaveBeenCalledWith("请先登录", "error");
    });

    it("业务错误 toast 展示后端原因并返回 null", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "内容长度不合规" }, 400));

      const { result } = renderHook(() => useCommentEdit("article"));
      let ret: unknown = "sentinel";
      await act(async () => {
        ret = await result.current.editComment(7, "edited");
      });

      expect(ret).toBeNull();
      expect(addToastMock).toHaveBeenCalledWith("内容长度不合规", "error");
    });
  });
});
