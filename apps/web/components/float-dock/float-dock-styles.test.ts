import { describe, expect, it } from "vitest";
import { getFloatScrollTopThreshold } from "./float-dock-styles";

describe("getFloatScrollTopThreshold", () => {
  it("矮视口时至少 800px", () => {
    expect(getFloatScrollTopThreshold(500)).toBe(800);
  });

  it("高视口时按 1.5 屏计算", () => {
    expect(getFloatScrollTopThreshold(900)).toBe(1350);
  });
});
