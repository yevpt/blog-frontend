// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  FLOAT_SCROLL_TOP_FAST_DOWN_PX,
  FLOAT_SCROLL_TOP_HIDE_HYSTERESIS,
  FLOAT_SCROLL_TOP_MIN_UPWARD_PX,
  FLOAT_SCROLL_TOP_NEAR_BOTTOM_RATIO,
  getFloatScrollTopThreshold,
} from "./float-dock-styles";
import {
  isNearBottom,
  resolveScrollTopVisible,
  useFloatScrollTopVisible,
} from "./use-float-scroll-top-visible";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value,
  });
}

function setScrollHeight(value: number) {
  Object.defineProperty(document.body, "scrollHeight", {
    configurable: true,
    writable: true,
    value,
  });
}

function dispatchScroll() {
  window.dispatchEvent(new Event("scroll"));
}

describe("isNearBottom", () => {
  const viewportHeight = 900;

  it("距底部不足一屏时返回 true", () => {
    const scrollHeight = 5000;
    // 距底 = scrollHeight - (scrollY + vh) = 5000 - (4200 + 900) = -100 < vh
    expect(isNearBottom(4200, viewportHeight, scrollHeight)).toBe(true);
  });

  it("距底部恰好等于一屏时返回 false", () => {
    const scrollHeight = 5000;
    // 距底 = 5000 - (3200 + 900) = 900 = vh * 1，不满足 < 条件
    expect(isNearBottom(3200, viewportHeight, scrollHeight)).toBe(false);
  });

  it("距底部超过一屏时返回 false", () => {
    const scrollHeight = 5000;
    expect(isNearBottom(1000, viewportHeight, scrollHeight)).toBe(false);
  });
});

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
  const VIEWPORT = 900;
  const SCROLL_HEIGHT = 10000;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: VIEWPORT,
    });
    setScrollY(0);
    setScrollHeight(SCROLL_HEIGHT);
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
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    expect(result.current).toBe(false);

    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
    });

    expect(result.current).toBe(false);
  });

  it("超过阈值后向上滚够距离才显示回顶钮", () => {
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
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
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
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

  it("已显示时快速下滑（单次 delta >= 阈值）立即隐藏", () => {
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    // 先显示
    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    // 快速下滑
    act(() => {
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX + FLOAT_SCROLL_TOP_FAST_DOWN_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(false);
  });

  it("已显示时缓慢下滑（单次 delta < 阈值）不隐藏", () => {
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    // 先显示
    act(() => {
      setScrollY(threshold + 200);
      dispatchScroll();
      setScrollY(threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    // 缓慢下滑（delta < FAST_DOWN_PX）
    act(() => {
      setScrollY(
        threshold + 200 - FLOAT_SCROLL_TOP_MIN_UPWARD_PX + FLOAT_SCROLL_TOP_FAST_DOWN_PX - 1,
      );
      dispatchScroll();
    });
    expect(result.current).toBe(true);
  });

  it("阈值附近使用滞回，避免快速上下滚动时闪烁", () => {
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
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

  it("接近底部时强制显示，即使在向下滚动", () => {
    const { result } = renderHook(() => useFloatScrollTopVisible());

    // 距底部不足一屏：scrollY + vh + nearBottomZone > scrollHeight
    // nearBottom = scrollHeight - (scrollY + vh) < vh * ratio
    // => scrollY > scrollHeight - vh * (1 + ratio) = 10000 - 900 * 2 = 8200
    const nearBottomScrollY =
      SCROLL_HEIGHT - VIEWPORT * (1 + FLOAT_SCROLL_TOP_NEAR_BOTTOM_RATIO) + 1;

    act(() => {
      setScrollY(nearBottomScrollY);
      dispatchScroll();
    });
    expect(result.current).toBe(true);
  });

  it("离开底部区域后恢复正常逻辑", () => {
    const threshold = getFloatScrollTopThreshold(VIEWPORT);
    const { result } = renderHook(() => useFloatScrollTopVisible());

    // 进入底部区域
    const nearBottomScrollY =
      SCROLL_HEIGHT - VIEWPORT * (1 + FLOAT_SCROLL_TOP_NEAR_BOTTOM_RATIO) + 1;
    act(() => {
      setScrollY(nearBottomScrollY);
      dispatchScroll();
    });
    expect(result.current).toBe(true);

    // 快速上划回到非底部区域，且位置高于 threshold，应当隐藏
    act(() => {
      setScrollY(threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS);
      dispatchScroll();
    });
    expect(result.current).toBe(false);
  });
});
