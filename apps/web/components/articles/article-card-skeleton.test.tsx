import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ArticleCardSkeleton } from "./article-card-skeleton";

describe("ArticleCardSkeleton", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("根元素包含 animate-pulse 动画类", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect((container.firstChild as HTMLElement).classList.contains("animate-pulse")).toBe(true);
  });

  it("包含模拟封面图的占位块（aspect-video 比例）", () => {
    const { container } = render(<ArticleCardSkeleton />);
    const coverPlaceholder = container.querySelector(".aspect-video");
    expect(coverPlaceholder).toBeTruthy();
  });
});
