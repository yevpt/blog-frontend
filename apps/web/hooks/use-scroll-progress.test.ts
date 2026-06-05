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
});
