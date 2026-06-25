// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { EmailSheet } from "./email-sheet";

// 取数纠偏：组件用 @/lib/client-fetch 的 apiJson 打 POST(发码)/PATCH(换绑)，故 mock apiJson；
// 其余导出（getApiErrorMessage 等）保留真实实现。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

// 捕获 useCaptchaToken 的入参（onToken）并暴露受控的 openCaptcha 间谍，
// 以断言「未过图形验证前点获取验证码只弹 captcha、不发码」的真实行为。
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

// RegisterCaptcha 在测试中无需真实滑块，渲染占位即可。
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
  it("获取验证码前必须先过图形验证（无 token 不发码，只弹 captcha）", async () => {
    const user = userEvent.setup();
    render(
      <EmailSheet
        open
        target="main"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("新邮箱"), "new@x.com");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    // 仅打开图形验证，未调用发码接口
    expect(openCaptcha).toHaveBeenCalledTimes(1);
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("过图形验证拿到 token 后才以新邮箱发码", async () => {
    render(
      <EmailSheet
        open
        target="main"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("新邮箱"), "new@x.com");

    // 模拟图形验证通过回调
    await capturedOnToken?.("captcha-token-123");

    expect(apiJson).toHaveBeenCalledWith("/api/users/me/email/code", {
      method: "POST",
      body: JSON.stringify({ email: "new@x.com", captcha_token: "captcha-token-123" }),
    });
  });

  it("提交以 { target, email, code } 调用 apiJson PATCH /api/users/me/email", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <EmailSheet open target="sub" currentEmail={null} onClose={() => {}} onSuccess={onSuccess} />,
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

  it("标题随 target 与是否已有邮箱变化", () => {
    const { rerender } = render(
      <EmailSheet
        open
        target="main"
        currentEmail="a@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );
    expect(screen.getByText("换绑主邮箱")).toBeInTheDocument();

    rerender(
      <EmailSheet open target="sub" currentEmail={null} onClose={() => {}} onSuccess={() => {}} />,
    );
    expect(screen.getByText("添加副邮箱")).toBeInTheDocument();

    rerender(
      <EmailSheet
        open
        target="sub"
        currentEmail="s@b.com"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );
    expect(screen.getByText("换绑副邮箱")).toBeInTheDocument();
  });
});
