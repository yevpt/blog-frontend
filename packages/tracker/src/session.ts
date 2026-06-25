import type { TrackerOptions } from "./types";

const SESSION_ID_KEY = "blog_analytics_sid";
const LAST_ACTIVITY_KEY = "blog_analytics_last";
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// 生成随机 session id，优先用 crypto.randomUUID，降级到时间戳+随机串。
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 返回当前 session id：无记录或距上次活动超过 timeoutMs 时新建；每次调用刷新活动时间。
// SSR（无 sessionStorage）下返回空串。
export function getSessionId(
  now: number = Date.now(),
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
): string {
  if (typeof sessionStorage === "undefined") return "";

  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  const lastRaw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const last = lastRaw ? Number(lastRaw) : 0;

  let sid = existing ?? "";
  if (!sid || now - last > timeoutMs) {
    sid = newId();
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  return sid;
}

export const SESSION_TIMEOUT_MS = DEFAULT_SESSION_TIMEOUT_MS;
export type { TrackerOptions };
