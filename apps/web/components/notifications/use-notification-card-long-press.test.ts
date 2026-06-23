import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationCardLongPress } from "./use-notification-card-long-press";

function touchPointerDown(
  handler:
    | ReturnType<typeof useNotificationCardLongPress>["longPressProps"]["onPointerDown"]
    | undefined,
  target: HTMLElement = document.createElement("div"),
) {
  handler?.({
    pointerType: "touch",
    currentTarget: target,
  } as React.PointerEvent<HTMLElement>);
  return target;
}

describe("useNotificationCardLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("触摸长按达到阈值后触发 onLongPress", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useNotificationCardLongPress({ onLongPress, thresholdMs: 400 }),
    );

    act(() => {
      touchPointerDown(result.current.longPressProps.onPointerDown);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.consumeLongPressClick()).toBe(true);
  });

  it("鼠标指针不触发长按", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useNotificationCardLongPress({ onLongPress }));

    act(() => {
      result.current.longPressProps.onPointerDown?.({
        pointerType: "mouse",
      } as React.PointerEvent<HTMLElement>);
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("抬手前未达到阈值不触发", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useNotificationCardLongPress({ onLongPress }));

    act(() => {
      touchPointerDown(result.current.longPressProps.onPointerDown);
      vi.advanceTimersByTime(200);
      result.current.longPressProps.onPointerUp?.({} as React.PointerEvent<HTMLElement>);
      vi.advanceTimersByTime(300);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("disabled 时不触发", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useNotificationCardLongPress({ onLongPress, disabled: true }),
    );

    act(() => {
      result.current.longPressProps.onPointerDown?.({
        pointerType: "touch",
      } as React.PointerEvent<HTMLElement>);
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("触摸按压期间阻止 selectstart", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useNotificationCardLongPress({ onLongPress }));
    const element = document.createElement("div");

    act(() => {
      touchPointerDown(result.current.longPressProps.onPointerDown, element);
    });

    const event = new Event("selectstart", { bubbles: true, cancelable: true });
    element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("长按触发时清除已有文字选区", () => {
    const onLongPress = vi.fn();
    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      removeAllRanges,
    } as unknown as Selection);

    const { result } = renderHook(() => useNotificationCardLongPress({ onLongPress }));

    act(() => {
      touchPointerDown(result.current.longPressProps.onPointerDown);
      vi.advanceTimersByTime(500);
    });

    expect(removeAllRanges).toHaveBeenCalled();
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
