// 上报事件类型，与后端 dto.CollectRequest.EventType 取值一致。
export type AnalyticsEventType = "page_view" | "heartbeat";

// 无头/自动化信号，供后端识别爬虫与无交互访问；字段名与后端约定一致。
export interface CollectSignals {
  webdriver: boolean; // navigator.webdriver === true
  no_interaction: boolean; // 整个会话期间无任何用户交互
}

// 上报载荷，字段名与后端约定（snake_case）严格一致；不含 user_id。
export interface CollectPayload {
  event_type: AnalyticsEventType;
  path: string;
  title: string;
  referer: string;
  session_id: string;
  screen: string;
  collect_token?: string; // SSR 签发的短期 HMAC token；未配置 secret 时缺省
  signals?: CollectSignals;
}

// tracker 可选配置，全部有默认值。
export interface TrackerOptions {
  endpoint?: string; // BFF 上报地址，默认 "/api/collect"
  heartbeatMs?: number; // 心跳间隔，默认 15000
  sessionTimeoutMs?: number; // 会话失活阈值，默认 30 分钟
  collectToken?: string; // SSR 注入的 collect token，原样随每次上报回传
}
