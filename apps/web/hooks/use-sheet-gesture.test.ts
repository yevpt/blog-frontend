// @vitest-environment jsdom
/* global document, window, Document, DOMRect, HTMLElement, MouseEvent, TouchEventInit, Touch, TouchEvent */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSheetGesture } from "./use-sheet-gesture";

function makeEls() {
  const sheet = document.createElement("div");
  const scroll = document.createElement("div");
  document.body.appendChild(sheet);
  document.body.appendChild(scroll);
  Object.defineProperty(sheet, "offsetHeight", { value: 500, configurable: true });
  scroll.getBoundingClientRect = () =>
    ({
      top: 100,
      bottom: 500,
      left: 0,
      right: 320,
      width: 320,
      height: 400,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;
  return { sheet, scroll };
}

function cleanup(sheet: HTMLElement, scroll: HTMLElement) {
  sheet.remove();
  scroll.remove();
}

function fire(el: HTMLElement, type: string, clientY: number) {
  const isEnd = type === "touchend" || type === "touchcancel";
  const touchInit: TouchEventInit = {
    bubbles: true,
    cancelable: true,
    touches: isEnd ? [] : [{ clientX: 0, clientY, identifier: 1, target: el } as unknown as Touch],
    changedTouches: [{ clientX: 0, clientY, identifier: 1, target: el } as unknown as Touch],
  };
  el.dispatchEvent(new TouchEvent(type, touchInit));
}

function fireMouse(el: Document | HTMLElement, type: string, clientY: number) {
  el.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientY,
    }),
  );
}

describe("useSheetGesture", () => {
  let onDismiss: () => void;

  beforeEach(() => {
    onDismiss = vi.fn();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("初始状态：transform=translateY(0px)，isDragging=false", () => {
    const { sheet, scroll } = makeEls();
    const sheetRef = { current: sheet };
    const scrollRef = { current: scroll };

    const { result, unmount } = renderHook(() =>
      useSheetGesture(sheetRef as never, scrollRef as never, { onDismiss }),
    );

    expect(result.current.isDragging).toBe(false);
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("从顶部向下拖动 > 8px 进入 drag 模式，isDragging=true", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fire(sheet, "touchstart", 300);
      fire(sheet, "touchmove", 310); // 10px 向下，超过 8px 阈值
    });

    expect(result.current.isDragging).toBe(true);
    unmount();
    cleanup(sheet, scroll);
  });

  it("大位移松手触发 onDismiss（延迟 350ms）", () => {
    const { sheet, scroll } = makeEls();
    const { unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, {
        onDismiss,
        snapThreshold: 0.3,
      }),
    );

    act(() => {
      fire(sheet, "touchstart", 100);
      fire(sheet, "touchmove", 260); // 160px > 500×0.3=150px
      fire(sheet, "touchend", 260);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(420));
    expect(onDismiss).toHaveBeenCalledOnce();
    unmount();
    cleanup(sheet, scroll);
  });

  it("小位移松手弹回，translateY 回到 0", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fire(sheet, "touchstart", 100);
      fire(sheet, "touchmove", 120); // 20px 向下，不超阈值
      fire(sheet, "touchend", 120);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("顶部向上拖动时用展开高度跟手，sheet 不产生负 translateY", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fire(sheet, "touchstart", 80);
      fire(sheet, "touchmove", 0);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.expandOffset).toBe(80);
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("顶部持续上滑时 expandOffset 不受当前 sheet 高度变化影响", () => {
    const { sheet, scroll } = makeEls();
    Object.defineProperty(window, "innerHeight", { value: 760, configurable: true });
    let sheetHeight = 500;
    Object.defineProperty(sheet, "offsetHeight", {
      get: () => sheetHeight,
      configurable: true,
    });
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fire(sheet, "touchstart", 80);
      fire(sheet, "touchmove", -320);
    });
    expect(result.current.expandOffset).toBe(260);

    sheetHeight = 759;
    act(() => {
      fire(sheet, "touchmove", -320);
    });

    expect(result.current.expandOffset).toBe(260);
    unmount();
    cleanup(sheet, scroll);
  });

  it("顶部向上大位移松手后切换为 expanded", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fire(sheet, "touchstart", 80);
      fire(sheet, "touchmove", 0);
      fire(sheet, "touchend", 0);
    });

    expect(result.current.isExpanded).toBe(true);
    expect(result.current.expandOffset).toBe(0);
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("PC 窄屏鼠标从顶部上拖时也能展开", async () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    act(() => {
      fireMouse(sheet, "mousedown", 80);
      fireMouse(document, "mousemove", 0);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.expandOffset).toBe(80);

    await act(async () => {
      fireMouse(sheet, "mouseup", 0);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.expandOffset).toBe(0);
    unmount();
    cleanup(sheet, scroll);
  });

  it("外部调用 expand() 可直接切换为 expanded（无需手势）", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );

    expect(result.current.isExpanded).toBe(false);
    act(() => {
      result.current.expand();
    });
    expect(result.current.isExpanded).toBe(true);
    unmount();
    cleanup(sheet, scroll);
  });

  it("卸载时不报错（事件监听器已清理）", () => {
    const { sheet, scroll } = makeEls();
    const { unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );
    expect(() => unmount()).not.toThrow();
    cleanup(sheet, scroll);
  });
});
