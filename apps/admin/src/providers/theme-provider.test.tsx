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
});
