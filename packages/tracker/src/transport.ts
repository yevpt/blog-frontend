import type { CollectPayload } from "./types";

const DEFAULT_ENDPOINT = "/api/collect";

// 同源 BFF 上报。keepalive 保证卸载时仍能发出；best-effort，任何异常均吞掉。
export function sendEvent(payload: CollectPayload, endpoint: string = DEFAULT_ENDPOINT): void {
  if (typeof fetch === "undefined") return;
  try {
    void fetch(endpoint, {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // 统计为非关键路径，忽略网络错误
    });
  } catch {
    // 同步抛出（如 fetch 不可用）也忽略
  }
}
