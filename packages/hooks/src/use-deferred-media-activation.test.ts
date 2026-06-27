import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  resetDeferredMediaActivationForTests,
  scheduleAfterPageReady,
  useDeferredMediaActivation,
} from "./use-deferred-media-activation";

describe("scheduleAfterPageReady", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
        return 1;
      }),
    );
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "complete",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("idle 后执行回调", () => {
    const callback = vi.fn();
    scheduleAfterPageReady(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("useDeferredMediaActivation", () => {
  let idleCallback: IdleRequestCallback | null = null;

  beforeEach(() => {
    resetDeferredMediaActivationForTests();
    idleCallback = null;
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: IdleRequestCallback) => {
        idleCallback = cb;
        return 1;
      }),
    );
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "complete",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始为 false，页面就绪后变为 true", () => {
    const { result } = renderHook(() => useDeferredMediaActivation());
    expect(result.current).toBe(false);
    act(() => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    });
    expect(result.current).toBe(true);
  });

  it("页面就绪后 remount 时首帧即为 true，跳过重走 defer", () => {
    const { unmount } = renderHook(() => useDeferredMediaActivation());
    act(() => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    });
    unmount();

    const { result: remounted } = renderHook(() => useDeferredMediaActivation());
    expect(remounted.current).toBe(true);
  });
});
