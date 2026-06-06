/* global window, document */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollProgress } from "./use-scroll-progress";

describe("useScrollProgress", () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  });

  it("初始值为 0", () => {
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(0);
  });

  it("滚动到一半时返回约 0.5", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 400, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeCloseTo(0.5, 1);
  });

  it("值始终在 0~1 之间", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 99999, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeLessThanOrEqual(1);
    expect(result.current).toBeGreaterThanOrEqual(0);
  });

  it("传入 ref 时仅追踪目标元素范围", () => {
    const el = document.createElement("article");
    document.body.appendChild(el);
    // 元素从 200px 开始，高 1000px；视口高 200px → 可滚动 800px
    Object.defineProperty(el, "offsetTop", { configurable: true, value: 200 });
    Object.defineProperty(el, "offsetHeight", { configurable: true, value: 1000 });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 200,
    });

    const ref = { current: el };
    const { result } = renderHook(() => useScrollProgress(ref));

    // scrollY=200 时正好到文章顶部 → 进度 0
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 200, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeCloseTo(0, 1);

    // scrollY=600 时到文章中间 → 进度 0.5
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 600, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeCloseTo(0.5, 1);

    document.body.removeChild(el);
  });
});
