/* global window */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NotificationItemResp,
  NotificationPageResp,
  NotificationReadResp,
  NotificationUnreadCountResp,
} from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";

interface UseNotificationsOptions {
  pageSize?: number;
}

export function useNotifications({ pageSize = 20 }: UseNotificationsOptions = {}) {
  const { userId } = useSession();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const listSyncVersion = useNotificationStore((s) => s.listSyncVersion);
  const handledListSyncVersionRef = useRef(listSyncVersion);
  const prevUserIdRef = useRef<number | null>(userId);
  const seenIdsRef = useRef(new Set<number>());
  const [items, setItems] = useState<NotificationItemResp[]>([]);
  const [enteringIds, setEnteringIds] = useState<Set<number>>(() => new Set());
  const [staggerAnimateIds, setStaggerAnimateIds] = useState<Set<number>>(() => new Set());
  const [unreadOnly, setUnreadOnlyState] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);

  const syncUnreadCount = useCallback(async () => {
    try {
      const data = await apiJson<NotificationUnreadCountResp>("/api/notifications/unread-count");
      setUnreadCount(data.count);
    } catch {
      // 未读数同步失败不打断列表展示；导航栏与 Tab 徽标下次拉取时会再试
    }
  }, [setUnreadCount]);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean, unread: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const data = await apiJson<NotificationPageResp>(
          `/api/notifications?page=${nextPage}&page_size=${pageSize}&unread_only=${unread}`,
        );
        setTotal(data.total);
        setPage(data.page);
        setItems((cur) => (replace ? data.list : [...cur, ...data.list]));
        if (replace) {
          void syncUnreadCount();
        }
      } catch {
        setError(true);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [pageSize, syncUnreadCount],
  );

  useEffect(() => {
    void fetchPage(1, true, unreadOnly);
  }, [fetchPage, unreadOnly]);

  // 切换登录用户后丢弃旧列表并重新拉取，避免消息中心仍展示上一账号数据
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;

    loadingRef.current = false;
    seenIdsRef.current = new Set();
    handledListSyncVersionRef.current = useNotificationStore.getState().listSyncVersion;
    setItems([]);
    setEnteringIds(new Set());
    setStaggerAnimateIds(new Set());
    setPage(1);
    setTotal(0);
    setError(false);

    if (userId == null) {
      setLoading(false);
      return;
    }

    void fetchPage(1, true, unreadOnly);
  }, [fetchPage, unreadOnly, userId]);

  const mergeFreshPage = useCallback(
    async (unread: boolean) => {
      try {
        const data = await apiJson<NotificationPageResp>(
          `/api/notifications?page=1&page_size=${pageSize}&unread_only=${unread}`,
        );
        setTotal(data.total);
        setPage(data.page);
        setItems((cur) => {
          const topIds = new Set(data.list.map((item) => item.id));
          const existingIds = new Set(cur.map((item) => item.id));
          const freshIds = data.list
            .filter((item) => !existingIds.has(item.id))
            .map((item) => item.id);
          if (freshIds.length > 0) {
            setEnteringIds(new Set(freshIds));
          }
          const rest = cur.filter((item) => !topIds.has(item.id));
          return [...data.list, ...rest];
        });
        void syncUnreadCount();
      } catch {
        // 实时同步失败不打断当前列表展示
      }
    },
    [pageSize, syncUnreadCount],
  );

  // SSE 推送后静默合并首页，把新消息插入列表顶部
  useEffect(() => {
    if (listSyncVersion === handledListSyncVersionRef.current) return;
    handledListSyncVersionRef.current = listSyncVersion;
    void mergeFreshPage(unreadOnly);
  }, [listSyncVersion, mergeFreshPage, unreadOnly]);

  // 实时入场动画结束后清理标记，避免后续重渲染重复播放
  useEffect(() => {
    if (enteringIds.size === 0) return;
    const timer = window.setTimeout(() => setEnteringIds(new Set()), 500);
    return () => window.clearTimeout(timer);
  }, [enteringIds]);

  // 仅对本次会话内首次出现的消息播放阶梯入场；Tab 切换回来不再重复
  useEffect(() => {
    const toAnimate = new Set<number>();
    for (const item of items) {
      if (seenIdsRef.current.has(item.id)) continue;
      seenIdsRef.current.add(item.id);
      if (!enteringIds.has(item.id)) {
        toAnimate.add(item.id);
      }
    }
    setStaggerAnimateIds(toAnimate);
    if (toAnimate.size === 0) return;
    const timer = window.setTimeout(() => setStaggerAnimateIds(new Set()), 500);
    return () => window.clearTimeout(timer);
  }, [items, enteringIds]);

  const setUnreadOnly = useCallback((v: boolean) => setUnreadOnlyState(v), []);
  const reload = useCallback(() => fetchPage(1, true, unreadOnly), [fetchPage, unreadOnly]);
  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (items.length >= total) return;
    void fetchPage(page + 1, false, unreadOnly);
  }, [fetchPage, items.length, page, total, unreadOnly]);

  // 本地把若干条置已读，并按实际由未读转已读的数量递减角标
  const applyRead = useCallback(
    (ids: Set<number>) => {
      let freshlyRead = 0;
      items.forEach((it) => {
        if (ids.has(it.id) && !it.is_read) freshlyRead += 1;
      });
      if (freshlyRead > 0) {
        setUnreadCount(useNotificationStore.getState().unreadCount - freshlyRead);
      }
      setItems((cur) => cur.map((it) => (ids.has(it.id) ? { ...it, is_read: true } : it)));
    },
    [items, setUnreadCount],
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

  const updateItemEngagement = useCallback(
    (
      id: number,
      patch: Partial<Pick<NotificationItemResp, "is_liked" | "like_count" | "reply_count">>,
    ) => {
      setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [],
  );

  const remove = useCallback(
    async (id: number) => {
      await apiJson<NotificationReadResp>(`/api/notifications/${id}`, { method: "DELETE" });
      const target = items.find((it) => it.id === id);
      if (target && !target.is_read) {
        setUnreadCount(useNotificationStore.getState().unreadCount - 1);
      }
      setItems((cur) => cur.filter((it) => it.id !== id));
    },
    [items, setUnreadCount],
  );

  const hasMore = items.length < total;

  return {
    items,
    enteringIds,
    staggerAnimateIds,
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
    updateItemEngagement,
  };
}
