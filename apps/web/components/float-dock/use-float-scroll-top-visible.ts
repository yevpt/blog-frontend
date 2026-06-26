"use client";

import { useEffect, useRef, useState } from "react";
import {
  FLOAT_SCROLL_TOP_HIDE_HYSTERESIS,
  FLOAT_SCROLL_TOP_MIN_UPWARD_PX,
  getFloatScrollTopThreshold,
} from "./float-dock-styles";

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
      const delta = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      if (delta > 0) {
        upwardAccumRef.current = 0;
        if (visibleRef.current) {
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
        window.innerHeight,
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
