// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/**
 * Popup 窗口与父窗口之间的 postMessage 通信格式。
 * - OAuth 回调页（popup）在处理完 callback 后发送此消息
 * - OAuthGrid（父窗口）在 window.addEventListener("message", handler) 中接收
 *
 * 安全提示：接收方须校验 event.origin === window.location.origin，
 * 防止其他来源的 postMessage 伪造登录结果。
 *
 * 使用判别联合（discriminated union）：TypeScript 会在 type 分支内
 * 自动收窄类型，无需手动断言 user 或 message 是否存在。
 */
export type OAuthMessage =
  | { type: "oauth_success"; user: UserResp }
  | { type: "oauth_error"; message: string };

/**
 * 绑定流程暂存「回跳目标」的 sessionStorage 键。
 *
 * 为什么不把回跳目标拼进 redirect_uri：QQ/微博/百度 等平台要求 redirect_uri 与注册回调
 * 「精确一致」，多带 query（如 ?next=…）会被判为非法、导致授权被拒或 token 交换失败。
 * 绑定走整页跳转、同标签页同源，sessionStorage 在跳转往返中可靠保留，故用它承载回跳目标。
 */
export const OAUTH_BIND_REDIRECT_KEY = "oauth_bind_redirect";
