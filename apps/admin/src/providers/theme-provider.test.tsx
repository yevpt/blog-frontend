// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeProbe() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  );
}

function renderThemeProbe() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

function clearThemeCookie() {
  document.cookie = "theme=; Max-Age=0; path=/";
}

function setThemeCookie(value: string) {
  document.cookie = `theme=${value}; path=/`;
}

describe("admin ThemeProvider", () => {
  beforeEach(() => {
    clearThemeCookie();
    document.documentElement.classList.remove("dark", "light");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("无 cookie 时默认使用 system 模式", () => {
    renderThemeProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("cookie 为 dark 时恢复深色模式", async () => {
    setThemeCookie("dark");
    renderThemeProbe();

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });

  it("cookie 为 light 时恢复浅色模式", async () => {
    setThemeCookie("light");
    document.documentElement.classList.add("dark");
    renderThemeProbe();

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("切换到 dark / light 时同步 html class 和 cookie", async () => {
    renderThemeProbe();

    await act(async () => {
      screen.getByText("dark").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.cookie).toContain("theme=dark");

    await act(async () => {
      screen.getByText("light").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.cookie).toContain("theme=light");
  });

  it("切换到 system 时清除 cookie 并移除 html class", async () => {
    setThemeCookie("dark");
    document.documentElement.classList.add("dark");
    renderThemeProbe();

    await act(async () => {
      screen.getByText("system").click();
    });

    expect(document.cookie).not.toContain("theme=");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("用户显式选 light 后系统切到 dark：清空 cookie 回到 system 并跟随系统", async () => {
    let darkMatches = false;
    let changeHandler: (() => void) | null = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return query === "(prefers-color-scheme: dark)" && darkMatches;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === "change") changeHandler = cb;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderThemeProbe();

    await act(async () => {
      screen.getByRole("button", { name: "light" }).click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    // 系统主题切到 dark，触发 change：清空 cookie 回到 system，由媒体查询跟随
    await act(async () => {
      darkMatches = true;
      changeHandler?.();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.cookie).not.toContain("theme=");
  });

  it("已在 system 模式下系统切到 dark：resolvedTheme 实时更新（按钮同步）", async () => {
    let darkMatches = false;
    let changeHandler: (() => void) | null = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return query === "(prefers-color-scheme: dark)" && darkMatches;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === "change") changeHandler = cb;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderThemeProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");

    await act(async () => {
      darkMatches = true;
      changeHandler?.();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
  });
});
