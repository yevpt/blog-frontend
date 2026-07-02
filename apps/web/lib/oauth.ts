// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/** OAuth 全页跳转回跳后暂存结果的 sessionStorage 键 */
export const OAUTH_RESULT_KEY = "oauth_result";
/** 发起 OAuth 前记录的回跳地址 */
export const OAUTH_RETURN_URL_KEY = "oauth_return_url";
/** 发起 OAuth 前记录的滚动位置，回跳后恢复，避免整页跳转把阅读位置弹回顶部 */
export const OAUTH_RETURN_SCROLL_KEY = "oauth_return_scroll";
/**
 * popup 回调页与发起页之间的 BroadcastChannel 频道名，作为 postMessage 之外的
 * 第二条通道：只按同源广播，不依赖 window.opener 这类窗口间引用，即便 opener
 * 因为某些原因不可用也能送达。
 */
export const OAUTH_BROADCAST_CHANNEL = "oauth-result";

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

/** 记录当前页 URL 和滚动位置，供 OAuth 回调后硬跳转回来并恢复阅读位置 */
export function saveOAuthReturnUrl(): void {
  sessionStorage.setItem(OAUTH_RETURN_URL_KEY, window.location.href);
  sessionStorage.setItem(OAUTH_RETURN_SCROLL_KEY, String(window.scrollY));
}

/** 读取并清除回跳地址，缺省为首页 */
export function consumeOAuthReturnUrl(): string {
  const url = sessionStorage.getItem(OAUTH_RETURN_URL_KEY) ?? "/";
  sessionStorage.removeItem(OAUTH_RETURN_URL_KEY);
  return url;
}

/** 读取并清除回跳前记录的滚动位置，缺省为 0 */
export function consumeOAuthReturnScroll(): number {
  const raw = sessionStorage.getItem(OAUTH_RETURN_SCROLL_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_SCROLL_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
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
 * 通知靠 BroadcastChannel（见 OAUTH_BROADCAST_CHANNEL 的说明），postMessage 只作为
 * opener 恰好存活时的加速路径，不是必须依赖项——两条通道谁先到都行。
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

  let settled = false;

  function finish(msg: OAuthMessage) {
    if (settled) return;
    settled = true;
    onMessage(msg);
    cleanup();
  }

  function handleMessage(event: MessageEvent<unknown>) {
    if (event.origin !== window.location.origin) return;
    // 同源不代表就是我们的消息：React DevTools 等浏览器扩展的 content script
    // 会定期用 postMessage 向页面广播自己的握手消息（同源、任意时机），origin 校验
    // 拦不住这类消息。之前吃过亏——这类消息一旦被误当成结果，会通过 settled 标记
    // 提前占位、cleanup() 提前拆监听器，导致真正的 OAuth 消息到达时已经没人在听。
    // 所以必须再校验消息本身的结构，确认是我们自己定义的 OAuthMessage 才处理。
    if (!isOAuthMessage(event.data)) return;
    finish(event.data);
  }

  const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!isOAuthMessage(event.data)) return;
    finish(event.data);
  };

  function cleanup() {
    window.removeEventListener("message", handleMessage);
    channel.close();
  }

  window.addEventListener("message", handleMessage);
  return cleanup;
}

/** 校验 event.data 是否为我们自己发出的 OAuthMessage，过滤同源但无关的 postMessage（如浏览器扩展的握手消息） */
function isOAuthMessage(data: unknown): data is OAuthMessage {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  const type = (data as { type: unknown }).type;
  return type === "oauth_success" || type === "oauth_bind_success" || type === "oauth_error";
}
