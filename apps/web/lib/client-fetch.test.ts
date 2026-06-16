import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiJson, apiForm, ApiClientError } from "./client-fetch";

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
