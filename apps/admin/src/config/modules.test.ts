import { describe, expect, it } from "vitest";
import { adminNavItems, adminRoutes, getNavItemByPath } from "./modules";

describe("admin 模块注册表", () => {
  it("nav 项仅来自带 nav 的模块，路径与顺序符合预期", () => {
    expect(adminNavItems.map((item) => item.path)).toEqual([
      "/",
      "/articles",
      "/categories",
      "/tags",
      "/music",
      "/links",
      "/analytics",
    ]);
  });

  it("路由表展开了全部模块路由（含文章子路由）", () => {
    const paths = adminRoutes.map((route) => (route.index ? "index" : route.path));
    expect(paths).toEqual([
      "index",
      "/articles",
      "/articles/new",
      "/articles/pinned",
      "/articles/:articleId/edit",
      "/categories",
      "/tags",
      "/music",
      "/links",
      "/analytics",
    ]);
  });

  it("每个 nav 路径都有对应路由", () => {
    const routePaths = new Set(adminRoutes.map((r) => r.path));
    for (const item of adminNavItems) {
      if (item.path === "/") continue; // 概览是 index 路由
      expect(routePaths.has(item.path)).toBe(true);
    }
  });

  it("getNavItemByPath 命中返回对应项，未命中回退到首项", () => {
    expect(getNavItemByPath("/articles").label).toBe("文章");
    expect(getNavItemByPath("/not-exist")).toBe(adminNavItems[0]);
  });

  it("路由唯一：无重复 path 且至多一个 index 路由（兜住 React key 策略）", () => {
    const paths = adminRoutes.filter((route) => !route.index).map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(adminRoutes.filter((route) => route.index).length).toBe(1);
  });
});
