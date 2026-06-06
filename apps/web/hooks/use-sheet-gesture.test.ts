// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSheetGesture } from "./use-sheet-gesture";

function makeEls() {
  const sheet = document.createElement("div");
  const scroll = document.createElement("div");
  document.body.appendChild(sheet);
  document.body.appendChild(scroll);
  Object.defineProperty(sheet, "offsetHeight", { value: 500, configurable: true });
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
      useSheetGesture(
        { current: sheet } as never,
        { current: scroll } as never,
        { onDismiss, snapThreshold: 0.3 },
      ),
    );

    act(() => {
      fire(sheet, "touchstart", 100);
      fire(sheet, "touchmove", 260); // 160px > 500×0.3=150px
      fire(sheet, "touchend", 260);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
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

  it("卸载时不报错（事件监听器已清理）", () => {
    const { sheet, scroll } = makeEls();
    const { unmount } = renderHook(() =>
      useSheetGesture({ current: sheet } as never, { current: scroll } as never, { onDismiss }),
    );
    expect(() => unmount()).not.toThrow();
    cleanup(sheet, scroll);
  });
});
