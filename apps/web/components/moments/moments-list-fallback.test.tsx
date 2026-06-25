import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { getMomentColumnCount } from "./moments-list";
import { MomentsListFallback } from "./moments-list-fallback";

describe("getMomentColumnCount", () => {
  it("按断点返回列数", () => {
    expect(getMomentColumnCount(400)).toBe(1);
    expect(getMomentColumnCount(768)).toBe(2);
    expect(getMomentColumnCount(1280)).toBe(3);
  });
});

describe("MomentsListFallback", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<MomentsListFallback />)).not.toThrow();
  });

  it("显示 8 个骨架卡片", () => {
    const { container } = render(<MomentsListFallback />);
    // MomentCardSkeleton 根节点为统一 Card，带 shadow-card 令牌类
    const skeletons = container.querySelectorAll(".shadow-card");
    expect(skeletons.length).toBe(8);
  });
});
