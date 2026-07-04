"use client";

import { useEffect, useRef, useState } from "react";
import {
  FLOAT_SCROLL_TOP_FAST_DOWN_PX,
  FLOAT_SCROLL_TOP_HIDE_HYSTERESIS,
  FLOAT_SCROLL_TOP_MIN_UPWARD_PX,
  FLOAT_SCROLL_TOP_NEAR_BOTTOM_RATIO,
  getFloatScrollTopThreshold,
} from "./float-dock-styles";

/**
 * 判断当前是否处于「接近底部」区域。
 * 距底部不足一屏时，无论滚动方向都应显示回顶钮。
 */
export function isNearBottom(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
): boolean {
  const distanceToBottom = scrollHeight - (scrollY + viewportHeight);
  return distanceToBottom < viewportHeight * FLOAT_SCROLL_TOP_NEAR_BOTTOM_RATIO;
}

/** 纯函数：结合滚动位置、上滑累计量与滞回判定是否显示回顶钮 */
export function resolveScrollTopVisible(
  scrollY: number,
  viewportHeight: number,
  currentlyVisible: boolean,
  upwardAccum: number,
): boolean {
  const threshold = getFloatScrollTopThreshold(viewportHeight);
  const hideLine = threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS;

  if (scrollY <= hideLine) return false;

  if (currentlyVisible) {
    return scrollY > hideLine;
  }

  return scrollY > threshold && upwardAccum >= FLOAT_SCROLL_TOP_MIN_UPWARD_PX;
}

export function useFloatScrollTopVisible(): boolean {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const upwardAccumRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollHeight = document.body.scrollHeight;
      const delta = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      // 接近底部时强制显示，不受滚动方向影响
      if (isNearBottom(scrollY, viewportHeight, scrollHeight)) {
        if (!visibleRef.current) {
          visibleRef.current = true;
          setVisible(true);
        }
        return;
      }

      if (delta > 0) {
        // 向下滚动：仅快速下滑（单次 delta 超阈值）才隐藏
        upwardAccumRef.current = 0;
        if (visibleRef.current && delta >= FLOAT_SCROLL_TOP_FAST_DOWN_PX) {
          visibleRef.current = false;
          setVisible(false);
        }
        return;
      }

      if (delta < 0) {
        upwardAccumRef.current += -delta;
      }

      const next = resolveScrollTopVisible(
        scrollY,
        viewportHeight,
        visibleRef.current,
        upwardAccumRef.current,
      );
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };

    lastScrollYRef.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
