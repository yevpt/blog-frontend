import { describe, expect, it } from "vitest";
import { resolvePresenceDisplay } from "./user-presence";

describe("resolvePresenceDisplay", () => {
  it("is_online=true 时返回在线", () => {
    expect(resolvePresenceDisplay({ is_online: true })).toEqual({
      kind: "online",
      label: "在线",
    });
  });

  it("离线且有 last_active_at 时返回相对活跃时间", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = resolvePresenceDisplay({ is_online: false, last_active_at: recent });
    expect(result.kind).toBe("offline");
    expect(result.label).toMatch(/活跃过$/);
  });

  it("last_active_at 为空时降级 last_login_at", () => {
    const login = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = resolvePresenceDisplay({ is_online: false, last_login_at: login });
    expect(result.kind).toBe("offline");
    expect(result.label).toMatch(/活跃过$/);
  });

  it("皆空时返回从未活跃", () => {
    expect(resolvePresenceDisplay({ is_online: false })).toEqual({
      kind: "never",
      label: "从未活跃",
    });
  });
});
