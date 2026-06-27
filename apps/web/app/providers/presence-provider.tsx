"use client";

import {
  getSubscribedIds,
  onSubscriptionChange,
  type PresenceRecord,
  usePresenceStore,
} from "@repo/hooks";
import { useEffect, type ReactNode } from "react";
import type { BatchPresenceResp } from "@repo/api";

import { apiJson } from "@/lib/client-fetch";

/** 正常轮询周期，同时是失败 0 次时的退避基数。 */
const BACKOFF_BASE_MS = 60_000;
/** 退避封顶：连续失败 ≥3 次后恒定 300s。 */
const BACKOFF_CAP_MS = 5 * BACKOFF_BASE_MS;
/** 订阅集高频变化（如虚拟滚动）时的去抖窗口。 */
const SUBSCRIPTION_DEBOUNCE_MS = 200;

function debounce(fn: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

/**
 * 全局唯一的在线状态批次轮询；订阅集变化或标签页恢复可见时立即刷新一次。
 * 挂在 web 根 layout，与 SessionProvider / NotificationProvider 同层。
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failCount = 0;

    function schedule() {
      if (timer) clearTimeout(timer);
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** failCount, BACKOFF_CAP_MS);
      timer = setTimeout(() => void tick(), delay);
    }

    async function tick() {
      const ids = getSubscribedIds();
      if (ids.length === 0) return;
      try {
        const resp = await apiJson<BatchPresenceResp>(`/api/users/presence?ids=${ids.join(",")}`);
        const batch: Record<number, PresenceRecord> = {};
        for (const [key, value] of Object.entries(resp.data)) {
          batch[Number(key)] = {
            is_online: value.is_online,
            last_active_at: value.last_active_at,
            last_login_at: value.last_login_at,
          };
        }
        usePresenceStore.getState().apply(batch);
        failCount = 0;
      } catch {
        // 不弹提示、不清空 store；UI 继续显示旧值，仅进入退避。
        failCount += 1;
      }
      schedule();
    }

    function restart() {
      if (timer) clearTimeout(timer);
      failCount = 0;
      void tick();
    }

    const debouncedRestart = debounce(restart, SUBSCRIPTION_DEBOUNCE_MS);
    const unsubscribeSubscriptionChange = onSubscriptionChange(debouncedRestart);

    function handleVisibilityChange() {
      if (document.hidden) {
        // 隐藏：只停 timer，不清 failCount、不立即拉。
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        return;
      }
      restart();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    restart();

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribeSubscriptionChange();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
}
