import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { BfcacheRecovery } from "./bfcache-recovery";

// jsdom 下 window.location 不可直接赋值，stub 掉 reload 以断言调用。
const reloadSpy = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  reloadSpy.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: reloadSpy },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

function firePageShow(persisted: boolean) {
  const event = new Event("pageshow") as PageTransitionEvent;
  Object.defineProperty(event, "persisted", { value: persisted });
  window.dispatchEvent(event);
}

describe("BfcacheRecovery", () => {
  it("从 bfcache 恢复（persisted=true）时整页刷新", () => {
    render(<BfcacheRecovery />);

    firePageShow(true);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("普通 pageshow（persisted=false）不刷新", () => {
    render(<BfcacheRecovery />);

    firePageShow(false);

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("卸载后移除监听，不再触发刷新", () => {
    const { unmount } = render(<BfcacheRecovery />);

    unmount();
    firePageShow(true);

    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
