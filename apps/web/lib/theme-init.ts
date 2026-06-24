/** 根据 cookie/存储值与系统偏好判断首屏是否应使用暗色主题 */
export function shouldUseDarkTheme(stored: string | null, prefersDark: boolean): boolean {
  return stored === "dark" || (stored !== "light" && prefersDark);
}

/**
 * 首屏关键内联样式：在外部 CSS 加载前防止背景闪烁（FOUC）。
 * 覆盖三种状态，与 ThemeProvider 的 cookie 策略一一对应：
 *   html（无 class）= 无用户覆盖/过期 → 媒体查询决定
 *   html.dark       = cookie=dark，6 小时内强制深色
 *   html.light      = cookie=light，6 小时内强制浅色（覆盖媒体查询）
 *
 * 注意：深色背景值在此处重复出现（.dark 和 @media），这是防 FOUC 内联样式
 * 的必要代价，仅含 background-color 与 color-scheme 两个属性，不影响
 * base.css 中完整色板的单一来源原则。
 */
export const THEME_CRITICAL_CSS =
  "html{background-color:#f4f4f4;color-scheme:light}" +
  "html.dark{background-color:#0c0c0f;color-scheme:dark}" +
  "@media(prefers-color-scheme:dark){html:not(.light){background-color:#0c0c0f;color-scheme:dark}}";
