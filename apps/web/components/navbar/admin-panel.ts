/** 博客前台跳转管理后台的正式地址 */
export const ADMIN_PANEL_URL = "https://admin.yevpt.com";

/** 在新标签页打开管理后台 */
export function openAdminPanel(): void {
  window.open(ADMIN_PANEL_URL, "_blank", "noopener,noreferrer");
}
