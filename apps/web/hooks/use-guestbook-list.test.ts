// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookList } from "./use-guestbook-list";
import type { GuestbookItemResp, GuestbookPageResp } from "@repo/api";

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

const initialPage: GuestbookPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [mockItem],
};

const emptyPage: GuestbookPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

describe("useGuestbookList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("用 SSR 数据初始化", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetchPage 替换列表并更新分页状态", async () => {
    const page2: GuestbookPageResp = {
      total: 11,
      pages: 2,
      page: 2,
      page_size: 10,
      list: [{ ...mockItem, id: 2 }],
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => page2,
    } as Response);

    const { result } = renderHook(() => useGuestbookList(initialPage));
    await act(async () => {
      await result.current.fetchPage(2);
    });

    expect(result.current.items[0].id).toBe(2);
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(2);
  });

  it("fetchPage 网络失败时设置 error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const { result } = renderHook(() => useGuestbookList(emptyPage));
    await act(async () => {
      await result.current.fetchPage(1);
    });
    expect(result.current.error).toBeTruthy();
  });

  it("addItem 前插新条目并 total+1", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.addItem({ ...mockItem, id: 99 });
    });
    expect(result.current.items[0].id).toBe(99);
    expect(result.current.total).toBe(2);
  });

  it("incrementReplyCount 更新对应条目", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.incrementReplyCount(1);
    });
    expect(result.current.items[0].reply_count).toBe(1);
  });

  it("updateLike 更新对应条目的点赞状态", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.updateLike(1, true, 5);
    });
    expect(result.current.items[0].is_liked).toBe(true);
    expect(result.current.items[0].like_count).toBe(5);
  });
});
