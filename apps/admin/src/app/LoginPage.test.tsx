// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { ApiError } from "@repo/api";
import { ThemeProvider } from "../providers/theme-provider";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "../lib/toast";

// mock 全局 apiClient，避免真实 HTTP 请求
vi.mock("../lib/api", () => ({
  apiClient: { adminAuth: { login: vi.fn() }, users: { getMe: vi.fn() } },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LoginPage />
        <ToastRegion queue={toastQueue} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.clearAllMocks();
    toastQueue.clear();
    localStorage.clear();
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

  it("渲染登录表单", () => {
    renderLoginPage();
    expect(screen.getByLabelText("YEVPT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "登录后台" })).toBeInTheDocument();
    expect(screen.getByText("使用管理员账号继续。")).toBeInTheDocument();
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin console")).not.toBeInTheDocument();
  });

  it("点击主题按钮后切换到深色主题", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: /点击切换到 dark/ }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.cookie).toContain("theme=dark");
    expect(screen.getByRole("button", { name: /点击切换到 light/ })).toBeInTheDocument();
  });

  it("点击密码显隐按钮后切换输入框类型", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText("输入密码");

    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "显示密码" }));

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "隐藏密码" })).toBeInTheDocument();
  });

  it("登录成功：更新 store 并写入 refresh_token", async () => {
    vi.mocked(apiClient.adminAuth.login).mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "vpt" },
    });
    vi.mocked(apiClient.users.getMe).mockResolvedValue({
      id: 1,
      username: "vpt",
      nickname: "VPT",
      avatar_url: "https://cdn.test/avatar.png",
      status: 1,
      roles: ["admin"],
    });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/用户名/), "vpt");
    await userEvent.type(screen.getByPlaceholderText("输入密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe("acc");
      expect(useAuthStore.getState().user?.avatar_url).toBe("https://cdn.test/avatar.png");
      expect(localStorage.getItem("refresh_token")).toBe("ref");
    });
    expect(apiClient.users.getMe).toHaveBeenCalled();
  });

  it("getMe 失败时回退到登录响应中的 user", async () => {
    vi.mocked(apiClient.adminAuth.login).mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "vpt", nickname: "备用名" },
    });
    vi.mocked(apiClient.users.getMe).mockRejectedValue(new Error("network"));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/用户名/), "vpt");
    await userEvent.type(screen.getByPlaceholderText("输入密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.nickname).toBe("备用名");
    });
  });

  it("登录失败：用 toast 展示错误消息", async () => {
    vi.mocked(apiClient.adminAuth.login).mockRejectedValue(new ApiError(401, "用户名或密码错误"));

    const { container } = renderLoginPage();
    await userEvent.type(screen.getByLabelText(/用户名/), "wrong");
    await userEvent.type(screen.getByPlaceholderText("输入密码"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("用户名或密码错误")).toBeInTheDocument();
    });
    expect(container.querySelector("form p[role='alert']")).not.toBeInTheDocument();
  });
});
