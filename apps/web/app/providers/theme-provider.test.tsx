// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeDisplay() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>set dark</button>
      <button onClick={() => setTheme("light")}>set light</button>
      <button onClick={() => setTheme("system")}>set system</button>
    </div>
  );
}

/** 在 jsdom 中清除指定 cookie */
function clearThemeCookie() {
  document.cookie = "theme=; Max-Age=0; path=/";
}

/** 在 jsdom 中设置指定 cookie */
function setThemeCookie(value: string) {
  document.cookie = `theme=${value}; path=/`;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    clearThemeCookie();
    document.documentElement.classList.remove("dark", "light");

    // mock matchMedia，默认返回 prefers-color-scheme: light
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

  it("渲染不崩溃，children 正常显示", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("cookie 无存储值时，默认 theme 为 system", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("cookie 已存储 dark 时，挂载后 theme 恢复为 dark", async () => {
    setThemeCookie("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });
  });

  it("cookie 已存储 light 时，挂载后 theme 恢复为 light", async () => {
    setThemeCookie("light");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light");
    });
  });

  it("setTheme('dark') 后 theme 状态变为 dark，并写入 6 小时 cookie", async () => {
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(cookieSetter).toHaveBeenLastCalledWith(
      expect.stringContaining("theme=dark; path=/; SameSite=Lax; Max-Age=21600"),
    );
  });

  it("setTheme('light') 后 theme 状态变为 light，并写入 6 小时 cookie", async () => {
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.cookie).toContain("theme=light");
    expect(cookieSetter).toHaveBeenLastCalledWith(
      expect.stringContaining("theme=light; path=/; SameSite=Lax; Max-Age=21600"),
    );
  });

  it("theme 为 dark 时，html 有 dark class，无 light class", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("theme 为 light 时，html 有 light class，无 dark class", async () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("theme 为 system 时，html 既无 dark 也无 light class（CSS 媒体查询接管）", async () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set system").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("theme 为 dark 时，resolvedTheme 为 dark", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });

  it("theme 为 light 时，resolvedTheme 为 light", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it("cookie 为 dark 且系统为亮色时，挂载后仍保持 dark class", async () => {
    setThemeCookie("dark");
    document.documentElement.classList.add("dark");

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    });
  });

  it("system 模式且系统为暗色时，resolvedTheme 为 dark", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    });
  });

  it("setTheme('system') 后清除 cookie，回到无用户覆盖的系统模式", async () => {
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    setThemeCookie("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set system").click();
    });

    expect(document.cookie).not.toContain("theme=");
    expect(cookieSetter).toHaveBeenLastCalledWith(
      expect.stringContaining("theme=; path=/; SameSite=Lax; Max-Age=0"),
    );
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

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    // 用户显式切到 light（写入 cookie）
    await act(async () => {
      screen.getByText("set light").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");

    // 系统主题切到 dark，触发 change：清空 cookie 回到 system，由媒体查询跟随
    await act(async () => {
      darkMatches = true;
      changeHandler?.();
    });

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
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

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    // 初始无 cookie，处于 system 模式且系统为亮色
    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");

    // 系统切到 dark：theme 仍是 system，但 resolvedTheme 必须更新
    await act(async () => {
      darkMatches = true;
      changeHandler?.();
    });

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });
});
