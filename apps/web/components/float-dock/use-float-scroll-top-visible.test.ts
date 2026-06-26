// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  FLOAT_SCROLL_TOP_HIDE_HYSTERESIS,
  FLOAT_SCROLL_TOP_MIN_UPWARD_PX,
  getFloatScrollTopThreshold,
} from "./float-dock-styles";
import { resolveScrollTopVisible, useFloatScrollTopVisible } from "./use-float-scroll-top-visible";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value,
  });
}

function dispatchScroll() {
  window.dispatchEvent(new Event("scroll"));
}

describe("resolveScrollTopVisible", () => {
  const viewportHeight = 900;
  const threshold = getFloatScrollTopThreshold(viewportHeight);

  it("仅超过阈值但上滑不足时不显示", () => {
    expect(resolveScrollTopVisible(threshold + 1, viewportHeight, false, 0)).toBe(false);
    expect(
      resolveScrollTopVisible(
        threshold + 1,
        viewportHeight,
        false,
        FLOAT_SCROLL_TOP_MIN_UPWARD_PX - 1,
      ),
    ).toBe(false);
  });

  it("超过阈值且上滑累计足够时显示", () => {
    expect(
      resolveScrollTopVisible(threshold + 1, viewportHeight, false, FLOAT_SCROLL_TOP_MIN_UPWARD_PX),
    ).toBe(true);
  });

  it("已显示时在滞回线以上保持可见", () => {
    const hideLine = threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS;
    expect(resolveScrollTopVisible(hideLine + 1, viewportHeight, true, 0)).toBe(true);
    expect(resolveScrollTopVisible(hideLine, viewportHeight, true, 0)).toBe(false);
  });
});

describe("useFloatScrollTopVisible", () => {
  const originalInnerHeight = window.innerHeight;
  const originalScrollY = window.scrollY;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });
    setScrollY(0);
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    setScrollY(originalScrollY);
  });

  it("向下滚过阈值后不显示回顶钮", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    expect(result.current).toBe(false);

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
    });

    expect(result.current).toBe(false);
  });

  it("超过阈值后向上滚够距离才显示回顶钮", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
    });
    expect(result.current).toBe(false);

    act(() => {
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(true);
  });

  it("轻微上滑不显示，避免误触", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
    });

    act(() => {
      setScrollY(threshold + 200 - (FLOAT_SCROLL_TOP_MIN_UPWARD_PX - 20));
      dispatchScroll();
    });
    expect(result.current).toBe(false);
  });

  it("显示后向下滑动立即隐藏", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    act(() => {
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX + 10);
      dispatchScroll();
    });
    expect(result.current).toBe(false);
  });

  it("阈值附近使用滞回，避免快速上下滚动时闪烁", () => {
    const threshold = getFloatScrollTopThreshold(900);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    act(() => {
      setScrollY(threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS + 1);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    act(() => {
      setScrollY(threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS);
      dispatchScroll();
    });
    expect(result.current).toBe(false);
  });
});
