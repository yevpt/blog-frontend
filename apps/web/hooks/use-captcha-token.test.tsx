// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCaptchaToken } from "./use-captcha-token";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCaptchaToken", () => {
  it("openCaptcha 拉挑战并打开，初始化 captchaX", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
    );
    const { result } = renderHook(() => useCaptchaToken({ onToken: async () => {} }));

    await act(async () => {
      await result.current.openCaptcha();
    });

    expect(result.current.captchaOpen).toBe(true);
    expect(result.current.captchaChallenge?.challenge_id).toBe("c1");
    expect(result.current.captchaX).toBe(10);
  });

  it("handleVerify 成功后用拿到的 token 调 onToken 并关闭", async () => {
    const onToken = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ captcha_token: "tok123" })));
    const { result } = renderHook(() => useCaptchaToken({ onToken }));

    await act(async () => {
      await result.current.openCaptcha();
    });
    await act(async () => {
      await result.current.handleVerify(15);
    });

    expect(onToken).toHaveBeenCalledWith("tok123");
    expect(result.current.captchaOpen).toBe(false);
  });

  it("handleVerify 命中 429 时关闭并调 onRateLimited，不重拉挑战", async () => {
    const onRateLimited = vi.fn();
    const onToken = vi.fn();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "发送过于频繁" }), { status: 429 }),
      );
    const { result } = renderHook(() => useCaptchaToken({ onToken, onRateLimited }));

    await act(async () => {
      await result.current.openCaptcha();
    });
    await act(async () => {
      await result.current.handleVerify(15);
    });

    expect(onToken).not.toHaveBeenCalled();
    expect(onRateLimited).toHaveBeenCalledWith("发送过于频繁");
    expect(result.current.captchaOpen).toBe(false);
    // 命中 429 不应再次拉挑战：仅 challenge + verify 两次请求
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("handleVerify 其它失败时重拉新挑战且保持打开", async () => {
    const onToken = vi.fn();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "校验失败" }), { status: 400 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge_id: "c2", tile_x: 30, tile_y: 40 })),
      );
    const { result } = renderHook(() => useCaptchaToken({ onToken }));

    await act(async () => {
      await result.current.openCaptcha();
    });
    await act(async () => {
      await result.current.handleVerify(15);
    });

    expect(onToken).not.toHaveBeenCalled();
    expect(result.current.captchaOpen).toBe(true);
    expect(result.current.captchaChallenge?.challenge_id).toBe("c2");
    expect(result.current.captchaX).toBe(30);
  });

  it("handleVerify 中 onToken 抛出非限流业务错误时关闭弹层并调用 onError，不重拉挑战", async () => {
    class BusinessError extends Error {
      errorCode = "AUTH_EMAIL_TAKEN";
    }
    const onError = vi.fn();
    const onToken = vi.fn().mockRejectedValue(new BusinessError("该邮箱已被注册"));
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ captcha_token: "tok123" })));
    const { result } = renderHook(() => useCaptchaToken({ onToken, onError }));

    await act(async () => {
      await result.current.openCaptcha();
    });
    await act(async () => {
      await result.current.handleVerify(15);
    });

    expect(onError).toHaveBeenCalledWith("该邮箱已被注册", "AUTH_EMAIL_TAKEN");
    expect(result.current.captchaOpen).toBe(false);
    // 不应重拉新挑战：仅 challenge + verify 两次请求
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("closeCaptcha 关闭并清空挑战", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
    );
    const { result } = renderHook(() => useCaptchaToken({ onToken: async () => {} }));

    await act(async () => {
      await result.current.openCaptcha();
    });
    act(() => {
      result.current.closeCaptcha();
    });

    expect(result.current.captchaOpen).toBe(false);
    expect(result.current.captchaChallenge).toBeNull();
  });
});
