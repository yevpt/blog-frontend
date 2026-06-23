import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncedElementHeight } from "./use-synced-element-height";

describe("useSyncedElementHeight", () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        height: 240,
        width: 320,
        top: 0,
        left: 0,
        right: 320,
        bottom: 240,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it("禁用时不上报高度", () => {
    const { result } = renderHook(() => useSyncedElementHeight(false));

    act(() => {
      result.current.ref(element);
    });

    expect(result.current.height).toBeUndefined();
  });

  it("启用后读取源元素高度", () => {
    const { result } = renderHook(() => useSyncedElementHeight(true));

    act(() => {
      result.current.ref(element);
    });

    expect(result.current.height).toBe(240);
  });
});
