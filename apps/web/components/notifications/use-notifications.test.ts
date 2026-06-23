import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { NotificationItemResp, NotificationPageResp } from "@repo/api";
import { useNotificationStore } from "@/store/use-notification-store";
import { useNotifications } from "./use-notifications";

const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }));

const sessionUserId = vi.hoisted(() => ({ current: 1 as number | null }));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: sessionUserId.current, profile: null }),
}));

function item(id: number, over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return {
    id,
    event_id: id,
    type: "comment",
    title: `t${id}`,
    content_excerpt: "",
    is_read: false,
    created_at: "",
    source_type: "",
    source_id: 0,
    root_type: "article",
    root_id: 1,
    source_deleted: false,
    root_deleted: false,
    ...over,
  };
}

function page(over: Partial<NotificationPageResp> = {}): NotificationPageResp {
  return {
    total: 1,
    page: 1,
    page_size: 20,
    list: [item(1)],
    ...over,
  };
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionUserId.current = 1;
    useNotificationStore.getState().reset();
  });

  it("首屏加载前列表处于 loading 状态", () => {
    apiJson.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toHaveLength(0);
  });

  it("首屏加载列表（unread_only=false）", async () => {
    apiJson.mockResolvedValueOnce(page()).mockResolvedValueOnce({ count: 3 });
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/notifications?page=1&page_size=20&unread_only=false",
    );
    await waitFor(() => expect(useNotificationStore.getState().unreadCount).toBe(3));
    expect(useNotificationStore.getState().hasLoaded).toBe(true);
  });

  it("markRead 调 PATCH 并把该条置已读", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    apiJson.mockResolvedValueOnce({ updated: 1 });
    await act(async () => {
      await result.current.markRead(1);
    });
    expect(apiJson).toHaveBeenLastCalledWith("/api/notifications/1/read", { method: "PATCH" });
    expect(result.current.items[0].is_read).toBe(true);
  });

  it("remove 调 DELETE 并从列表移除", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    apiJson.mockResolvedValueOnce({ updated: 1 });
    await act(async () => {
      await result.current.remove(1);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("切换 unreadOnly 重新拉取 unread_only=true", async () => {
    apiJson
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(page({ list: [item(2)], total: 1 }))
      .mockResolvedValueOnce({ count: 2 });
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => {
      result.current.setUnreadOnly(true);
    });
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith(
        "/api/notifications?page=1&page_size=20&unread_only=true",
      ),
    );
    await waitFor(() => expect(useNotificationStore.getState().unreadCount).toBe(2));
  });

  it("加载失败置 error", async () => {
    apiJson.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.error).toBe(true));
  });

  it("切换筛选后已展示过的消息不再触发阶梯入场动画", async () => {
    apiJson
      .mockResolvedValueOnce(
        page({ list: [item(1, { is_read: true }), item(2)], total: 2, page_size: 20 }),
      )
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(page({ list: [item(2)], total: 1, page_size: 20 }))
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(
        page({ list: [item(1, { is_read: true }), item(2)], total: 2, page_size: 20 }),
      )
      .mockResolvedValueOnce({ count: 1 });

    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.staggerAnimateIds.has(1)).toBe(true);
    expect(result.current.staggerAnimateIds.has(2)).toBe(true);

    await act(async () => {
      result.current.setUnreadOnly(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.staggerAnimateIds.has(2)).toBe(false);

    await act(async () => {
      result.current.setUnreadOnly(false);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.staggerAnimateIds.has(1)).toBe(false);
  });

  it("切换登录用户后清空旧列表并重新拉取", async () => {
    apiJson
      .mockResolvedValueOnce(page({ list: [item(1)], total: 1 }))
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(page({ list: [item(99, { title: "用户二" })], total: 1 }))
      .mockResolvedValueOnce({ count: 1 });

    const { result, rerender } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe(1);

    sessionUserId.current = 2;
    rerender();

    await waitFor(() => expect(result.current.items[0]?.id).toBe(99));
    expect(apiJson).toHaveBeenCalledWith(
      "/api/notifications?page=1&page_size=20&unread_only=false",
    );
  });

  it("SSE 同步信号后静默合并首页并把新消息插入列表顶部", async () => {
    apiJson
      .mockResolvedValueOnce(page({ list: [item(1)], total: 1 }))
      .mockResolvedValueOnce({ count: 1 });
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    apiJson
      .mockResolvedValueOnce(page({ list: [item(2, { title: "新消息" }), item(1)], total: 2 }))
      .mockResolvedValueOnce({ count: 2 });
    act(() => {
      useNotificationStore.getState().bumpListSync();
    });

    await waitFor(() => expect(result.current.items.map((it) => it.id)).toEqual([2, 1]));
    expect(result.current.enteringIds.has(2)).toBe(true);
    expect(result.current.staggerAnimateIds.has(2)).toBe(false);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/notifications?page=1&page_size=20&unread_only=false",
    );
    await waitFor(() => expect(useNotificationStore.getState().unreadCount).toBe(2));
  });
});
