import { test, expect } from "@playwright/test";

test("admin 已登录态可加载文章模块（只读）", async ({ page }) => {
  // 直接进受保护路由；App 启动会用 refresh_token 续期 accessToken，AuthGuard 放行
  await page.goto("/articles");

  // 断言未被踢回登录页，且文章模块导航/标题可见
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText("文章").first()).toBeVisible();
});
