import { describe, expect, it } from "vitest";
import {
  presenceRecordToInput,
  resolvePresenceDisplay,
  resolvePresenceFromSubscription,
  toPresenceRecordSeed,
} from "./user-presence";

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

describe("toPresenceRecordSeed", () => {
  it("将 ISO 时间转为 unix 秒 seed", () => {
    const iso = "2024-01-01T12:00:00.000Z";
    expect(toPresenceRecordSeed({ is_online: false, last_active_at: iso })).toEqual({
      is_online: false,
      last_active_at: Math.floor(new Date(iso).getTime() / 1000),
    });
  });

  it("无有效字段时返回 undefined", () => {
    expect(toPresenceRecordSeed({})).toBeUndefined();
  });
});

describe("resolvePresenceFromSubscription", () => {
  it("有 record 时优先使用 store 值", () => {
    const input = resolvePresenceFromSubscription(
      { is_online: true, last_active_at: 1_700_000_000 },
      { is_online: false },
    );
    expect(input.is_online).toBe(true);
    expect(presenceRecordToInput({ is_online: true, last_active_at: 1_700_000_000 })).toEqual(
      input,
    );
  });

  it("无 record 时回落 props", () => {
    expect(
      resolvePresenceFromSubscription(undefined, { is_online: false, last_login_at: null }),
    ).toEqual({ is_online: false, last_login_at: null });
  });
});
