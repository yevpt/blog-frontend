import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginView } from "./login-view";

describe("LoginView", () => {
  const mockSwitch = vi.fn();

  it("渲染账号、密码输入框和继续按钮", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByPlaceholderText("账号 / 邮箱 / 手机号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();
  });

  it("密码输入框默认为 password 类型", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByPlaceholderText("密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    const input = screen.getByPlaceholderText("密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByLabelText("隐藏密码"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("点击注册标签调用 onSwitchToRegister", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    await user.click(screen.getByRole("button", { name: /注册/ }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式登录分割线和 OAuthGrid", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByText("其他方式登录")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });
});
