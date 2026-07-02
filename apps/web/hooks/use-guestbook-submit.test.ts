// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookSubmit } from "./use-guestbook-submit";
import type { GuestbookItemResp, CommentReplyResp } from "@repo/api";

const addToastMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/toast", () => ({ addToast: addToastMock }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function lastRequest(): RequestInit {
  const calls = vi.mocked(fetch).mock.calls;
  const last = calls[calls.length - 1];
  return (last?.[1] ?? {}) as RequestInit;
}

function requestHeader(name: string): string | null {
  const headers = lastRequest().headers as Record<string, string> | undefined;
  return headers?.[name] ?? null;
}

const baseItem = {
  owner_user_id: 0,
  from_user_id: 1,
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} satisfies Partial<GuestbookItemResp>;

const lowRiskItem: GuestbookItemResp = {
  ...baseItem,
  id: 1,
  content: "Hello!",
  moderation: {
    public_state: "visible",
    display_version: "pending",
    has_pending_revision: true,
    pending_risk_level: "low",
    can_interact: true,
    notice: "内容已发布，正在等待审核",
  },
};

const mockReply: CommentReplyResp = {
  id: 10,
  target_type: "guestbook",
  comment_id: 1,
  from_user_id: 2,
  to_user_id: 1,
  parent_reply_id: 0,
  content: "Hi!",
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("useGuestbookSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始状态：非提交中", () => {
    const { result } = renderHook(() => useGuestbookSubmit());
    expect(result.current.isSubmitting).toBe(false);
  });

  it("submitEntry 成功返回新条目并发送 Idempotency-Key", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(lowRiskItem));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hello!");
    });
    expect((returned as GuestbookItemResp | null)?.id).toBe(1);
    expect(requestHeader("Idempotency-Key")).toMatch(/^guestbook:[0-9a-f-]+$/);
  });

  it("submitEntry 成功且 moderation.notice 存在时 toast 使用 notice", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(lowRiskItem));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hello!");
    });
    expect(addToastMock).toHaveBeenCalledWith("内容已发布，正在等待审核", "success");
  });

  it("submitEntry 成功且无 notice 时 toast 使用兜底文案", async () => {
    const noNotice: GuestbookItemResp = { ...lowRiskItem, moderation: undefined };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(noNotice));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hello!");
    });
    expect(addToastMock).toHaveBeenCalledWith("留言已发布", "success");
  });

  it("submitEntry 401 时返回 null 并 toast 提示登录", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hi");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("请先登录", "error");
  });

  it("submitEntry 4xx 业务错误（高风险拒绝）toast 展示后端风险文案", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "内容包含违规信息，已被拒绝" }, 400),
    );
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("违规内容");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("内容包含违规信息，已被拒绝", "error");
  });

  it("submitEntry 5xx / 网络异常时 toast 兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(addToastMock).toHaveBeenCalledWith("发布失败，请稍后重试", "error");
  });

  it("留言与回复使用不同且稳定的幂等键作用域", async () => {
    const entryResp = jsonResponse({ ...lowRiskItem, id: 1 });
    const replyResp = jsonResponse(mockReply);
    const { result } = renderHook(() => useGuestbookSubmit());

    await act(async () => {
      await result.current.submitEntry("留言正文");
    });
    const entryKey = requestHeader("Idempotency-Key");

    vi.mocked(fetch).mockResolvedValueOnce(replyResp);
    await act(async () => {
      await result.current.submitReply(1, "回复正文");
    });
    const replyKey = requestHeader("Idempotency-Key");

    expect(entryKey).toMatch(/^guestbook:/);
    expect(replyKey).toMatch(/^reply:/);
    expect(entryKey).not.toBe(replyKey);

    // 再次以相同正文提交留言，幂等键保持稳定（不刷新）
    vi.mocked(fetch).mockResolvedValueOnce(entryResp);
    await act(async () => {
      await result.current.submitEntry("留言正文");
    });
    expect(requestHeader("Idempotency-Key")).toBe(entryKey);
  });

  it("正文变化后留言幂等键自动获得新值", async () => {
    const { result } = renderHook(() => useGuestbookSubmit());
    // 第一次失败（可重试错误）：保留键
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      await result.current.submitEntry("正文A");
    });
    const keyA = requestHeader("Idempotency-Key");

    // 正文变化后应使用新作用域指纹生成新键
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      await result.current.submitEntry("正文B");
    });
    const keyB = requestHeader("Idempotency-Key");

    expect(keyA).not.toBe(keyB);

    // 同正文在网络错误期间反复重试应保持同一键（稳定供原载荷复用）
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      await result.current.submitEntry("正文B");
    });
    expect(requestHeader("Idempotency-Key")).toBe(keyB);
  });

  it("submitReply 成功并携带 Idempotency-Key（reply 作用域）", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockReply));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(7, "Hi!", 3);
    });
    expect((returned as CommentReplyResp | null)?.id).toBe(10);
    expect(requestHeader("Idempotency-Key")).toMatch(/^reply:[0-9a-f-]+$/);
    expect(addToastMock).not.toHaveBeenCalled(); // 回复成功默认不 toast
  });

  it("submitReply 4xx 业务失败展示后端原因（不增加回复数）", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "内容长度不能超过 2000 个字符" }, 400),
    );
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "超长内容");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("内容长度不能超过 2000 个字符", "error");
  });

  it("editEntry 调用 PATCH /api/guestbook/:id 并带 guestbook-edit 幂等键", async () => {
    const updated: GuestbookItemResp = { ...lowRiskItem, id: 42, content: "新正文" };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.editEntry(42, "新正文");
    });
    expect((returned as GuestbookItemResp | null)?.id).toBe(42);
    const calls = vi.mocked(fetch).mock.calls;
    const [url, init] = calls[calls.length - 1];
    expect(url).toBe("/api/guestbook/42");
    expect(init?.method).toBe("PATCH");
    expect(requestHeader("Idempotency-Key")).toMatch(/^guestbook-edit:[0-9a-f-]+$/);
  });

  it("editEntry 成功且 moderation.notice 存在时优先使用 notice", async () => {
    const updated: GuestbookItemResp = {
      ...lowRiskItem,
      id: 42,
      moderation: { ...lowRiskItem.moderation!, notice: "修改已提交，等待审核" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.editEntry(42, "新正文");
    });
    expect(addToastMock).toHaveBeenCalledWith("修改已提交，等待审核", "success");
  });

  it("editEntry 4xx 失败展示后端原因且返回 null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "修改过于频繁" }, 400));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.editEntry(42, "新正文");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("修改过于频繁", "error");
  });

  describe("并发提交", () => {
    it("不同留言并发提交回复互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useGuestbookSubmit());

      const forEntryA = result.current.submitReply(1, "回复A");
      const forEntryB = result.current.submitReply(2, "回复B");
      resolvers.forEach((resolve, index) =>
        resolve(jsonResponse({ ...mockReply, id: index === 0 ? 10 : 11 })),
      );

      let resultA: unknown;
      let resultB: unknown;
      await act(async () => {
        resultA = await forEntryA;
        resultB = await forEntryB;
      });

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it("同一留言并发重复提交回复时第二次调用短路返回 null", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useGuestbookSubmit());

      const first = result.current.submitReply(1, "回复A", 0);
      const duplicate = result.current.submitReply(1, "回复A", 0);
      resolvers.forEach((resolve) => resolve(jsonResponse(mockReply)));

      let duplicateResult: unknown = "sentinel";
      await act(async () => {
        await first;
        duplicateResult = await duplicate;
      });

      expect(duplicateResult).toBeNull();
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
