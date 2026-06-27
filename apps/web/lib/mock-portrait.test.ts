import { describe, expect, it } from "vitest";
import {
  generateMockPortraitSvg,
  encodeMockPortraitDataUrl,
  isMockPortraitDataUrl,
} from "./mock-portrait";

describe("mock-portrait", () => {
  it("同一 seed 生成相同 SVG", () => {
    expect(generateMockPortraitSvg(42)).toBe(generateMockPortraitSvg(42));
    expect(encodeMockPortraitDataUrl("alice")).toBe(encodeMockPortraitDataUrl("alice"));
  });

  it("SVG 含 mock 标记", () => {
    expect(generateMockPortraitSvg(1)).toContain('data-mock-portrait="1"');
    expect(isMockPortraitDataUrl(encodeMockPortraitDataUrl(1))).toBe(true);
  });

  it("不同 seed 在采样中产生足够差异", () => {
    const samples = new Set(Array.from({ length: 200 }, (_, i) => generateMockPortraitSvg(i + 1)));
    expect(samples.size).toBeGreaterThan(120);
  });

  it("isMockPortraitDataUrl 忽略非 mock data URL", () => {
    expect(isMockPortraitDataUrl("data:image/png;base64,xx")).toBe(false);
    expect(isMockPortraitDataUrl(undefined)).toBe(false);
  });
});
