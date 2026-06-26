import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ArticleLikeCountFloat } from "./article-like-count-float";

describe("ArticleLikeCountFloat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("浮现点赞数并在动画结束后回调", () => {
    const onComplete = vi.fn();
    render(<ArticleLikeCountFloat count={11} onComplete={onComplete} />);

    expect(screen.getByTestId("like-count-float")).toHaveTextContent("11");
    expect(document.querySelector(".animate-like-count-float")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(720);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("超过 99 显示 99+", () => {
    render(<ArticleLikeCountFloat count={120} onComplete={vi.fn()} />);
    expect(screen.getByTestId("like-count-float")).toHaveTextContent("99+");
  });
});
