import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  IMAGE_PLACEHOLDER_DELAY_MS,
  IMAGE_PLACEHOLDER_FADE_MS,
  useImageLoadPlaceholder,
} from "./use-image-load-placeholder";

describe("useImageLoadPlaceholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("加载很快时不显示占位且不启用图片过渡", () => {
    const { result, rerender } = renderHook(({ pending }) => useImageLoadPlaceholder(pending), {
      initialProps: { pending: true },
    });

    expect(result.current.renderPlaceholder).toBe(false);
    expect(result.current.hideImage).toBe(false);

    rerender({ pending: false });

    expect(result.current.renderPlaceholder).toBe(false);
    expect(result.current.animateImage).toBe(false);
  });

  it("加载较慢时延迟显示占位并隐藏图片", () => {
    const { result } = renderHook(() => useImageLoadPlaceholder(true));

    act(() => {
      vi.advanceTimersByTime(IMAGE_PLACEHOLDER_DELAY_MS);
    });

    expect(result.current.renderPlaceholder).toBe(true);
    expect(result.current.placeholderOpaque).toBe(true);
    expect(result.current.hideImage).toBe(true);
    expect(result.current.animateImage).toBe(true);
  });

  it("加载完成后占位淡出", () => {
    const { result, rerender } = renderHook(({ pending }) => useImageLoadPlaceholder(pending), {
      initialProps: { pending: true },
    });

    act(() => {
      vi.advanceTimersByTime(IMAGE_PLACEHOLDER_DELAY_MS);
    });
    rerender({ pending: false });

    expect(result.current.placeholderOpaque).toBe(false);
    expect(result.current.renderPlaceholder).toBe(true);

    act(() => {
      vi.advanceTimersByTime(IMAGE_PLACEHOLDER_FADE_MS);
    });

    expect(result.current.renderPlaceholder).toBe(false);
  });
});
