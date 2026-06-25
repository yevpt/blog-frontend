import { buildPayload } from "./payload";
import { getSessionId } from "./session";
import { sendEvent } from "./transport";
import { createTracker, type Tracker, type TrackerDeps } from "./tracker";
import type { TrackerOptions } from "./types";

// 用真实浏览器全局组装 TrackerDeps。
function browserDeps(options: TrackerOptions): TrackerDeps {
  const endpoint = options.endpoint;
  const sessionTimeoutMs = options.sessionTimeoutMs;
  const tokenEndpoint = options.tokenEndpoint ?? "/api/analytics-token";
  return {
    now: () => Date.now(),
    send: (payload) => sendEvent(payload, endpoint),
    getSession: (now) => getSessionId(now, sessionTimeoutMs),
    buildPayload,
    setInterval: (cb, ms) => window.setInterval(cb, ms),
    clearInterval: (id) => window.clearInterval(id),
    // 同源取新 collect token；no-store 避免缓存短期 token，失败一律降级为 undefined（保留原 token）。
    fetchToken: () =>
      fetch(tokenEndpoint, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.token ?? undefined)
        .catch(() => undefined),
    isVisible: () => document.visibilityState === "visible",
    onVisibilityChange: (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    onPageHide: (cb) => {
      window.addEventListener("pagehide", cb);
      return () => window.removeEventListener("pagehide", cb);
    },
    onInteraction: (cb) => {
      // 任一交互即视为“有交互”，触发后无需保留监听；passive 避免阻塞滚动。
      const events = ["pointerdown", "mousemove", "scroll", "keydown", "touchstart"] as const;
      const handler = () => cb();
      const remove = () => {
        for (const type of events) window.removeEventListener(type, handler);
      };
      for (const type of events) {
        window.addEventListener(type, handler, { passive: true });
      }
      return remove;
    },
  };
}

// 创建绑定真实浏览器环境的 tracker。
export function createBrowserTracker(options: TrackerOptions = {}): Tracker {
  return createTracker(browserDeps(options), options);
}
