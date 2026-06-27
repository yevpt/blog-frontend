import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";

function renderLayout() {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<h1>管理内容</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("移动端菜单按钮固定悬浮，不再占据顶部独立高度", () => {
    renderLayout();

    const menuButton = screen.getByRole("button", { name: "打开侧栏菜单" });
    expect(menuButton).toHaveClass("fixed", "right-4", "top-4", "z-40");
    expect(screen.queryByTestId("admin-mobile-topbar")).not.toBeInTheDocument();
  });

  it("移动端侧栏和遮罩都有平滑过渡", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "打开侧栏菜单" }));

    expect(screen.getByTestId("admin-sidebar-shell")).toHaveClass(
      "transition-[width,translate,opacity]",
      "duration-300",
      "ease-[cubic-bezier(0.16,1,0.3,1)]",
    );
    expect(screen.getByTestId("admin-mobile-scrim")).toHaveClass("animate-in", "fade-in");
  });

  it("移动端关闭侧栏时保留退出动画状态再卸载", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "打开侧栏菜单" }));
    await user.click(screen.getByRole("button", { name: "关闭侧栏菜单" }));

    expect(screen.getByTestId("admin-sidebar-shell")).toHaveClass("-translate-x-full");
    expect(screen.getByTestId("admin-sidebar-shell")).toHaveClass("opacity-0");
    expect(screen.getByTestId("admin-mobile-scrim")).toHaveClass("animate-out", "fade-out");
  });

  it("桌面折叠态使用紧凑侧边轨道与内容偏移", () => {
    localStorage.setItem("admin_sidebar_collapsed", "true");

    renderLayout();

    expect(screen.getByTestId("admin-sidebar-shell")).toHaveClass("lg:w-[56px]");
    expect(screen.getByTestId("admin-content-shell")).toHaveClass("lg:pl-[56px]");
  });

  it("侧栏容器使用动态视口高度，避免移动端底部被地址栏遮挡", () => {
    renderLayout();

    const shell = screen.getByTestId("admin-sidebar-shell");
    expect(shell).toHaveClass("h-dvh", "top-0");
    expect(shell).not.toHaveClass("inset-y-0");
  });

  it("折叠按钮内嵌在侧栏里，不再凸出侧栏边缘", () => {
    renderLayout();

    const collapseButton = screen.getByRole("button", { name: "折叠侧栏" });
    expect(collapseButton).not.toHaveClass("absolute");
    expect(collapseButton).not.toHaveClass("-right-3");
  });
});
