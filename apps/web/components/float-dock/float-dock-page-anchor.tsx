"use client";

import type { FloatDockColumnLayout } from "@/lib/float-dock-position";
import { useFloatDockConfig } from "./float-dock-provider";
import type { FloatDockPosition } from "./types";

interface FloatDockPageAnchorProps {
  layout: FloatDockColumnLayout;
  hasSidebar?: boolean;
  enabled?: boolean;
}

/** 页面级定位锚点：将 Dock 对齐到该页主栏右侧留白 */
export function FloatDockPageAnchor({
  layout,
  hasSidebar = false,
  enabled = true,
}: FloatDockPageAnchorProps) {
  const position: FloatDockPosition = {
    variant: "page-column",
    layout,
    hasSidebar,
  };

  useFloatDockConfig({ enabled, position });
  return null;
}
