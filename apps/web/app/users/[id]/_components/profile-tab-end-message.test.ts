import { describe, it, expect } from "vitest";
import { shouldShowProfileTabEndMessage } from "./profile-tab-end-message";

describe("shouldShowProfileTabEndMessage", () => {
  it("还有更多时不展示", () => {
    expect(shouldShowProfileTabEndMessage(3, true, 1, 10)).toBe(false);
  });

  it("不足一页时不展示", () => {
    expect(shouldShowProfileTabEndMessage(3, false, 1, 10)).toBe(false);
  });

  it("满一页且无更多时展示", () => {
    expect(shouldShowProfileTabEndMessage(10, false, 1, 10)).toBe(true);
  });

  it("加载过第二页后展示", () => {
    expect(shouldShowProfileTabEndMessage(2, false, 2, 10)).toBe(true);
  });
});
