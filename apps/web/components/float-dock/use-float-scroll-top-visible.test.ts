// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { FLOAT_SCROLL_TOP_HIDE_HYSTERESIS, getFloatScrollTopThreshold } from "./float-dock-styles";
import { useFloatScrollTopVisible } from "./use-float-scroll-top-visible";

describe("useFloatScrollTopVisible", () => {
  const originalInnerHeight = window.innerHeight;
  const originalScrollY = window.scrollY;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: originalScrollY,
    });
  });

  it("滚动超过阈值后显示回顶钮", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        writable: true,
        value: threshold + 1,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(true);
  });

  it("阈值附近使用滞回，避免快速上下滚动时闪烁", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    act(() => {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        writable: true,
        value: threshold + 1,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        writable: true,
        value: threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS + 1,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        writable: true,
        value: threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
  });
});
