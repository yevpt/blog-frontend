import { describe, it, expect, beforeEach } from "vitest";
import { buildPayload } from "./payload";

describe("buildPayload", () => {
  beforeEach(() => {
    document.title = "Test Page";
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
});
