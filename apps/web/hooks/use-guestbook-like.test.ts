// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookLike } from "./use-guestbook-like";
import type { GuestbookLikeResp, CommentLikeResp } from "@repo/api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("useGuestbookLike", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggleEntryLike 成功返回更新后的点赞状态", async () => {
    const mockResp: GuestbookLikeResp = { id: 1, is_liked: true, like_count: 5 };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockResp));

    const { result } = renderHook(() => useGuestbookLike());
    const out: { value: GuestbookLikeResp | null } = { value: null };
    await act(async () => {
      out.value = await result.current.toggleEntryLike(1);
    });
    expect(out.value?.is_liked).toBe(true);
    expect(out.value?.like_count).toBe(5);
    expect(fetch).toHaveBeenCalledWith("/api/guestbook/1/like", { method: "POST" });
  });

  it("toggleEntryLike 网络失败返回 null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500));
    const { result } = renderHook(() => useGuestbookLike());
    const out: { value: GuestbookLikeResp | null } = { value: null };
    await act(async () => {
      out.value = await result.current.toggleEntryLike(1);
    });
    expect(out.value).toBeNull();
  });

  it("toggleReplyLike 成功调用正确接口", async () => {
    const mockResp: CommentLikeResp = { is_liked: true, like_count: 2 };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockResp));

    const { result } = renderHook(() => useGuestbookLike());
    const out: { value: CommentLikeResp | null } = { value: null };
    await act(async () => {
      out.value = await result.current.toggleReplyLike(1, 10);
    });
    expect(out.value?.is_liked).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/guestbook/comments/1/replies/10/like", {
      method: "POST",
    });
  });

  it("toggleReplyLike 网络失败返回 null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500));
    const { result } = renderHook(() => useGuestbookLike());
    const out: { value: CommentLikeResp | null } = { value: null };
    await act(async () => {
      out.value = await result.current.toggleReplyLike(1, 10);
    });
    expect(out.value).toBeNull();
  });
});
