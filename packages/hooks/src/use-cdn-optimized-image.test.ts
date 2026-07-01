// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCdnOptimizedImage } from "./use-cdn-optimized-image";

const OPTIMIZABLE = "https://blog-oss.yevpt.com/blog/a.jpg?sign=1&t=2";

describe("useCdnOptimizedImage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("可优化图默认走 CDN src", () => {
    const { result } = renderHook(() => useCdnOptimizedImage(OPTIMIZABLE, "thumbnail"));
    expect(result.current.displaySrc).toContain("w=112");
    expect(result.current.isLoading).toBe(true);
  });

  it("非白名单地址保持原图", () => {
    const original = "https://example.com/a.jpg";
    const { result } = renderHook(() => useCdnOptimizedImage(original, "article"));
    expect(result.current.displaySrc).toBe(original);
  });

  it("enabled=false 时仍输出 CDN src，避免首帧挂载原图 URL", () => {
    const { result } = renderHook(() =>
      useCdnOptimizedImage(OPTIMIZABLE, "article", {
        enabled: false,
        mode: "fixed",
        displayWidth: 828,
      }),
    );
    expect(result.current.displaySrc).toContain("w=828");
    expect(result.current.displaySrc).not.toBe(OPTIMIZABLE);
  });

  it("重试耗尽后回退原图", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCdnOptimizedImage(OPTIMIZABLE, "thumbnail"));

    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });

    expect(result.current.displaySrc).toBe(OPTIMIZABLE);
    expect(result.current.isLoading).toBe(true);
  });

  it("onLoad 后 onError 不触发回退", () => {
    const { result } = renderHook(() => useCdnOptimizedImage(OPTIMIZABLE, "thumbnail"));

    act(() => {
      result.current.onLoad();
    });
    act(() => {
      result.current.onError();
    });

    expect(result.current.displaySrc).toContain("w=112");
    expect(result.current.isLoading).toBe(false);
  });

  it("fallbackToOriginal=false 时重试耗尽后保持 CDN URL 并标记 error", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useCdnOptimizedImage(OPTIMIZABLE, "thumbnail", { fallbackToOriginal: false }),
    );

    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.onError();
    });

    expect(result.current.displaySrc).toContain("w=112");
    expect(result.current.displaySrc).not.toBe(OPTIMIZABLE);
    expect(result.current.isError).toBe(true);
  });

  it("onLoad 后忽略 onError", () => {
    const { result } = renderHook(() => useCdnOptimizedImage(OPTIMIZABLE, "thumbnail"));
    act(() => {
      result.current.onLoad();
    });
    act(() => {
      result.current.onError();
    });
    expect(result.current.isLoading).toBe(false);
  });
});
