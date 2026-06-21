import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { getSnippetColumnCount } from "./snippets-list";
import { SnippetsListFallback } from "./snippets-list-fallback";

describe("getSnippetColumnCount", () => {
  it("按断点返回列数", () => {
    expect(getSnippetColumnCount(400)).toBe(1);
    expect(getSnippetColumnCount(768)).toBe(2);
    expect(getSnippetColumnCount(1280)).toBe(3);
  });
});

describe("SnippetsListFallback", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<SnippetsListFallback />)).not.toThrow();
  });

  it("显示 8 个骨架卡片", () => {
    const { container } = render(<SnippetsListFallback />);
    // SnippetCardSkeleton 根节点为统一 Card，带 shadow-card 令牌类
    const skeletons = container.querySelectorAll(".shadow-card");
    expect(skeletons.length).toBe(8);
  });
});
