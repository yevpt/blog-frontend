// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { EmailSheet } from "./email-sheet";

const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

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

describe("EmailSheet", () => {
  it("获取验证码前必须先过图形验证", async () => {
    const user = userEvent.setup();
    render(
      <EmailSheet
        open
        target="main"
        intent="rebind"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("新邮箱"), "new@x.com");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    expect(openCaptcha).toHaveBeenCalledTimes(1);
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("过图形验证后以新邮箱发码", async () => {
    render(
      <EmailSheet
        open
        target="main"
        intent="rebind"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("新邮箱"), "new@x.com");
    await capturedOnToken?.("captcha-token-123");

    expect(apiJson).toHaveBeenCalledWith("/api/users/me/email/code", {
      method: "POST",
      body: JSON.stringify({ email: "new@x.com", captcha_token: "captcha-token-123" }),
    });
  });

  it("提交以 { target, email, code } 调用 PATCH", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <EmailSheet
        open
        target="sub"
        intent="bind"
        currentEmail={null}
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    );

    await user.type(screen.getByLabelText("新邮箱"), "sub@x.com");
    await user.type(screen.getByLabelText("邮箱验证码"), "123456");
    await user.click(screen.getByRole("button", { name: /确认/ }));

    expect(apiJson).toHaveBeenCalledWith("/api/users/me/email", {
      method: "PATCH",
      body: JSON.stringify({ target: "sub", email: "sub@x.com", code: "123456" }),
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("verify 模式：预填当前邮箱只读，发码/提交用当前地址", async () => {
    render(
      <EmailSheet
        open
        target="main"
        intent="verify"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    expect(screen.getByText("验证主邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("当前邮箱")).toHaveValue("a@b.com");
    expect(screen.getByLabelText("当前邮箱")).toBeDisabled();

    await capturedOnToken?.("cap");
    expect(apiJson).toHaveBeenCalledWith("/api/users/me/email/code", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", captcha_token: "cap" }),
    });
  });

  it("标题随 target、intent 变化", () => {
    const { rerender } = render(
      <EmailSheet
        open
        target="main"
        intent="rebind"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );
    expect(screen.getByText("换绑主邮箱")).toBeInTheDocument();

    rerender(
      <EmailSheet
        open
        target="sub"
        intent="bind"
        currentEmail={null}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );
    expect(screen.getByText("添加副邮箱")).toBeInTheDocument();
  });
});
