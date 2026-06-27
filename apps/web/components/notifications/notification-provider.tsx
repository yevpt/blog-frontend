"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  NotificationItemResp,
  NotificationPageResp,
  NotificationUnreadCountResp,
} from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ToastQueue, ToastRegion } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSession } from "@/app/providers/session-provider";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";
import { getNotificationHref } from "./notification-target";
import {
  getNotificationActionText,
  getNotificationActorName,
  getNotificationQuote,
} from "./notification-type";

const LATEST_UNREAD_PATH = "/api/notifications?unread_only=true&page=1&page_size=5";
const POLL_INTERVAL_MS = 8000;
const MAX_POLL_RETRY_DELAY_MS = 60_000;
const TOAST_TIMEOUT_MS = 6000;

/** 实时消息通知弹窗用的 toast 队列；导出供测试在 beforeEach 里 clear()。 */
export const notificationToastQueue = new ToastQueue<NotificationItemResp>({
  maxVisibleToasts: 3,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userId } = useSession();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const bumpListSync = useNotificationStore((state) => state.bumpListSync);
  const reset = useNotificationStore((state) => state.reset);
  const knownUnreadIdsRef = useRef<Set<number>>(new Set());
  const lastUnreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId == null) {
      knownUnreadIdsRef.current = new Set();
      lastUnreadCountRef.current = null;
      notificationToastQueue.clear();
      reset();
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let retryDelay = POLL_INTERVAL_MS;

    function isPageVisible() {
      return typeof document === "undefined" || document.visibilityState !== "hidden";
    }

    function clearPollTimer() {
      if (pollTimer === undefined) return;
      window.clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    function schedulePoll(delay = POLL_INTERVAL_MS) {
      if (cancelled || !isPageVisible()) return;
      clearPollTimer();
      pollTimer = window.setTimeout(() => {
        pollTimer = undefined;
        void runPoll();
      }, delay);
    }

    async function fetchUnreadCount() {
      const data = await apiJson<NotificationUnreadCountResp>("/api/notifications/unread-count");
      if (!cancelled) setUnreadCount(data.count);
      return data.count;
    }

    async function loadLatestUnread() {
      const data = await apiJson<NotificationPageResp>(LATEST_UNREAD_PATH);
      return data.list.filter((item) => !item.is_read);
    }

    async function seedUnreadSnapshot() {
      try {
        const [count, items] = await Promise.all([fetchUnreadCount(), loadLatestUnread()]);
        if (cancelled) return;
        lastUnreadCountRef.current = count;
        knownUnreadIdsRef.current = new Set(items.map((item) => item.id));
        retryDelay = POLL_INTERVAL_MS;
      } catch {
        // 通知入口不阻塞页面主流程；下次轮询或刷新时会再同步。
        retryDelay = Math.min(retryDelay * 2, MAX_POLL_RETRY_DELAY_MS);
      }
    }

    async function syncLatestUnread(forceLatest = false) {
      try {
        const previousCount = lastUnreadCountRef.current;
        const count = await fetchUnreadCount();
        if (cancelled) return;

        lastUnreadCountRef.current = count;
        if (!forceLatest && previousCount !== null && count === previousCount) {
          retryDelay = POLL_INTERVAL_MS;
          return;
        }

        const items = await loadLatestUnread();
        if (cancelled) return;

        const known = knownUnreadIdsRef.current;
        const freshItems = items.filter((item) => !known.has(item.id));
        knownUnreadIdsRef.current = new Set([...items.map((item) => item.id), ...known]);

        freshItems.forEach((item) =>
          notificationToastQueue.add(item, { timeout: TOAST_TIMEOUT_MS }),
        );
        bumpListSync();
        retryDelay = POLL_INTERVAL_MS;
      } catch {
        // 轮询失败时保持当前徽标，退避后重试，避免打扰用户。
        retryDelay = Math.min(retryDelay * 2, MAX_POLL_RETRY_DELAY_MS);
      }
    }

    async function runPoll(forceLatest = false) {
      if (!isPageVisible()) return;
      await syncLatestUnread(forceLatest);
      schedulePoll(retryDelay);
    }

    function handleVisibilityChange() {
      if (!isPageVisible()) {
        clearPollTimer();
        return;
      }
      retryDelay = POLL_INTERVAL_MS;
      void runPoll(true);
    }

    function handleOnline() {
      retryDelay = POLL_INTERVAL_MS;
      void runPoll(true);
    }

    knownUnreadIdsRef.current = new Set();
    lastUnreadCountRef.current = null;
    void seedUnreadSnapshot().finally(() => schedulePoll(POLL_INTERVAL_MS));

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      clearPollTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [bumpListSync, reset, setUnreadCount, userId]);

  return (
    <>
      {children}
      <ToastRegion
        queue={notificationToastQueue}
        position="top-right"
        className="top-20"
        itemClassName="w-[340px] max-w-[calc(100vw-2rem)] items-start"
        renderToast={(toast, { close }) => {
          const item = toast.content;
          const actorName = getNotificationActorName(item);
          const actionText = getNotificationActionText(item);
          const quote = getNotificationQuote(item);
          return (
            <>
              <UserAvatar
                src={item.actor_user?.avatar_url}
                userId={item.actor_user?.id}
                name={actorName}
                size="md"
                className="mt-0.5"
              />
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer text-left"
                onClick={() => {
                  close();
                  router.push(getNotificationHref(item));
                }}
              >
                <span role="alert" aria-atomic="true" className="block">
                  <p className="truncate text-[13px] text-foreground">
                    <span className="font-semibold">{actorName}</span>{" "}
                    <span className="text-muted-foreground">{actionText}</span>
                  </p>
                  {quote?.text ? (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {quote.title ? `${quote.title} ` : ""}
                      {quote.text}
                    </p>
                  ) : null}
                </span>
              </button>
              <Button
                type="button"
                variant={null}
                size={null}
                aria-label="关闭通知"
                onPress={close}
                className="flex size-7 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <SvgIcon name="close" size={12} />
              </Button>
            </>
          );
        }}
      />
    </>
  );
}
