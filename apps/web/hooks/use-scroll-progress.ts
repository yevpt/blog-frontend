"use client";

/* global window, document, HTMLElement */
import { useState, useEffect } from "react";
import type { RefObject } from "react";

export function useScrollProgress(targetRef?: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = targetRef?.current;
      if (el) {
        const scrollable = el.offsetHeight - window.innerHeight;
        if (scrollable <= 0) {
          setProgress(1);
          return;
        }
        setProgress(Math.min(1, Math.max(0, (window.scrollY - el.offsetTop) / scrollable)));
      } else {
        const scrollable =
          document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (scrollable <= 0) {
          setProgress(0);
          return;
        }
        setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)));
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [targetRef]);

  return progress;
}
