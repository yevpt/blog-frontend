import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("web LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("渲染登录表单", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("用户名 / 邮箱")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("登录失败：展示错误消息", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 401, message: "用户名或密码错误" }),
    } as Response);

    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText("用户名 / 邮箱"), "wrong");
    await userEvent.type(screen.getByPlaceholderText("密码"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("用户名或密码错误");
    });
  });

  it("网络异常：展示兜底错误消息", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText("用户名 / 邮箱"), "vpt");
    await userEvent.type(screen.getByPlaceholderText("密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("网络错误，请稍后重试");
    });
  });

  it("登录成功：调用 router.refresh() 并跳转", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          message: "ok",
          data: { user: { id: 1, username: "vpt" } },
        }),
    } as Response);

    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText("用户名 / 邮箱"), "vpt");
    await userEvent.type(screen.getByPlaceholderText("密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
