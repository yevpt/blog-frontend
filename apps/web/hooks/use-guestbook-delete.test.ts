// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGuestbookDelete } from "./use-guestbook-delete";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("useGuestbookDelete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("deleteItem 调用留言删除接口", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ id: 1 }));
    const { result } = renderHook(() => useGuestbookDelete());

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteItem(1);
    });

    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/guestbook/1", { method: "DELETE" });
  });

  it("deleteReply 调用留言回复删除接口", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ id: 2 }));
    const { result } = renderHook(() => useGuestbookDelete());

    await act(async () => {
      await result.current.deleteReply(2);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/guestbook/comment-replies/2", {
      method: "DELETE",
    });
  });

  it("删除失败时返回 false", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ error: "Forbidden" }, 403));
    const { result } = renderHook(() => useGuestbookDelete());

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteItem(1);
    });

    expect(ok).toBe(false);
  });
});
