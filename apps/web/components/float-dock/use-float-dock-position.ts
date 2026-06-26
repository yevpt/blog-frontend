"use client";

import { useEffect, useState } from "react";
import { computeFloatDockLeft, FLOAT_DOCK_POSITION } from "@/lib/float-dock-position";
import type { FloatDockPosition } from "./types";

function readFloatLeft(position: FloatDockPosition): number | null {
  if (typeof window === "undefined" || position.variant === "viewport") return null;
  return computeFloatDockLeft(window.innerWidth, position.layout, position.hasSidebar ?? false);
}

/** 随视口与页面布局预设计算浮动 Dock 水平位置 */
export function useFloatDockPosition(position: FloatDockPosition) {
  // 首帧固定 null，与 SSR 一致；实际位置在 effect 中读取，避免 hydration 不一致
  const [left, setLeft] = useState<number | null>(null);

  const positionKey =
    position.variant === "viewport"
      ? "viewport"
      : `${position.layout.pageMaxWidth}:${position.layout.pagePaddingX}:${position.layout.contentMaxWidth}:${position.hasSidebar ?? false}`;

  useEffect(() => {
    const onResize = () => setLeft(readFloatLeft(position));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, positionKey]);

  return {
    left,
    bottom: FLOAT_DOCK_POSITION.floatBottom,
  };
}
