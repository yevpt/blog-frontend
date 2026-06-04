import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterView } from "./register-view";

describe("RegisterView", () => {
  const mockSwitch = vi.fn();

  beforeEach(() => {
    mockSwitch.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("渲染注册所有必填和可选字段", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByPlaceholderText("邮箱地址")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("验证码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("设置密码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("昵称（可选）")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("个人网站（可选）")).toBeInTheDocument();
    expect(screen.getByText("上传头像")).toBeInTheDocument();
  });

  it("密码字段默认为 password 类型", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByPlaceholderText("设置密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    const input = screen.getByPlaceholderText("设置密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
  });

  it("点击登录标签调用 onSwitchToLogin", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式注册分割线和 OAuthGrid", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByText("其他方式注册")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });

  it("渲染协议提示文字", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByText(/注册即表示同意/)).toBeInTheDocument();
  });

  it("上传头像后显示删除按钮，点击删除后恢复初始状态", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(fileInput, file);

    expect(screen.getByLabelText("删除头像")).toBeInTheDocument();
    expect(screen.getByText("更换头像")).toBeInTheDocument();

    await user.click(screen.getByLabelText("删除头像"));
    expect(screen.queryByLabelText("删除头像")).not.toBeInTheDocument();
    expect(screen.getByText("上传头像")).toBeInTheDocument();
  });
});
