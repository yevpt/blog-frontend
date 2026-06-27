// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { PasswordSheet } from "./password-sheet";

// 取数纠偏：组件用 @/lib/client-fetch 的 apiJson 打改密/设初始/找回接口，故 mock apiJson。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

const openCaptcha = vi.fn();
vi.mock("@/hooks/use-captcha-token", () => ({
  useCaptchaToken: () => {
    return {
      captchaOpen: false,
      captchaChallenge: null,
      captchaX: 0,
      captchaLoading: false,
      setCaptchaX: vi.fn(),
      setCaptchaOpen: vi.fn(),
      openCaptcha,
      handleVerify: vi.fn(),
      closeCaptcha: vi.fn(),
    };
  },
}));

vi.mock("@/components/auth/register-captcha", () => ({
  RegisterCaptcha: () => null,
}));

vi.mock("@/components/auth/password-recovery-form", () => ({
  PasswordRecoveryForm: () => <button type="button">重置密码</button>,
}));

beforeEach(() => {
  apiJson.mockReset();
  apiJson.mockResolvedValue(undefined);
  openCaptcha.mockReset();
});

describe("PasswordSheet", () => {
  it("已设密码：默认显示修改表单并可提交 PATCH password { old_password, new_password }", async () => {
    const user = userEvent.setup({ delay: null });
    const onSuccess = vi.fn();
    render(
      <PasswordSheet
        open
        passwordSet
        mainEmail="a@b.com"
        mainEmailVerified
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前密码"), { target: { value: "Old12345" } });
    fireEvent.change(screen.getByLabelText(/新密码（/), { target: { value: "New12345" } });
    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "New12345" } });

    const submit = screen.getByRole("button", { name: "确认修改" });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ old_password: "Old12345", new_password: "New12345" }),
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("两次新密码不一致时禁用确认修改", async () => {
    const user = userEvent.setup();
    render(
      <PasswordSheet
        open
        passwordSet
        mainEmail="a@b.com"
        mainEmailVerified
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("当前密码"), "Old12345");
    await user.type(screen.getByLabelText(/新密码（/), "New12345");
    await user.type(screen.getByLabelText("确认新密码"), "Mismatch1");

    expect(screen.getByRole("button", { name: "确认修改" })).toBeDisabled();
  });

  it("点忘记原密码切到含「重置密码」按钮的找回视图", async () => {
    const user = userEvent.setup();
    render(
      <PasswordSheet
        open
        passwordSet
        mainEmail="a@b.com"
        mainEmailVerified
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await user.click(screen.getByText(/忘记原密码/));
    expect(screen.getByRole("button", { name: "重置密码" })).toBeInTheDocument();
  });

  it("未设密码：显示设置初始密码（含验证码字段）并可提交 PATCH password/initial", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <PasswordSheet
        open
        passwordSet={false}
        mainEmail="a@b.com"
        mainEmailVerified
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByLabelText("邮箱验证码")).toBeInTheDocument();
    await user.type(screen.getByLabelText("邮箱验证码"), "123456");
    await user.type(screen.getByLabelText(/新密码/), "New12345");
    await user.click(screen.getByRole("button", { name: "设置密码" }));

    expect(apiJson).toHaveBeenCalledWith("/api/users/me/password/initial", {
      method: "PATCH",
      body: JSON.stringify({ new_password: "New12345", code: "123456" }),
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("未设密码且主邮箱为空：提示请先绑定主邮箱且无验证码字段", () => {
    render(
      <PasswordSheet
        open
        passwordSet={false}
        mainEmail={null}
        mainEmailVerified={false}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    expect(screen.getByText(/请先绑定主邮箱/)).toBeInTheDocument();
    expect(screen.queryByLabelText("邮箱验证码")).not.toBeInTheDocument();
  });

  it("主邮箱未验证时找回视图显示提示", async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    render(
      <PasswordSheet
        open
        passwordSet
        mainEmail="a@b.com"
        mainEmailVerified={false}
        onVerifyMainEmail={onVerify}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await user.click(screen.getByText(/忘记原密码/));
    expect(screen.getByText(/尚未验证/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "去验证主邮箱" }));
    expect(onVerify).toHaveBeenCalled();
  });
});
