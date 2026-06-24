// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMobileSheetMergedStyle } from "./use-mobile-sheet-merged-style";

const viewportState = vi.hoisted(() => ({
  bottomInset: 0,
  viewportHeight: 800,
}));

vi.mock("./use-visual-viewport-inset", () => ({
  useVisualViewportInset: () => ({
    bottomInset: viewportState.bottomInset,
    viewportHeight: viewportState.viewportHeight,
  }),
}));

describe("useMobileSheetMergedStyle", () => {
  beforeEach(() => {
    viewportState.bottomInset = 0;
    viewportState.viewportHeight = 800;
  });

  const baseInput = {
    entered: true,
    isOpen: true,
    sheetStyle: { transform: "translateY(0px)" },
    isDragging: false,
    isExpanded: false,
    expandOffset: 0,
  };

  it("无键盘时保持 70dvh 高度", () => {
    const { result } = renderHook(() => useMobileSheetMergedStyle(baseInput));
    expect(result.current.height).toBe("70dvh");
    expect(result.current.maxHeight).toBe("100dvh");
    expect(result.current.bottom).toBeUndefined();
  });

  it("expanded 状态使用全屏高度", () => {
    const { result } = renderHook(() =>
      useMobileSheetMergedStyle({ ...baseInput, isExpanded: true }),
    );
    expect(result.current.height).toBe("100dvh");
  });

  it("键盘弹出时上移 sheet 并限制 maxHeight", () => {
    viewportState.bottomInset = 320;
    viewportState.viewportHeight = 480;

    const { result } = renderHook(() => useMobileSheetMergedStyle(baseInput));

    expect(result.current.bottom).toBe(320);
    expect(result.current.maxHeight).toBe(480);
    expect(result.current.transform).toBe("translateY(0px)");
  });

  it("拖动中禁用 transition", () => {
    const { result } = renderHook(() =>
      useMobileSheetMergedStyle({
        ...baseInput,
        isDragging: true,
        expandOffset: 80,
        sheetStyle: { transform: "translateY(0px)" },
      }),
    );

    expect(result.current.height).toBe("calc(70dvh + 80px)");
    expect(result.current.transition).toBe("none");
  });
});
