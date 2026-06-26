// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFloatDockPosition } from "./use-float-dock-position";
import { ARTICLE_FLOAT_DOCK_LAYOUT } from "@/lib/float-dock-layouts";

describe("useFloatDockPosition", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("宽屏文章布局无目录时返回 left", () => {
    const { result } = renderHook(() =>
      useFloatDockPosition({
        variant: "page-column",
        layout: ARTICLE_FLOAT_DOCK_LAYOUT,
        hasSidebar: false,
      }),
    );
    expect(result.current.left).toBe(1180);
    expect(result.current.bottom).toBe(24);
  });

  it("resize 后随 hasSidebar 更新", () => {
    const { result, rerender } = renderHook(
      ({ hasSidebar }) =>
        useFloatDockPosition({
          variant: "page-column",
          layout: ARTICLE_FLOAT_DOCK_LAYOUT,
          hasSidebar,
        }),
      { initialProps: { hasSidebar: false } },
    );

    expect(result.current.left).toBe(1180);

    rerender({ hasSidebar: true });
    expect(result.current.left).toBe(1294);

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 800,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.left).toBeNull();
  });

  it("viewport 变体始终为 null", () => {
    const { result } = renderHook(() => useFloatDockPosition({ variant: "viewport" }));
    expect(result.current.left).toBeNull();
  });
});
