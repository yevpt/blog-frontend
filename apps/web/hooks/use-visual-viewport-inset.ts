// apps/web/hooks/use-visual-viewport-inset.ts
/* global window */
"use client";

import { useEffect, useState } from "react";

interface VisualViewportInset {
  /** 软键盘占用的高度（px），无键盘时为 0 */
  bottomInset: number;
  /** 当前可视视口高度（px） */
  viewportHeight: number;
}

function readVisualViewportInset(): VisualViewportInset {
  if (typeof window === "undefined") {
    return { bottomInset: 0, viewportHeight: 0 };
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return { bottomInset: 0, viewportHeight: window.innerHeight };
  }

  const bottomInset = Math.max(
    0,
    Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
  );
  return {
    bottomInset,
    viewportHeight: Math.round(viewport.height),
  };
}

/** 监听 visualViewport，返回 iOS 软键盘等导致的底部 inset */
export function useVisualViewportInset(): VisualViewportInset {
  const [inset, setInset] = useState(readVisualViewportInset);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setInset(readVisualViewportInset());

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return inset;
}
