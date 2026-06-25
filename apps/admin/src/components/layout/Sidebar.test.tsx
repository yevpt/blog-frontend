import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../providers/theme-provider";
import { useAuthStore } from "../../store/auth";
import { Sidebar } from "./Sidebar";

function renderSidebar(isCollapsed = false) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Sidebar isCollapsed={isCollapsed} onToggleCollapsed={vi.fn()} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "token",
      user: { id: 1, username: "admin", nickname: "叶后台", email: "admin@example.com" },
    });

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

  it("折叠态品牌文字保持在布局内渐隐，避免展开时突然掉入", () => {
    renderSidebar(true);

    expect(screen.getByText("YEVPT").parentElement).toHaveClass("overflow-hidden", "opacity-0");
    expect(screen.getByText("YEVPT").parentElement).not.toHaveClass("sr-only");
  });

  it("折叠态 logo 和展开按钮位于同一品牌栏内对齐", () => {
    renderSidebar(true);

    const expandButton = screen.getByRole("button", { name: "展开侧栏" });
    expect(expandButton.closest("[data-testid='sidebar-brand-bar']")).toBeInTheDocument();
    expect(expandButton.closest("[data-testid='sidebar-brand-bar']")).toHaveClass("justify-center");
    expect(screen.queryByTestId("sidebar-collapsed-toggle-row")).not.toBeInTheDocument();
  });

  it("底部主题按钮和用户按钮使用同一行高与左侧对齐", () => {
    renderSidebar(false);

    expect(screen.getByRole("button", { name: /当前生效主题/ })).toHaveClass("h-10", "px-2");
    expect(screen.getByRole("button", { name: "打开用户菜单" })).toHaveClass("h-10", "px-2");
  });
});
