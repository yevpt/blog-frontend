import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const authFile = resolve(dir, ".auth/admin.json");

const username = process.env.E2E_ADMIN_USERNAME ?? "admin";
const password = process.env.E2E_ADMIN_PASSWORD ?? "admin";

setup("admin 登录并保存 storageState", async ({ page }) => {
  await page.goto("/login");

  // LoginPage 的用户名/密码输入框（按类型与顺序定位）
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "登录" }).click();

  // 登录成功后离开 /login（accessToken 入内存、refresh_token 入 localStorage）
  await expect(page).not.toHaveURL(/\/login/);

  // storageState 会连同 localStorage 一并落盘（含 refresh_token）
  await page.context().storageState({ path: authFile });
});
