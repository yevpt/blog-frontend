// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("web RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("渲染注册表单", () => {
    render(<RegisterPage />);
    expect(screen.getByPlaceholderText("邮箱")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册" })).toBeInTheDocument();
  });

  it("发送验证码业务错误时展示后端 message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 1001, message: "邮箱已被注册" }),
    } as Response);

    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("邮箱"), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "发验证码" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("邮箱已被注册");
    });
  });

  it("发送验证码网络异常时展示兜底文案", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("邮箱"), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "发验证码" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("发送失败，请稍后重试");
    });
  });

  it("注册业务错误时展示后端 message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 1002, message: "验证码错误" }),
    } as Response);

    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("验证码（6 位）"), "123456");
    await userEvent.type(screen.getByPlaceholderText("密码（至少 8 位）"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("验证码错误");
    });
  });

  it("注册网络异常时展示兜底文案", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("验证码（6 位）"), "123456");
    await userEvent.type(screen.getByPlaceholderText("密码（至少 8 位）"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("注册失败，请稍后重试");
    });
  });

  it("注册成功时跳转到 /login", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, message: "ok" }),
    } as Response);

    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("验证码（6 位）"), "123456");
    await userEvent.type(screen.getByPlaceholderText("密码（至少 8 位）"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
