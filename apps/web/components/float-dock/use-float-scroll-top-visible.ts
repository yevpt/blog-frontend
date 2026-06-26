"use client";

import { useEffect, useState } from "react";
import { getFloatScrollTopThreshold } from "./float-dock-styles";

export function useFloatScrollTopVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setVisible(window.scrollY > getFloatScrollTopThreshold(window.innerHeight));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
