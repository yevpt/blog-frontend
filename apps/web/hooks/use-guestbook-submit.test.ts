// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookSubmit } from "./use-guestbook-submit";
import type { GuestbookItemResp, CommentReplyResp } from "@repo/api";

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
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始状态：非提交中，无错误", () => {
    const { result } = renderHook(() => useGuestbookSubmit());
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submitEntry 成功返回新条目", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockItem,
    } as Response);

    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hello!");
    });
    expect((returned as GuestbookItemResp | null)?.id).toBe(1);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submitEntry 401 时设置登录错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hi");
    });
    expect(returned).toBeNull();
    expect(result.current.error).toMatch(/登录/);
  });

  it("submitEntry 网络失败时设置错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(result.current.error).toBeTruthy();
  });

  it("submitReply 成功返回回复", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockReply,
    } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "Hi!");
    });
    expect((returned as CommentReplyResp | null)?.id).toBe(10);
  });

  it("submitReply 401 时设置登录错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "Hi");
    });
    expect(returned).toBeNull();
    expect(result.current.error).toMatch(/登录/);
  });

  it("clearError 清除错误状态", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(result.current.error).toBeTruthy();
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
