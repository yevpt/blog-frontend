import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { NotificationPageResp } from "@repo/api";
import { useNotifications } from "./use-notifications";

const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }));

const setUnreadCount = vi.fn();
vi.mock("@/store/use-notification-store", () => ({
  useNotificationStore: Object.assign(
    (sel: (s: { setUnreadCount: typeof setUnreadCount }) => unknown) => sel({ setUnreadCount }),
    { getState: () => ({ unreadCount: 5 }) },
  ),
}));

function page(over: Partial<NotificationPageResp> = {}): NotificationPageResp {
  return {
    total: 1,
    page: 1,
    page_size: 20,
    list: [
      {
        id: 1,
        event_id: 1,
        type: "comment",
        title: "t",
        content_excerpt: "",
        is_read: false,
        created_at: "",
        source_type: "",
        source_id: 0,
        root_type: "article",
        root_id: 1,
      },
    ],
    ...over,
  };
}

describe("useNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("首屏加载列表（unread_only=false）", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(apiJson).toHaveBeenCalledWith(
      "/api/notifications?page=1&page_size=20&unread_only=false",
    );
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
    apiJson.mockResolvedValue(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => {
      result.current.setUnreadOnly(true);
    });
    await waitFor(() =>
      expect(apiJson).toHaveBeenLastCalledWith(
        "/api/notifications?page=1&page_size=20&unread_only=true",
      ),
    );
  });

  it("加载失败置 error", async () => {
    apiJson.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.error).toBe(true));
  });
});
