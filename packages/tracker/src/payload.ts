import type { AnalyticsEventType, CollectPayload } from "./types";

// 由运行环境（document/window）组装上报载荷；SSR 下相关字段降级为空串。
export function buildPayload(
  eventType: AnalyticsEventType,
  path: string,
  sessionId: string,
  opts: { collectToken?: string; hasInteracted?: boolean } = {},
): CollectPayload {
  const screen =
    typeof window !== "undefined" && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : "";
  const title = typeof document !== "undefined" ? document.title : "";
  const referer = typeof document !== "undefined" ? document.referrer : "";
  return {
    event_type: eventType,
    path,
    title,
    referer,
    session_id: sessionId,
    screen,
    collect_token: opts.collectToken,
    signals: {
      webdriver: typeof navigator !== "undefined" && navigator.webdriver === true,
      no_interaction: opts.hasInteracted === false,
    },
  };
}
