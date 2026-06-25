// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { PasswordRecoveryForm } from "./password-recovery-form";

// 取数纠偏：组件用 @/lib/client-fetch 的 apiJson 打公开找回接口（发码 POST + 重置 POST），故 mock apiJson；
// 其余导出（getApiErrorMessage 等）保留真实实现。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

// 捕获 useCaptchaToken 的 onToken 以模拟图形验证通过后发码的真实行为。
const openCaptcha = vi.fn();
let capturedOnToken: ((token: string) => Promise<void>) | null = null;
vi.mock("@/hooks/use-captcha-token", () => ({
  useCaptchaToken: (opts: { onToken: (t: string) => Promise<void> }) => {
    capturedOnToken = opts.onToken;
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

beforeEach(() => {
  apiJson.mockReset();
  apiJson.mockResolvedValue(undefined);
  openCaptcha.mockReset();
  capturedOnToken = null;
});

describe("PasswordRecoveryForm", () => {
  it("重置密码：填验证码+新密码点「重置密码」→ password-reset POST { email, code, new_password }", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<PasswordRecoveryForm email="a@b.com" onDone={onDone} />);

    await user.type(screen.getByLabelText("邮箱验证码"), "123456");
    await user.type(screen.getByLabelText(/新密码/), "Abcd1234");
    await user.click(screen.getByRole("button", { name: "重置密码" }));

    expect(apiJson).toHaveBeenCalledWith("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", code: "123456", new_password: "Abcd1234" }),
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("过图形验证拿到 token 后以主邮箱发码（password-reset/code）", async () => {
    render(<PasswordRecoveryForm email="a@b.com" onDone={() => {}} />);

    await capturedOnToken?.("captcha-token-123");

    expect(apiJson).toHaveBeenCalledWith("/api/auth/password-reset/code", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", captcha_token: "captcha-token-123" }),
    });
  });

  it("新密码不足 8 位时禁用重置按钮", async () => {
    const user = userEvent.setup();
    render(<PasswordRecoveryForm email="a@b.com" onDone={() => {}} />);

    await user.type(screen.getByLabelText("邮箱验证码"), "123456");
    await user.type(screen.getByLabelText(/新密码/), "short");

    expect(screen.getByRole("button", { name: "重置密码" })).toBeDisabled();
  });
});
