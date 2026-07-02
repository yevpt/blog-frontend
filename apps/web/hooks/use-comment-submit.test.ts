// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

const addToastMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/toast", () => ({ addToast: addToastMock }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function extractIdempotencyKey(init: unknown): string | undefined {
  const headers = (init as { headers?: Record<string, string> } | undefined)?.headers;
  if (!headers) return undefined;
  return headers["Idempotency-Key"] ?? headers["idempotency-key"];
}

function extractHeaders(call: unknown): Record<string, string> {
  const init = (call as [unknown, { headers?: Record<string, string> }])[1];
  return init?.headers ?? {};
}

function makeCommentResp(overrides: Partial<object> = {}): object {
  return {
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
    ...overrides,
  };
}

function makeReplyResp(overrides: Partial<object> = {}): object {
  return {
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
    ...overrides,
  };
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

  describe("幂等键", () => {
    it("submitComment 请求携带非空 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));

      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(extractIdempotencyKey(call[1])).toBeTruthy();
    });

    it("submitReply 请求携带非空 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "reply content"));

      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(extractIdempotencyKey(call[1])).toBeTruthy();
    });

    it("评论同一逻辑提交内部重试（5xx）复用同一个 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      // 5xx 重试期间 hook 不重置键，相同指纹返回同一 key 由后端幂等保证不重复插入
      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).toBe(secondHeaders["Idempotency-Key"]);
    });

    it("评论载荷变化时生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("world"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("回复同一逻辑提交内部重试（5xx）复用同一个 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "reply content", 2));
      await act(() => result.current.submitReply(1, "reply content", 2));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).toBe(secondHeaders["Idempotency-Key"]);
    });

    it("回复载荷变化（content）时生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "a", 2));
      await act(() => result.current.submitReply(1, "b", 2));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("回复 parent_reply_id 变化时生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "a", 2));
      await act(() => result.current.submitReply(1, "a", 3));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("评论和回复使用各自独立的 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()))
        .mockResolvedValueOnce(jsonResponse(makeReplyResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitReply(1, "hello"));

      const commentHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const replyHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(commentHeaders["Idempotency-Key"]).not.toBe(replyHeaders["Idempotency-Key"]);
    });

    it("5xx 错误后同载荷重试保持同一 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).toBe(secondHeaders["Idempotency-Key"]);
    });

    it("网络异常后同载荷重试保持同一 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).toBe(secondHeaders["Idempotency-Key"]);
    });

    it("成功后下一次逻辑提交生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("401 拒绝后下一次逻辑提交生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("业务拒绝（400）后下一次逻辑提交生成新的 Idempotency-Key", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse({ error: "内容不合规" }, 400))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));
      await act(() => result.current.submitComment("hello"));

      const firstHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const secondHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(firstHeaders["Idempotency-Key"]).not.toBe(secondHeaders["Idempotency-Key"]);
    });

    it("不修改 useIdempotencyKey 行为：非自身 scope 不影响（评论键 ≠ 回复键，互不复用）", async () => {
      // 该用例保护评论/回复使用各自独立 scope 的约束
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(jsonResponse(makeReplyResp()))
        .mockResolvedValueOnce(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "same", 0));
      await act(() => result.current.submitComment("same"));

      const replyHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[0]);
      const commentHeaders = extractHeaders(vi.mocked(global.fetch).mock.calls[1]);
      expect(replyHeaders["Idempotency-Key"]).not.toBe(commentHeaders["Idempotency-Key"]);
    });
  });

  describe("成功 toast", () => {
    it("submitComment 成功后展示默认成功提示", async () => {
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(makeCommentResp()));

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));

      const successCalls = vi.mocked(addToastMock).mock.calls.filter((c) => c[1] !== "error");
      expect(successCalls.length).toBeGreaterThan(0);
    });

    it("submitComment 响应带 moderation.notice 时优先展示 notice 文案", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse({
          ...makeCommentResp(),
          moderation: {
            public_state: "visible",
            display_version: "last_approved",
            has_pending_revision: false,
            can_interact: true,
            notice: "内容已进入待审，请耐心等待",
          },
        }),
      );

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitComment("hello"));

      expect(addToastMock).toHaveBeenCalledWith(
        "内容已进入待审，请耐心等待",
        expect.not.stringMatching("error"),
      );
    });

    it("submitReply 响应带 moderation.notice 时优先展示 notice 文案", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse({
          ...makeReplyResp(),
          moderation: {
            public_state: "visible",
            display_version: "last_approved",
            has_pending_revision: false,
            can_interact: true,
            notice: "回复已提交，待审中",
          },
        }),
      );

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      await act(() => result.current.submitReply(1, "hello"));

      expect(addToastMock).toHaveBeenCalledWith(
        "回复已提交，待审中",
        expect.not.stringMatching("error"),
      );
    });
  });

  describe("高风险失败", () => {
    it("业务拒绝时不返回数据（不调用方插入/计数），仅 toast 错误", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse({ error: "内容涉高风险，已被拦截" }, 400),
      );

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let ret: unknown = "sentinel";
      await act(async () => {
        ret = await result.current.submitComment("hello");
      });

      expect(ret).toBeNull();
      expect(addToastMock).toHaveBeenCalledWith("内容涉高风险，已被拦截", "error");
    });
  });

  describe("并发提交", () => {
    it("同一评论并发重复提交回复时第二次调用短路返回 null", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentSubmit("article", 5));

      const first = result.current.submitReply(1, "hello", 0);
      const duplicate = result.current.submitReply(1, "hello", 0);
      resolvers.forEach((resolve) => resolve(jsonResponse(makeReplyResp())));

      let duplicateResult: unknown = "sentinel";
      await act(async () => {
        await first;
        duplicateResult = await duplicate;
      });

      expect(duplicateResult).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("不同评论并发提交回复互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentSubmit("article", 5));

      const forCommentA = result.current.submitReply(1, "回复A", 0);
      const forCommentB = result.current.submitReply(2, "回复B", 0);
      resolvers.forEach((resolve, index) =>
        resolve(jsonResponse(makeReplyResp({ id: index === 0 ? 10 : 11 }))),
      );

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
  });
});
