import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

// 辅助组件：渲染当前 theme 状态供测试断言
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

describe("ThemeProvider", () => {
  beforeEach(() => {
    // 每个测试前清理 localStorage 和 dark class
    localStorage.clear();
    document.documentElement.classList.remove("dark");

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

  it("localStorage 无存储值时，默认 theme 为 system", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("localStorage 已存储 dark 时，挂载后 theme 恢复为 dark", async () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });
  });

  it("localStorage 已存储 light 时，挂载后 theme 恢复为 light", async () => {
    localStorage.setItem("theme", "light");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light");
    });
  });

  it("setTheme('dark') 后 theme 状态变为 dark，并写入 localStorage", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("setTheme('light') 后 theme 状态变为 light", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("theme 为 dark 时，document.documentElement 有 dark class", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("theme 为 light 时，document.documentElement 无 dark class", async () => {
    // 先设置 dark，再切回 light
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

  it("localStorage 为 dark 且系统为亮色时，挂载后仍保持 dark class", async () => {
    localStorage.setItem("theme", "dark");
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
    // mock 系统偏好为暗色
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

    // system 模式 + 系统暗色 → resolvedTheme 应为 dark
    await waitFor(() => {
      expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    });
  });
});
