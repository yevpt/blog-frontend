import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { OAuthResultHandler } from "./oauth-result-handler";
import { OAUTH_RESULT_KEY } from "@/lib/oauth";

const mockRefresh = vi.fn();
const mockAddToast = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

describe("OAuthResultHandler", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockRefresh.mockClear();
    mockAddToast.mockClear();
  });

  it("无 oauth_result 时不触发 refresh", () => {
    render(<OAuthResultHandler />);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("oauth_success 时展示 toast 并 refresh", async () => {
    sessionStorage.setItem(
      OAUTH_RESULT_KEY,
      JSON.stringify({ type: "oauth_success", user: { id: 1, username: "vpt", nickname: "V" } }),
    );

    render(<OAuthResultHandler />);

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith("登录成功，欢迎回来 V！", "success"),
    );
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(OAUTH_RESULT_KEY)).toBeNull();
  });

  it("oauth_error 时仅展示错误 toast", async () => {
    sessionStorage.setItem(
      OAUTH_RESULT_KEY,
      JSON.stringify({ type: "oauth_error", message: "state 校验失败" }),
    );

    render(<OAuthResultHandler />);

    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("state 校验失败", "error"));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
