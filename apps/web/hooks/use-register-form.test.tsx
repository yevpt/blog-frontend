// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ChangeEvent } from "react";
import {
  isValidEmail,
  validatePassword,
  useRegisterForm,
  type CaptchaChallenge,
} from "./use-register-form";

const mockAddToast = vi.fn();

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

const CHALLENGE: CaptchaChallenge = {
  challenge_id: "challenge-id",
  master_image: "data:image/jpeg;base64,master",
  tile_image: "data:image/png;base64,tile",
  tile_x: 10,
  tile_y: 80,
  tile_width: 60,
  tile_height: 60,
  image_width: 300,
  image_height: 220,
};

function mockApiResponse<T>(data: T, code = 0, message = "ok") {
  return {
    json: async () => ({ code, message, data }),
  } as Response;
}

describe("validation helpers", () => {
  it("validatePassword returns existing error for passwords shorter than 8 chars", () => {
    expect(validatePassword("abc12")).toBe("密码不能少于 8 位");
  });

  it("isValidEmail rejects invalid email", () => {
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("user@example.com")).toBe(true);
  });
});

describe("useRegisterForm", () => {
  const onSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    onSwitchToLogin.mockReset();
    mockAddToast.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invalid email blocks captcha open", async () => {
    const { result } = renderHook(() => useRegisterForm({ onSwitchToLogin }));

    act(() => {
      result.current.setEmail("invalid-email");
    });

    await act(async () => {
      await result.current.openCaptcha();
    });

    expect(result.current.captchaOpen).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("successful captcha challenge opens modal and initializes captchaX", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockApiResponse(CHALLENGE));

    const { result } = renderHook(() => useRegisterForm({ onSwitchToLogin }));

    act(() => {
      result.current.setEmail("user@example.com");
    });

    await act(async () => {
      await result.current.openCaptcha();
    });

    expect(result.current.captchaOpen).toBe(true);
    expect(result.current.captchaChallenge).toEqual(CHALLENGE);
    expect(result.current.captchaX).toBe(CHALLENGE.tile_x);
  });

  it("successful captcha verify sends email code and starts 60 second countdown", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockApiResponse(CHALLENGE))
      .mockResolvedValueOnce(mockApiResponse({ captcha_token: "captcha-token" }))
      .mockResolvedValueOnce(mockApiResponse(null));

    const { result } = renderHook(() => useRegisterForm({ onSwitchToLogin }));

    act(() => {
      result.current.setEmail("user@example.com");
    });

    await act(async () => {
      await result.current.openCaptcha();
    });

    await act(async () => {
      await result.current.handleCaptchaVerify(162);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/send-code",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          captcha_token: "captcha-token",
        }),
      }),
    );
    expect(result.current.countdown).toBe(60);
    expect(result.current.codeSent).toBe(true);
  });

  it("registration success calls onSwitchToLogin", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockApiResponse(null));

    const { result } = renderHook(() => useRegisterForm({ onSwitchToLogin }));

    act(() => {
      result.current.setEmail("user@example.com");
      result.current.setPassword("password1");
      result.current.setCode("123456");
    });

    await act(async () => {
      await result.current.submitRegistration();
    });

    expect(onSwitchToLogin).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password1",
          code: "123456",
        }),
      }),
    );
  });

  it("object URL for avatar preview is revoked when replaced/removed", () => {
    const { result } = renderHook(() => useRegisterForm({ onSwitchToLogin }));
    const fileInput = document.createElement("input");

    const firstFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    act(() => {
      result.current.handleAvatarChange({
        target: { files: [firstFile] },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    vi.mocked(URL.createObjectURL).mockReturnValueOnce("blob:second-url");
    const secondFile = new File(["avatar2"], "avatar2.png", { type: "image/png" });
    act(() => {
      result.current.handleAvatarChange({
        target: { files: [secondFile] },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    act(() => {
      result.current.handleAvatarRemove(fileInput);
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second-url");
    expect(result.current.avatarPreview).toBeNull();
  });
});
