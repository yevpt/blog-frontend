import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserResp } from "@repo/api";
import { LoginView } from "./login-view";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("LoginView", () => {
  const mockSwitch = vi.fn();
  const mockSuccess = vi.fn();

  beforeEach(() => {
    mockSwitch.mockClear();
    mockSuccess.mockClear();
    mockFetch.mockClear();
  });

  it("渲染账号、密码输入框和继续按钮", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByPlaceholderText("账号 / 邮箱 / 手机号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();
  });

  it("密码输入框默认为 password 类型", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByPlaceholderText("密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    const input = screen.getByPlaceholderText("密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByLabelText("隐藏密码"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("点击注册标签调用 onSwitchToRegister", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.click(screen.getByRole("button", { name: /注册/ }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式登录分割线和 OAuthGrid", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByText("其他方式登录")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });

  it("identifier 为空时提交显示校验提示，不调用 fetch", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入账号 / 邮箱 / 手机号");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("password 为空时提交显示校验提示，不调用 fetch", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入密码");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("接口成功时调用 onSuccess 并传入 user", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "alice", nickname: "Alice" };
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: mockUser } }),
    });
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("接口返回业务错误时显示错误信息，不调用 onSuccess", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ code: 1001, message: "账号或密码错误" }),
    });
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("账号或密码错误"));
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('loading 期间按钮文字变为"登录中…"', async () => {
    const user = userEvent.setup();
    mockFetch.mockReturnValue(new Promise(() => {})); // 永不 resolve
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(await screen.findByText("登录中…")).toBeInTheDocument();
  });
});
