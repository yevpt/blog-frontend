// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/**
 * Popup 窗口与父窗口之间的 postMessage 通信格式。
 * - OAuth 回调页（popup）在处理完 callback 后发送此消息
 * - 父窗口（OAuthGrid 登录 / SecurityTab 绑定）在 message 监听器中接收
 *
 * 安全提示：接收方须校验 event.origin === window.location.origin，
 * 防止其他来源的 postMessage 伪造结果。
 *
 * 使用判别联合（discriminated union）：TypeScript 会在 type 分支内
 * 自动收窄类型，无需手动断言字段是否存在。
 */
export type OAuthMessage =
  | { type: "oauth_success"; user: UserResp }
  | { type: "oauth_bind_success"; source: string }
  | { type: "oauth_error"; message: string };

/**
 * 打开 OAuth 授权 popup 并监听回调页回传的 postMessage。
 *
 * 登录与绑定共用同一套机制：popup 内完成授权 → 回调页 postMessage 给本窗口 → 本窗口处理结果。
 * 这样发起页（登录弹窗 / 个人详情页）始终保持在原地，且 redirect_uri 用裸回调地址，
 * 与各平台注册的回调精确一致（QQ/微博/百度 等严格校验，带额外 query 会被拒）。
 *
 * @returns 清理函数（移除监听器）；popup 被浏览器拦截时返回 null。
 */
export function openOAuthPopup(
  authorizeUrl: string,
  onMessage: (msg: OAuthMessage) => void,
): (() => void) | null {
  const w = 600;
  const h = 700;
  // 移动端浏览器会忽略 features，自动以新标签页（全屏）打开
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const features = isMobile
    ? ""
    : `width=${w},height=${h},left=${Math.round(
        window.screenLeft + (window.outerWidth - w) / 2,
      )},top=${Math.round(window.screenTop + (window.outerHeight - h) / 2)}`;

  const popup = window.open(authorizeUrl, "oauth_popup", features);
  if (!popup) return null;

  function handleMessage(event: MessageEvent<OAuthMessage>) {
    if (event.origin !== window.location.origin) return;
    onMessage(event.data);
    window.removeEventListener("message", handleMessage);
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}
