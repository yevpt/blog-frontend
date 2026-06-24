"use client";

import type { CSSProperties } from "react";
import { useVisualViewportInset } from "./use-visual-viewport-inset";

const SPRING = "0.4s cubic-bezier(.32,.72,0,1)";
const COLLAPSED_HEIGHT = "70dvh";
const EXPANDED_HEIGHT = "100dvh";

interface MobileSheetMergedStyleInput {
  entered: boolean;
  isOpen: boolean;
  sheetStyle: CSSProperties;
  isDragging: boolean;
  isExpanded: boolean;
  expandOffset: number;
}

/** 合并手势位移、入场动画与软键盘 inset，供移动端 bottom sheet 使用 */
export function useMobileSheetMergedStyle({
  entered,
  isOpen,
  sheetStyle,
  isDragging,
  isExpanded,
  expandOffset,
}: MobileSheetMergedStyleInput): CSSProperties {
  const { bottomInset, viewportHeight } = useVisualViewportInset();

  const activeHeight =
    expandOffset > 0
      ? `calc(${COLLAPSED_HEIGHT} + ${Math.round(expandOffset)}px)`
      : isExpanded
        ? EXPANDED_HEIGHT
        : COLLAPSED_HEIGHT;

  // 键盘弹出时用 bottom 上移 sheet，maxHeight 限制在可视区内；与手势 translateY 分层不冲突
  const keyboardStyle: CSSProperties =
    bottomInset > 0 ? { bottom: bottomInset, maxHeight: viewportHeight } : {};

  if (!entered) {
    return {
      ...keyboardStyle,
      transform: "translateY(100%)",
      height: COLLAPSED_HEIGHT,
      maxHeight: bottomInset > 0 ? viewportHeight : EXPANDED_HEIGHT,
      transition: `transform ${SPRING}`,
    };
  }

  return {
    ...keyboardStyle,
    transform: sheetStyle.transform,
    height: activeHeight,
    maxHeight: bottomInset > 0 ? viewportHeight : EXPANDED_HEIGHT,
    transition: isDragging ? "none" : `transform ${SPRING}, height ${SPRING}`,
    animation: !isOpen && sheetStyle.transform !== "translateY(0px)" ? "none" : undefined,
  };
}
