import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildPayload } from "./payload";

describe("buildPayload", () => {
  beforeEach(() => {
    document.title = "Test Page";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("组装含 path/title/session_id 的载荷", () => {
    const p = buildPayload("page_view", "/posts/1", "sid-1");
    expect(p.event_type).toBe("page_view");
    expect(p.path).toBe("/posts/1");
    expect(p.title).toBe("Test Page");
    expect(p.session_id).toBe("sid-1");
    expect(typeof p.screen).toBe("string");
    expect(typeof p.referer).toBe("string");
  });

  it("includes collect_token and headless signals", () => {
    vi.stubGlobal("navigator", { webdriver: true });
    const payload = buildPayload("page_view", "/a", "sid", {
      collectToken: "tok",
      hasInteracted: false,
    });
    expect(payload.collect_token).toBe("tok");
    expect(payload.signals).toEqual({ webdriver: true, no_interaction: true });
  });

  it("默认无 token，无交互且未标记 webdriver", () => {
    vi.stubGlobal("navigator", { webdriver: false });
    const payload = buildPayload("page_view", "/a", "sid");
    expect(payload.collect_token).toBeUndefined();
    expect(payload.signals).toEqual({ webdriver: false, no_interaction: false });
  });
});
