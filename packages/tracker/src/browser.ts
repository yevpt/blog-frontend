import { buildPayload } from "./payload";
import { getSessionId } from "./session";
import { sendEvent } from "./transport";
import { createTracker, type Tracker, type TrackerDeps } from "./tracker";
import type { TrackerOptions } from "./types";

// 用真实浏览器全局组装 TrackerDeps。
function browserDeps(options: TrackerOptions): TrackerDeps {
  const endpoint = options.endpoint;
  const sessionTimeoutMs = options.sessionTimeoutMs;
  return {
    now: () => Date.now(),
    send: (payload) => sendEvent(payload, endpoint),
    getSession: (now) => getSessionId(now, sessionTimeoutMs),
    buildPayload,
    setInterval: (cb, ms) => window.setInterval(cb, ms),
    clearInterval: (id) => window.clearInterval(id),
    isVisible: () => document.visibilityState === "visible",
    onVisibilityChange: (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    onPageHide: (cb) => {
      window.addEventListener("pagehide", cb);
      return () => window.removeEventListener("pagehide", cb);
    },
  };
}

// 创建绑定真实浏览器环境的 tracker。
export function createBrowserTracker(options: TrackerOptions = {}): Tracker {
  return createTracker(browserDeps(options), options);
}
