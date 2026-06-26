import { describe, it, expect } from "vitest";
import { PROFILE_MOMENTS_PAGE_SIZE, shouldShowProfileMomentsEndMessage } from "./constants";

describe("shouldShowProfileMomentsEndMessage", () => {
  it("还有更多时不展示", () => {
    expect(shouldShowProfileMomentsEndMessage(3, true, 1, PROFILE_MOMENTS_PAGE_SIZE)).toBe(false);
  });

  it("不足一页时不展示", () => {
    expect(shouldShowProfileMomentsEndMessage(3, false, 1, PROFILE_MOMENTS_PAGE_SIZE)).toBe(false);
  });

  it("满一页且无更多时展示", () => {
    expect(
      shouldShowProfileMomentsEndMessage(
        PROFILE_MOMENTS_PAGE_SIZE,
        false,
        1,
        PROFILE_MOMENTS_PAGE_SIZE,
      ),
    ).toBe(true);
  });

  it("加载过第二页后展示", () => {
    expect(shouldShowProfileMomentsEndMessage(2, false, 2, PROFILE_MOMENTS_PAGE_SIZE)).toBe(true);
  });
});
