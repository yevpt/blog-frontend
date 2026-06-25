import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SidebarUser } from "./SidebarUser";
import { useAuthStore } from "../../store/auth";

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}

describe("SidebarUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      accessToken: "token",
      user: { id: 1, username: "admin", nickname: "叶后台", email: "admin@example.com" },
    });
  });

  it("渲染当前用户信息", () => {
    render(
      <MemoryRouter>
        <SidebarUser isCollapsed={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("叶后台")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("用户菜单只保留退出登录，不再显示个人设置", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SidebarUser isCollapsed={false} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "打开用户菜单" }));

    expect(await screen.findByText("退出登录")).toBeInTheDocument();
    expect(screen.queryByText("个人设置")).not.toBeInTheDocument();
  });

  it("点击退出登录后清理状态并跳转登录页", async () => {
    localStorage.setItem("refresh_token", "refresh");
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <SidebarUser isCollapsed={false} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "打开用户菜单" }));
    await user.click(await screen.findByText("退出登录"));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    });
  });
});
