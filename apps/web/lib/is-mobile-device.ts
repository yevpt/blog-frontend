// 真实移动端判定：UA 含移动关键字 且 支持触摸。
// 仅凭响应式断点（innerWidth）无法区分「桌面端缩窄窗口」与「真机」，故用设备特征判定。
// 用于决定是否把播放用 <audio> 接入 Web Audio 图——移动端接入会被 iOS 在后台挂起，导致音频中断。

const MOBILE_UA_PATTERN = /Mobi|Android|iPhone/i;
let cached: boolean | undefined;

/**
 * 是否为真实移动端（手机）。UA 与触摸能力同时满足才认定为移动端：
 * - 排除桌面端缩窗（UA 不含移动关键字）；
 * - 排除纯触摸笔记本（UA 不含移动关键字）；
 * - iOS Chrome（WKWebView）UA 含 iPhone 且 maxTouchPoints>0，认定为移动端。
 * SSR 环境返回 false。结果在页面生命周期内缓存。
 */
export function isMobileDevice(): boolean {
  if (cached !== undefined) return cached;
  if (typeof navigator === "undefined") {
    cached = false;
    return cached;
  }
  cached = MOBILE_UA_PATTERN.test(navigator.userAgent) && (navigator.maxTouchPoints ?? 0) > 0;
  return cached;
}

/** 仅供测试重置缓存使用。 */
export function resetMobileDeviceCache(): void {
  cached = undefined;
}
