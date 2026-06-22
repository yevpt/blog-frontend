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

const mockItem: GuestbookItemResp = {
  id: 1,
  owner_user_id: 0,
  from_user_id: 1,
  content: "Hello!",
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
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

  it("submitEntry 成功返回新条目", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockItem));

    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hello!");
    });
    expect((returned as GuestbookItemResp | null)?.id).toBe(1);
    expect(result.current.isSubmitting).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
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

  it("submitEntry 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "内容长度不能超过 2000 个字符" }, 400),
    );
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("超长内容");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("内容长度不能超过 2000 个字符", "error");
  });

  it("submitEntry 网络异常时 toast 展示兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(addToastMock).toHaveBeenCalledWith("发布失败，请稍后重试", "error");
  });

  it("submitReply 成功返回回复", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockReply));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "Hi!");
    });
    expect((returned as CommentReplyResp | null)?.id).toBe(10);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("submitReply 401 时返回 null 并 toast 提示登录", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401));
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "Hi");
    });
    expect(returned).toBeNull();
    expect(addToastMock).toHaveBeenCalledWith("请先登录", "error");
  });

  it("submitReply 业务错误时 toast 展示后端返回的具体原因", async () => {
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

  it("submitReply 网络异常时 toast 展示兜底文案", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitReply(1, "Hi");
    });
    expect(addToastMock).toHaveBeenCalledWith("回复失败，请稍后重试", "error");
  });
});
