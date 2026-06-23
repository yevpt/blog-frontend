"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  NotificationItemResp,
  NotificationPageResp,
  NotificationUnreadCountResp,
} from "@repo/api";
import { htmlExcerptToPlainText } from "@repo/markdown";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { apiJson } from "@/lib/client-fetch";
import { connectReconnectingEventSource } from "@/lib/reconnecting-event-source";
import { useNotificationStore } from "@/store/use-notification-store";
import { getNotificationHref } from "./notification-target";

const LATEST_UNREAD_PATH = "/api/notifications?unread_only=true&page=1&page_size=5";
const TOAST_TIMEOUT_MS = 6000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userId } = useSession();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const bumpListSync = useNotificationStore((state) => state.bumpListSync);
  const reset = useNotificationStore((state) => state.reset);
  const [popups, setPopups] = useState<NotificationItemResp[]>([]);
  const knownUnreadIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (userId == null) {
      knownUnreadIdsRef.current = new Set();
      setPopups([]);
      reset();
      return;
    }

    let cancelled = false;

    async function refreshUnreadCount() {
      const data = await apiJson<NotificationUnreadCountResp>("/api/notifications/unread-count");
      if (!cancelled) setUnreadCount(data.count);
    }

    async function loadLatestUnread() {
      const data = await apiJson<NotificationPageResp>(LATEST_UNREAD_PATH);
      return data.list.filter((item) => !item.is_read);
    }

    async function seedUnreadSnapshot() {
      try {
        const [, items] = await Promise.all([refreshUnreadCount(), loadLatestUnread()]);
        if (cancelled) return;
        knownUnreadIdsRef.current = new Set(items.map((item) => item.id));
      } catch {
        // 通知入口不阻塞页面主流程；下次 SSE 或刷新时会再同步。
      }
    }

    async function handleNotificationSignal() {
      try {
        const [, items] = await Promise.all([refreshUnreadCount(), loadLatestUnread()]);
        if (cancelled) return;

        const known = knownUnreadIdsRef.current;
        const freshItems = items.filter((item) => !known.has(item.id));
        knownUnreadIdsRef.current = new Set([...items.map((item) => item.id), ...known]);

        if (freshItems.length > 0) {
          setPopups((current) => [...freshItems, ...current].slice(0, 3));
        }
        bumpListSync();
      } catch {
        // SSE 只是变化信号，失败时保持当前徽标，避免打扰用户。
      }
    }

    knownUnreadIdsRef.current = new Set();
    void seedUnreadSnapshot();

    const disconnect = connectReconnectingEventSource({
      url: "/api/notifications/stream",
      eventTypes: ["notification"],
      handlers: {
        onOpen: () => {
          void seedUnreadSnapshot();
        },
        onMessage: () => {
          void handleNotificationSignal();
        },
      },
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [bumpListSync, reset, setUnreadCount, userId]);

  useEffect(() => {
    if (popups.length === 0) return;
    const timer = window.setTimeout(() => {
      setPopups((current) => current.slice(0, -1));
    }, TOAST_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [popups]);

  function openNotification(item: NotificationItemResp) {
    setPopups((current) => current.filter((candidate) => candidate.id !== item.id));
    router.push(getNotificationHref(item));
  }

  return (
    <>
      {children}
      <div className="fixed right-4 top-20 z-[9999] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {popups.map((item) => {
          const excerpt = item.content_excerpt ? htmlExcerptToPlainText(item.content_excerpt) : "";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openNotification(item)}
              className={cn(
                "rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xl transition-transform hover:-translate-y-0.5 hover:bg-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
              aria-label={`${item.title || "新消息"} ${excerpt}`}
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <SvgIcon name="bell" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-foreground">
                    {item.title || "你有一条新消息"}
                  </span>
                  {excerpt ? (
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
                      {excerpt}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
