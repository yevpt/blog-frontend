import { describe, it, expect } from "vitest";
import { formatProfileMomentsTabLabel } from "./constants";

describe("formatProfileMomentsTabLabel", () => {
  it("拼接碎语总数", () => {
    expect(formatProfileMomentsTabLabel(0)).toBe("碎语 (0)");
    expect(formatProfileMomentsTabLabel(24)).toBe("碎语 (24)");
  });
});
