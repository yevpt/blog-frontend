// @vitest-environment jsdom
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../providers/theme-provider";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.cookie = "theme=; Max-Age=0; path=/";
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

  it("点击后在 light / dark 间切换 html class", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /点击切换到 dark/ }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: /点击切换到 light/ }));
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("showLabel 时显示当前主题文字标签", () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>,
    );

    expect(screen.getByText("浅色模式")).toBeInTheDocument();
  });

  it("默认不渲染文字标签（图标按钮形态）", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(screen.queryByText("浅色模式")).not.toBeInTheDocument();
  });
});
