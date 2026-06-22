import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "@repo/api";
import { apiJson, apiForm, ApiClientError, getApiErrorMessage } from "./client-fetch";

describe("getApiErrorMessage", () => {
  it("透传 ApiClientError 的后端 message", () => {
    const err = new ApiClientError("内容长度不能超过 2000 个字符", 400);
    expect(getApiErrorMessage(err, "兜底")).toBe("内容长度不能超过 2000 个字符");
  });

  it("透传 ApiError 的后端 message", () => {
    const err = new ApiError(400, "评论已关闭");
    expect(getApiErrorMessage(err, "兜底")).toBe("评论已关闭");
  });

  it("message 为空白时回退到 fallback", () => {
    const err = new ApiClientError("   ", 500);
    expect(getApiErrorMessage(err, "服务器开小差了")).toBe("服务器开小差了");
  });

  it("网络异常等未知错误回退到 fallback，不暴露英文细节", () => {
    const err = new TypeError("Failed to fetch");
    expect(getApiErrorMessage(err, "网络异常，请稍后重试")).toBe("网络异常，请稍后重试");
  });

  it("非 Error 值回退到 fallback", () => {
    expect(getApiErrorMessage("boom", "兜底")).toBe("兜底");
  });
});

describe("apiJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on 2xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await expect(apiJson<{ ok: boolean }>("/api/test")).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith("/api/test", undefined);
  });

  it("throws an ApiClientError with status/message on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Bad request" }), { status: 400 }),
    );

    await expect(apiJson("/api/test")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err).toMatchObject({
        name: "ApiClientError",
        message: "Bad request",
        status: 400,
      });
      return true;
    });
  });

  it("supports AbortSignal", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await apiJson("/api/test", { signal: controller.signal });

    expect(fetch).toHaveBeenCalledWith("/api/test", { signal: controller.signal });
  });
});

describe("apiForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends FormData without forcing Content-Type", async () => {
    const formData = new FormData();
    formData.append("file", "test");
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await apiForm("/api/upload", formData);

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.body).toBe(formData);
    expect(init?.headers).toBeUndefined();
  });
});
