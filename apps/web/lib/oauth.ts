// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/** OAuth 全页跳转回跳后暂存结果的 sessionStorage 键；popup 兜底通道复用同一 key（见 openOAuthPopup） */
export const OAUTH_RESULT_KEY = "oauth_result";
/** 发起 OAuth 前记录的回跳地址 */
export const OAUTH_RETURN_URL_KEY = "oauth_return_url";
/**
 * popup 的 window.name，用于回调页在 window.opener 被切断后仍能识别"自己是 popup"。
 * window.name 在跨域导航中不受 Cross-Origin-Opener-Policy 影响，比 window.opener 更可靠。
 */
export const OAUTH_POPUP_WINDOW_NAME = "oauth_popup";

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

/** 移动端 OAuth 使用全页跳转而非 popup（跨域授权后 opener 常被置空） */
export function isMobileOAuthContext(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
}

export function getOAuthUserDisplayName(user?: UserResp | null): string {
  return user?.nickname ?? user?.username ?? "用户";
}

/** 记录当前页 URL，供 OAuth 回调后硬跳转回来 */
export function saveOAuthReturnUrl(): void {
  sessionStorage.setItem(OAUTH_RETURN_URL_KEY, window.location.href);
}

/** 读取并清除回跳地址，缺省为首页 */
export function consumeOAuthReturnUrl(): string {
  const url = sessionStorage.getItem(OAUTH_RETURN_URL_KEY) ?? "/";
  sessionStorage.removeItem(OAUTH_RETURN_URL_KEY);
  return url;
}

export function peekOAuthResult(): OAuthMessage | null {
  const raw = sessionStorage.getItem(OAUTH_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthMessage;
  } catch {
    return null;
  }
}

/** 读取并清除 OAuth 回调结果（全页跳转场景） */
export function consumeOAuthResult(): OAuthMessage | null {
  const result = peekOAuthResult();
  if (result) sessionStorage.removeItem(OAUTH_RESULT_KEY);
  return result;
}

/** 移动端 / 无 opener 场景：整页跳转到授权地址 */
export function startOAuthRedirect(authorizeUrl: string): void {
  saveOAuthReturnUrl();
  window.location.assign(authorizeUrl);
}

/**
 * 打开 OAuth 授权 popup 并监听回调页回传的结果。
 *
 * 登录与绑定共用同一套机制：popup 内完成授权 → 回调页通知本窗口 → 本窗口处理结果。
 * 这样发起页（登录弹窗 / 个人详情页）始终保持在原地，且 redirect_uri 用裸回调地址，
 * 与各平台注册的回调精确一致（QQ/微博/百度 等严格校验，带额外 query 会被拒）。
 *
 * 通知通道有两条：
 * - postMessage（主路径）：回调页通过 window.opener 直接发消息。
 * - storage 事件（兜底）：部分 OAuth 提供方的授权页会设置 Cross-Origin-Opener-Policy，
 *   导致浏览器切断 popup 的 window.opener 引用，postMessage 无法送达；此时回调页改为
 *   写 localStorage，本窗口通过 storage 事件收到通知（该事件不依赖 opener 引用）。
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

  const popup = window.open(authorizeUrl, OAUTH_POPUP_WINDOW_NAME, features);
  if (!popup) return null;

  function finish(msg: OAuthMessage) {
    onMessage(msg);
    cleanup();
  }

  function handleMessage(event: MessageEvent<OAuthMessage>) {
    if (event.origin !== window.location.origin) return;
    finish(event.data);
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== OAUTH_RESULT_KEY || !event.newValue) return;
    localStorage.removeItem(OAUTH_RESULT_KEY);
    try {
      finish(JSON.parse(event.newValue) as OAuthMessage);
    } catch {
      // 忽略无法解析的脏数据
    }
  }

  function cleanup() {
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("storage", handleStorage);
  }

  window.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  return cleanup;
}
