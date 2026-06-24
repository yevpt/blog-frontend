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
const mockCompressAvatarImage = vi.fn();

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

vi.mock("@repo/hooks", async () => {
  const actual = await vi.importActual("@repo/hooks");
  return {
    ...(actual as object),
    compressAvatarImage: (...args: unknown[]) => mockCompressAvatarImage(...args),
  };
});

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
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    onSuccess.mockReset();
    mockAddToast.mockReset();
    mockCompressAvatarImage.mockReset();
    mockCompressAvatarImage.mockImplementation(async (file: File) => file);
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invalid email blocks captcha open", async () => {
    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

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

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

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

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

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

  it("registration success auto-logins and calls onSuccess", async () => {
    const user = { id: 1, username: "user@example.com", nickname: "新用户" };
    vi.mocked(fetch).mockResolvedValueOnce(mockApiResponse({ user }));

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

    act(() => {
      result.current.setEmail("user@example.com");
      result.current.setPassword("password1");
      result.current.setCode("123456");
    });

    await act(async () => {
      await result.current.submitRegistration();
    });

    expect(onSuccess).toHaveBeenCalledWith(user);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });

  it("registration with avatar sends multipart including avatar file", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockApiResponse(null));
    const compressed = new File(["avatar"], "avatar.jpg", { type: "image/jpeg" });
    mockCompressAvatarImage.mockResolvedValueOnce(compressed);

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [file], value: "avatar.png" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.setEmail("user@example.com");
      result.current.setPassword("password1");
      result.current.setCode("123456");
    });

    await act(async () => {
      await result.current.submitRegistration();
    });

    const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body as FormData;
    const avatarField = body.get("avatar");
    expect(avatarField).toBeInstanceOf(File);
    expect((avatarField as File).name).toBe("avatar.jpg");
  });

  it("avatar compression failure shows toast and keeps existing preview", async () => {
    const existing = new File(["avatar"], "avatar.png", { type: "image/png" });
    mockCompressAvatarImage.mockResolvedValueOnce(existing);

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [existing], value: "avatar.png" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.avatarPreview).toBe("blob:mock-url");

    mockCompressAvatarImage.mockRejectedValueOnce(new Error("不支持 GIF 头像"));

    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [new File(["x"], "a.gif", { type: "image/gif" })], value: "a.gif" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    expect(mockAddToast).toHaveBeenCalledWith("不支持 GIF 头像", "error");
    expect(result.current.avatarPreview).toBe("blob:mock-url");
  });

  it("canceling file picker keeps existing preview", async () => {
    const existing = new File(["avatar"], "avatar.png", { type: "image/png" });
    mockCompressAvatarImage.mockResolvedValueOnce(existing);

    const { result } = renderHook(() => useRegisterForm({ onSuccess }));

    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [existing], value: "avatar.png" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [], value: "" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    expect(mockCompressAvatarImage).toHaveBeenCalledTimes(1);
    expect(result.current.avatarPreview).toBe("blob:mock-url");
  });

  it("object URL for avatar preview is revoked when replaced/removed", async () => {
    const { result } = renderHook(() => useRegisterForm({ onSuccess }));
    const fileInput = document.createElement("input");

    const firstFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [firstFile], value: "avatar.png" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });

    vi.mocked(URL.createObjectURL).mockReturnValueOnce("blob:second-url");
    const secondFile = new File(["avatar2"], "avatar2.png", { type: "image/png" });
    await act(async () => {
      await result.current.handleAvatarChange({
        target: { files: [secondFile], value: "avatar2.png" },
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
