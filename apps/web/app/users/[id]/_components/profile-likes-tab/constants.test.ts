import { describe, it, expect } from "vitest";
import { formatProfileLikesTabLabel } from "./constants";

describe("formatProfileLikesTabLabel", () => {
  it("格式化点赞 Tab 标签", () => {
    expect(formatProfileLikesTabLabel(0)).toBe("点赞 (0)");
    expect(formatProfileLikesTabLabel(12)).toBe("点赞 (12)");
  });
});
