import { describe, expect, it } from "vitest";
import {
  PRESET_AVATAR_COUNT,
  hashAvatarSeed,
  isInactiveMockAvatarUrl,
  isLocalFallbackAvatarUrl,
  isPresetAvatarUrl,
  resolveFallbackAvatarUrl,
  resolveInactiveMockAvatarUrl,
  resolveInitialsTone,
  resolvePresetAvatarUrl,
} from "./preset-avatar";

describe("preset-avatar", () => {
  it("同一 seed 始终返回相同 mock data URL", () => {
    expect(resolveInactiveMockAvatarUrl(42)).toBe(resolveInactiveMockAvatarUrl(42));
    expect(resolveInactiveMockAvatarUrl("alice")).toBe(resolveInactiveMockAvatarUrl("alice"));
  });

  it("mock 头像为自托管 data URL 且可识别", () => {
    const url = resolveInactiveMockAvatarUrl(7);
    expect(url).toMatch(/^data:image\/svg\+xml,/);
    expect(isInactiveMockAvatarUrl(url)).toBe(true);
    expect(isLocalFallbackAvatarUrl(url)).toBe(true);
  });

  it("resolveFallbackAvatarUrl 始终映射到 mock 头像", () => {
    expect(resolveFallbackAvatarUrl(99)).toBe(resolveInactiveMockAvatarUrl(99));
  });

  it("resolveInitialsTone 对同一 seed 稳定", () => {
    expect(resolveInitialsTone(3)).toBe(resolveInitialsTone(3));
    expect(resolveInitialsTone("bob")).toBe(resolveInitialsTone("bob"));
  });

  it("遗留 resolvePresetAvatarUrl 仍可用", () => {
    expect(resolvePresetAvatarUrl(42)).toBe(resolvePresetAvatarUrl(42));
    for (let i = 0; i < 100; i++) {
      const url = resolvePresetAvatarUrl(i);
      const match = url.match(/\/(\d{2})\.svg$/);
      expect(match).not.toBeNull();
      const index = Number(match?.[1]);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(PRESET_AVATAR_COUNT);
    }
  });

  it("isPresetAvatarUrl 识别预设路径", () => {
    expect(isPresetAvatarUrl("/avatars/presets/03.svg")).toBe(true);
    expect(isPresetAvatarUrl(resolveInactiveMockAvatarUrl(3))).toBe(false);
    expect(isPresetAvatarUrl(undefined)).toBe(false);
  });

  it("hashAvatarSeed 对相同输入稳定", () => {
    expect(hashAvatarSeed(7)).toBe(hashAvatarSeed(7));
    expect(hashAvatarSeed("bob")).toBe(hashAvatarSeed("bob"));
  });
});
