import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEvent } from "./transport";
import type { CollectPayload } from "./types";

const payload: CollectPayload = {
  event_type: "page_view",
  path: "/",
  title: "t",
  referer: "",
  session_id: "sid",
  screen: "1x1",
};

describe("sendEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("以 keepalive + credentials 同源 POST 到 /api/collect", () => {
    sendEvent(payload);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/collect");
    expect(init).toMatchObject({
      method: "POST",
      keepalive: true,
      credentials: "include",
    });
    expect(JSON.parse(init!.body as string)).toEqual(payload);
  });

  it("尊重自定义 endpoint", () => {
    sendEvent(payload, "/custom/collect");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/custom/collect");
  });

  it("吞掉 fetch 抛出的异常，不向页面冒泡", () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error("network down");
    });
    expect(() => sendEvent(payload)).not.toThrow();
  });

  it("吞掉 fetch 拒绝的 promise", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("rejected"));
    expect(() => sendEvent(payload)).not.toThrow();
    await Promise.resolve();
  });
});
