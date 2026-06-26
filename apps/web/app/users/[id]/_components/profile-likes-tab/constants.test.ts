import { describe, it, expect } from "vitest";
import {
  PROFILE_LIKES_PAGE_SIZE,
  formatProfileLikesTabLabel,
  shouldShowProfileLikesEndMessage,
} from "./constants";

describe("formatProfileLikesTabLabel", () => {
  it("格式化点赞 Tab 标签", () => {
    expect(formatProfileLikesTabLabel(0)).toBe("点赞 (0)");
    expect(formatProfileLikesTabLabel(12)).toBe("点赞 (12)");
  });
});

describe("shouldShowProfileLikesEndMessage", () => {
  it("不足一页时不展示", () => {
    expect(shouldShowProfileLikesEndMessage(3, false, 1, PROFILE_LIKES_PAGE_SIZE)).toBe(false);
  });

  it("满一页且无更多时展示", () => {
    expect(
      shouldShowProfileLikesEndMessage(PROFILE_LIKES_PAGE_SIZE, false, 1, PROFILE_LIKES_PAGE_SIZE),
    ).toBe(true);
  });
});
