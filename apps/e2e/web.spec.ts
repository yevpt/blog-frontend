import { test, expect } from "@playwright/test";

const identifier = process.env.E2E_WEB_IDENTIFIER ?? "admin";
const password = process.env.E2E_WEB_PASSWORD ?? "admin";

test("web 用户可用账号密码登录并进入首页", async ({ page }) => {
  await page.goto("/login");

  // 登录页两个输入框按 placeholder 定位，避免依赖 DOM 结构
  await page.getByPlaceholder("用户名 / 邮箱").fill(identifier);
  await page.getByPlaceholder("密码").fill(password);

  // 页面导航栏也有「登录」按钮，故限定到表单内的提交按钮
  await page.locator("form").getByRole("button", { name: "登录" }).click();

  // 登录成功才会 router.push 离开 /login（失败停留在原页）
  await expect(page).not.toHaveURL(/\/login/);

  // 强制服务端用登录 cookie 重新渲染（规避客户端路由缓存的登录态竞态）
  await page.goto("/");
  // 正向断言登录态：导航栏切换为用户菜单，不再有「登录」按钮
  await expect(
    page.getByTestId("navbar-actions").getByRole("button", { name: "登录" }),
  ).toHaveCount(0);
});
