// 上报事件类型，与后端 dto.CollectRequest.EventType 取值一致。
export type AnalyticsEventType = "page_view" | "heartbeat";

// 上报载荷，字段名与后端约定（snake_case）严格一致；不含 user_id。
export interface CollectPayload {
  event_type: AnalyticsEventType;
  path: string;
  title: string;
  referer: string;
  session_id: string;
  screen: string;
}

// tracker 可选配置，全部有默认值。
export interface TrackerOptions {
  endpoint?: string; // BFF 上报地址，默认 "/api/collect"
  heartbeatMs?: number; // 心跳间隔，默认 15000
  sessionTimeoutMs?: number; // 会话失活阈值，默认 30 分钟
}
