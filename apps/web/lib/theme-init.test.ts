import { describe, expect, it } from "vitest";
import { shouldUseDarkTheme, THEME_CRITICAL_CSS, THEME_INIT_SCRIPT } from "./theme-init";

describe("shouldUseDarkTheme", () => {
  it("localStorage 为 dark 时始终使用暗色", () => {
    expect(shouldUseDarkTheme("dark", false)).toBe(true);
    expect(shouldUseDarkTheme("dark", true)).toBe(true);
  });

  it("localStorage 为 light 时始终使用亮色", () => {
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

describe("THEME_INIT_SCRIPT", () => {
  it("内联注入首屏关键样式并设置 dark class", () => {
    expect(THEME_INIT_SCRIPT).toContain("document.createElement('style')");
    expect(THEME_INIT_SCRIPT).toContain(THEME_CRITICAL_CSS);
    expect(THEME_INIT_SCRIPT).toContain("classList.add('dark')");
  });
});
