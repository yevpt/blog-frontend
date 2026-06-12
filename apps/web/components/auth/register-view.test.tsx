import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { _resetProvidersCache } from "./oauth-grid";
import { RegisterView } from "./register-view";

function mockProviders(providers: string[] = ["github", "qq", "weibo", "gitee", "baidu"]) {
  return { json: () => Promise.resolve({ code: 0, data: providers }) } as Response;
}

const mockAddToast = vi.fn();
vi.mock("@/lib/toast", () => ({
  addToast: vi
    .fn()
    .mockImplementation((...args: Parameters<typeof mockAddToast>) => mockAddToast(...args)),
}));

describe("RegisterView", () => {
  const mockSwitch = vi.fn();

  beforeEach(() => {
    _resetProvidersCache();
    mockSwitch.mockClear();
    mockAddToast.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    global.fetch = vi.fn().mockResolvedValue(mockProviders());
    // jsdom does not implement pointer capture
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("渲染注册所有必填和可选字段", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByPlaceholderText("邮箱地址")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("验证码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("设置密码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("昵称（可选）")).toBeInTheDocument();
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
    expect(screen.getByLabelText("QQ")).toBeInTheDocument();
  });

  it("邮箱格式无效时获取验证码按钮不可点击", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.type(screen.getByPlaceholderText("邮箱地址"), "invalid-email");
    const btn = screen.getByRole("button", { name: "获取验证码" });
    expect(btn).toBeDisabled();
  });

  it("邮箱格式正确时获取验证码按钮可点击", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
    const btn = screen.getByRole("button", { name: "获取验证码" });
    expect(btn).not.toBeDisabled();
  });

  it("提交时邮箱格式错误显示内联错误提示", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.type(screen.getByPlaceholderText("邮箱地址"), "bad");
    await user.click(screen.getByRole("button", { name: "创建账号" }));
    expect(screen.getByText("邮箱格式不正确")).toBeInTheDocument();
  });

  it("密码不足 8 位时显示内联错误提示", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.type(screen.getByPlaceholderText("设置密码"), "abc12");
    fireEvent.blur(screen.getByPlaceholderText("设置密码"));
    expect(screen.getByText("密码不能少于 8 位")).toBeInTheDocument();
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

  it("获取邮箱验证码前先完成 GoCaptcha 校验，并携带 captcha_token 发送邮件验证码", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockProviders())
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          message: "ok",
          data: {
            challenge_id: "challenge-id",
            master_image: "data:image/jpeg;base64,master",
            tile_image: "data:image/png;base64,tile",
            tile_x: 10,
            tile_y: 80,
            tile_width: 60,
            tile_height: 60,
            image_width: 300,
            image_height: 220,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          message: "ok",
          data: { captcha_token: "captcha-token" },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, message: "ok", data: null }),
      } as Response);

    render(<RegisterView onSwitchToLogin={mockSwitch} />);

    await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    // 等待拼图弹层出现
    const track = await screen.findByTestId("captcha-track");

    // mock getBoundingClientRect for the slider track
    Object.defineProperty(track, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 52,
        width: 300,
        height: 52,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });

    // 模拟拖动滑块到位置 162
    fireEvent.pointerDown(track, { clientX: 10, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 162 });
    fireEvent.pointerUp(track, { clientX: 162, pointerId: 1 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/send-code",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "user@example.com",
            captcha_token: "captcha-token",
          }),
        }),
      );
    });
    expect(screen.getByRole("button", { name: /重新发送/ })).toBeInTheDocument();
  });

  it("send-code 返回 429 时关闭验证码弹层并 toast 通知，不重试拼图", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockProviders())
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          message: "ok",
          data: {
            challenge_id: "c1",
            master_image: "data:image/jpeg;base64,m",
            tile_image: "data:image/png;base64,t",
            tile_x: 10,
            tile_y: 80,
            tile_width: 60,
            tile_height: 60,
            image_width: 300,
            image_height: 220,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ code: 0, message: "ok", data: { captcha_token: "tok" } }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ code: 429, message: "IP 已被封禁，请稍后再试", data: null }),
      } as Response);

    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    const track = await screen.findByTestId("captcha-track");
    Object.defineProperty(track, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 52,
        width: 300,
        height: 52,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    fireEvent.pointerDown(track, { clientX: 10, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 162 });
    fireEvent.pointerUp(track, { clientX: 162, pointerId: 1 });

    await waitFor(() => {
      expect(screen.queryByTestId("captcha-track")).not.toBeInTheDocument();
    });
    expect(mockAddToast).toHaveBeenCalledWith("IP 已被封禁，请稍后再试", "error");
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
