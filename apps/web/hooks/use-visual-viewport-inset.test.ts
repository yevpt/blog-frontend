// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisualViewportInset } from "./use-visual-viewport-inset";

describe("useVisualViewportInset", () => {
  const originalVisualViewport = window.visualViewport;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalVisualViewport,
    });
  });

  it("无 visualViewport 时 bottomInset 为 0", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useVisualViewportInset());
    expect(result.current.bottomInset).toBe(0);
    expect(result.current.viewportHeight).toBe(800);
  });

  it("键盘弹出时计算 bottomInset 与 viewportHeight", () => {
    const listeners = new Map<string, () => void>();
    const viewport = {
      height: 420,
      offsetTop: 0,
      addEventListener: vi.fn((type: string, handler: () => void) => {
        listeners.set(type, handler);
      }),
      removeEventListener: vi.fn((type: string) => {
        listeners.delete(type);
      }),
    };

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const { result } = renderHook(() => useVisualViewportInset());

    expect(result.current.bottomInset).toBe(380);
    expect(result.current.viewportHeight).toBe(420);

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.assign(viewport, { height: 500, offsetTop: 40 });

    act(() => {
      listeners.get("resize")?.();
    });

    expect(result.current.bottomInset).toBe(260);
    expect(result.current.viewportHeight).toBe(500);
  });
});
