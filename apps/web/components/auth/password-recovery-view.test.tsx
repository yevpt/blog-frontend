// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordRecoveryView } from "./password-recovery-view";

vi.mock("./password-recovery-form", () => ({
  PasswordRecoveryForm: ({
    email,
    onDone,
    emailReadOnly,
    emailLabel,
  }: {
    email: string;
    onDone: () => void;
    emailReadOnly?: boolean;
    emailLabel?: string;
  }) => (
    <div data-testid="recovery-form">
      <span data-testid="form-email">{email}</span>
      <span data-testid="form-readonly">{String(emailReadOnly)}</span>
      <span data-testid="form-label">{emailLabel}</span>
      <button type="button" onClick={onDone}>
        模拟重置成功
      </button>
    </div>
  ),
}));

describe("PasswordRecoveryView", () => {
  it("渲染标题与说明文案", () => {
    render(<PasswordRecoveryView onBack={() => {}} />);
    expect(screen.getByRole("heading", { name: "找回密码" })).toBeInTheDocument();
    expect(screen.getByText(/请输入账号绑定的已验证邮箱/)).toBeInTheDocument();
  });

  it("合法 initialEmail 预填到表单", () => {
    render(<PasswordRecoveryView initialEmail="user@example.com" onBack={() => {}} />);
    expect(screen.getByTestId("form-email")).toHaveTextContent("user@example.com");
  });

  it("非法 initialEmail 不预填", () => {
    render(<PasswordRecoveryView initialEmail="alice" onBack={() => {}} />);
    expect(screen.getByTestId("form-email")).toHaveTextContent("");
  });

  it("点击「登录」调用 onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<PasswordRecoveryView onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /登录/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("表单 onDone 回到登录视图", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<PasswordRecoveryView onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: "模拟重置成功" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("以可编辑邮箱模式渲染表单", () => {
    render(<PasswordRecoveryView onBack={() => {}} />);
    expect(screen.getByTestId("form-readonly")).toHaveTextContent("false");
    expect(screen.getByTestId("form-label")).toHaveTextContent("邮箱");
  });
});
