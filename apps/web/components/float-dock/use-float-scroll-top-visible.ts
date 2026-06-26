"use client";

import { useEffect, useRef, useState } from "react";
import { FLOAT_SCROLL_TOP_HIDE_HYSTERESIS, getFloatScrollTopThreshold } from "./float-dock-styles";

function resolveScrollTopVisible(
  scrollY: number,
  viewportHeight: number,
  currentlyVisible: boolean,
): boolean {
  const threshold = getFloatScrollTopThreshold(viewportHeight);
  if (currentlyVisible) {
    return scrollY > threshold - FLOAT_SCROLL_TOP_HIDE_HYSTERESIS;
  }
  return scrollY > threshold;
}

export function useFloatScrollTopVisible(): boolean {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const next = resolveScrollTopVisible(window.scrollY, window.innerHeight, visibleRef.current);
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
