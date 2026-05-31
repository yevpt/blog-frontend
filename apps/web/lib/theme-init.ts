/** 根据 localStorage 与系统偏好判断首屏是否应使用暗色主题 */
export function shouldUseDarkTheme(stored: string | null, prefersDark: boolean): boolean {
  return stored === "dark" || (stored !== "light" && prefersDark);
}

/** 首屏关键样式：在外部 CSS 加载前避免 html 默认白底闪烁 */
export const THEME_CRITICAL_CSS =
  "html{background-color:hsl(0 0% 100%);color-scheme:light}html.dark{background-color:hsl(222.2 84% 4.9%);color-scheme:dark}";

/** 在 head 阻塞执行：先注入关键样式，再为 html 添加 dark class */
export const THEME_INIT_SCRIPT = `(function(){try{var s=document.createElement('style');s.textContent=${JSON.stringify(THEME_CRITICAL_CSS)};document.head.appendChild(s);var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;
