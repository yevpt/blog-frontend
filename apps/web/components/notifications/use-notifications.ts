import { useCallback, useEffect, useState } from "react";
import type { NotificationItemResp, NotificationPageResp, NotificationReadResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";

interface UseNotificationsOptions {
  pageSize?: number;
}

export function useNotifications({ pageSize = 20 }: UseNotificationsOptions = {}) {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const [items, setItems] = useState<NotificationItemResp[]>([]);
  const [unreadOnly, setUnreadOnlyState] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean, unread: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const data = await apiJson<NotificationPageResp>(
          `/api/notifications?page=${nextPage}&page_size=${pageSize}&unread_only=${unread}`,
        );
        setTotal(data.total);
        setPage(data.page);
        setItems((cur) => (replace ? data.list : [...cur, ...data.list]));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    void fetchPage(1, true, unreadOnly);
  }, [fetchPage, unreadOnly]);

  const setUnreadOnly = useCallback((v: boolean) => setUnreadOnlyState(v), []);
  const reload = useCallback(() => fetchPage(1, true, unreadOnly), [fetchPage, unreadOnly]);
  const loadMore = useCallback(
    () => fetchPage(page + 1, false, unreadOnly),
    [fetchPage, page, unreadOnly],
  );

  // 本地把若干条置已读，并按实际由未读转已读的数量递减角标
  const applyRead = useCallback(
    (ids: Set<number>) => {
      setItems((cur) => {
        let freshlyRead = 0;
        const next = cur.map((it) => {
          if (ids.has(it.id) && !it.is_read) {
            freshlyRead += 1;
            return { ...it, is_read: true };
          }
          return it;
        });
        if (freshlyRead > 0) {
          setUnreadCount(useNotificationStore.getState().unreadCount - freshlyRead);
        }
        return next;
      });
    },
    [setUnreadCount],
  );

  const markRead = useCallback(
    async (id: number) => {
      await apiJson<NotificationReadResp>(`/api/notifications/${id}/read`, { method: "PATCH" });
      applyRead(new Set([id]));
    },
    [applyRead],
  );

  const markReadBatch = useCallback(
    async (ids: number[]) => {
      await apiJson<NotificationReadResp>("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      applyRead(new Set(ids));
    },
    [applyRead],
  );

  const markAllRead = useCallback(async () => {
    await apiJson<NotificationReadResp>("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((cur) => cur.map((it) => ({ ...it, is_read: true })));
    setUnreadCount(0);
  }, [setUnreadCount]);

  const remove = useCallback(
    async (id: number) => {
      await apiJson<NotificationReadResp>(`/api/notifications/${id}`, { method: "DELETE" });
      setItems((cur) => {
        const target = cur.find((it) => it.id === id);
        if (target && !target.is_read) {
          setUnreadCount(useNotificationStore.getState().unreadCount - 1);
        }
        return cur.filter((it) => it.id !== id);
      });
    },
    [setUnreadCount],
  );

  const hasMore = items.length < total;

  return {
    items,
    unreadOnly,
    setUnreadOnly,
    loading,
    error,
    hasMore,
    loadMore,
    reload,
    markRead,
    remove,
    markReadBatch,
    markAllRead,
  };
}
