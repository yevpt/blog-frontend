import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CommentItemSkeleton, CommentListSkeleton } from "./comment-skeleton";

describe("CommentItemSkeleton", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<CommentItemSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("根元素包含 animate-pulse 动画类", () => {
    const { container } = render(<CommentItemSkeleton />);
    expect((container.firstChild as HTMLElement).classList.contains("animate-pulse")).toBe(true);
  });

  it("包含头像占位圆形", () => {
    const { container } = render(<CommentItemSkeleton />);
    const avatar = container.querySelector(".rounded-full");
    expect(avatar).toBeTruthy();
  });

  it("包含用户名和时间占位行", () => {
    const { container } = render(<CommentItemSkeleton />);
    const placeholders = container.querySelectorAll(".bg-muted");
    expect(placeholders.length).toBeGreaterThanOrEqual(3);
  });
});

describe("CommentListSkeleton", () => {
  it("默认渲染 3 个骨架项", () => {
    const { container } = render(<CommentListSkeleton />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(3);
  });

  it("传入 count 时渲染对应数量骨架项", () => {
    const { container } = render(<CommentListSkeleton count={5} />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(5);
  });

  it("包含 aria-label 无障碍提示", () => {
    render(<CommentListSkeleton />);
    expect(document.querySelector("[aria-label='评论加载中']")).toBeTruthy();
  });
});
