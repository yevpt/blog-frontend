import { describe, expect, it } from "vitest";
import { shouldUseDarkTheme, THEME_CRITICAL_CSS } from "./theme-init";

describe("shouldUseDarkTheme", () => {
  it("cookie 为 dark 时始终使用暗色", () => {
    expect(shouldUseDarkTheme("dark", false)).toBe(true);
    expect(shouldUseDarkTheme("dark", true)).toBe(true);
  });

  it("cookie 为 light 时始终使用亮色", () => {
    expect(shouldUseDarkTheme("light", false)).toBe(false);
    expect(shouldUseDarkTheme("light", true)).toBe(false);
  });

  it("未设置或 system 时跟随系统偏好", () => {
    expect(shouldUseDarkTheme(null, true)).toBe(true);
    expect(shouldUseDarkTheme(null, false)).toBe(false);
    expect(shouldUseDarkTheme("system", true)).toBe(true);
    expect(shouldUseDarkTheme("system", false)).toBe(false);
  });
});

describe("THEME_CRITICAL_CSS", () => {
  it("包含默认浅色背景和 color-scheme", () => {
    expect(THEME_CRITICAL_CSS).toContain("#f7f7f9");
    expect(THEME_CRITICAL_CSS).toContain("color-scheme:light");
  });

  it("包含 .dark 的深色背景", () => {
    expect(THEME_CRITICAL_CSS).toContain("html.dark");
    expect(THEME_CRITICAL_CSS).toContain("#0c0c0f");
    expect(THEME_CRITICAL_CSS).toContain("color-scheme:dark");
  });

  it("包含系统深色媒体查询（排除 .light 覆盖）", () => {
    expect(THEME_CRITICAL_CSS).toContain("prefers-color-scheme:dark");
    expect(THEME_CRITICAL_CSS).toContain(":not(.light)");
  });

  it("不包含任何 script 或 JS 代码", () => {
    expect(THEME_CRITICAL_CSS).not.toContain("document");
    expect(THEME_CRITICAL_CSS).not.toContain("localStorage");
    expect(THEME_CRITICAL_CSS).not.toContain("function");
  });
});
