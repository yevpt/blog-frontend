// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/**
 * Popup 窗口与父窗口之间的 postMessage 通信格式。
 * OAuth 回调页（popup）发送此消息，OAuthGrid（父窗口）监听。
 */
export interface OAuthMessage {
  type: "oauth_success" | "oauth_error";
  /** type=oauth_success 时存在 */
  user?: UserResp;
  /** type=oauth_error 时存在 */
  message?: string;
}
