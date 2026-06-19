import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { clamp, useViewerTransform } from "./use-viewer-transform";

describe("clamp", () => {
  it("钳制到上下界", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-2, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe("useViewerTransform", () => {
  it("初始为单位变换", () => {
    const { result } = renderHook(() => useViewerTransform());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });

  it("zoomIn 放大，zoomOut 不低于最小值 1", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.zoomIn());
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => {
      result.current.zoomOut();
      result.current.zoomOut();
      result.current.zoomOut();
    });
    expect(result.current.transform.scale).toBe(1);
  });

  it("zoomIn 不超过最大值 5", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomIn();
    });
    expect(result.current.transform.scale).toBeLessThanOrEqual(5);
  });

  it("rotate 以 90° 步进并在 360 处归零", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.rotate());
    expect(result.current.transform.rotation).toBe(90);
    act(() => {
      result.current.rotate();
      result.current.rotate();
      result.current.rotate();
    });
    expect(result.current.transform.rotation).toBe(0);
  });

  it("双击在放大与还原间切换", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.handlers.onDoubleClick());
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => result.current.handlers.onDoubleClick());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });

  it("滚轮向上放大、向下缩小且不破下界", () => {
    const { result } = renderHook(() => useViewerTransform());
    const wheel = (deltaY: number) =>
      ({ deltaY, preventDefault: () => {} }) as unknown as React.WheelEvent;
    act(() => result.current.handlers.onWheel(wheel(-200)));
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => result.current.handlers.onWheel(wheel(2000)));
    expect(result.current.transform.scale).toBe(1);
  });

  it("reset 还原所有变换", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => {
      result.current.zoomIn();
      result.current.rotate();
    });
    act(() => result.current.reset());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });
});
