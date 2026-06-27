import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type PresenceRecord, usePresenceStore } from "./presence-store";
import { subscribe } from "./presence-subscriptions";
import { type UsePresenceResult, usePresence } from "./use-presence";

vi.mock("./presence-subscriptions", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

beforeEach(() => {
  usePresenceStore.setState({ records: new Map() });
  vi.mocked(subscribe).mockClear();
});

afterEach(() => {
  // store 是模块级单例：必须先卸载组件，否则上一测试残留的订阅会在下一测试
  // reset store 时重新渲染，用旧的 inline seed 对象把状态写回去，污染下一测试。
  cleanup();
});

describe("usePresence", () => {
  it("id 为 null 时不订阅,record 为 undefined", () => {
    const { result } = renderHook(() => usePresence(null));
    expect(subscribe).not.toHaveBeenCalled();
    expect(result.current.record).toBeUndefined();
  });

  it("id 存在时订阅一次,卸载时取消订阅", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribe).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => usePresence(42));
    expect(subscribe).toHaveBeenCalledWith([42]);
    expect(subscribe).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("seed 写入 store,返回的 record 反映 store 内容", () => {
    const { result } = renderHook(() => usePresence(1, { is_online: true, last_active_at: 100 }));
    expect(result.current.record).toEqual({ is_online: true, last_active_at: 100 });
  });

  it("seed 不会覆盖 apply 写入的最新值(幂等)", () => {
    const { result, rerender } = renderHook<UsePresenceResult, { seed: PresenceRecord }>(
      ({ seed }) => usePresence(1, seed),
      { initialProps: { seed: { is_online: false } } },
    );
    expect(result.current.record).toEqual({ is_online: false });

    act(() => {
      usePresenceStore.getState().apply({ 1: { is_online: true, last_active_at: 200 } });
    });
    expect(result.current.record).toEqual({ is_online: true, last_active_at: 200 });

    // 再传入不同的 seed 重渲染：store 已有记录，seed 应保持幂等不覆盖
    rerender({ seed: { is_online: false, last_active_at: 999 } });
    expect(result.current.record).toEqual({ is_online: true, last_active_at: 200 });
  });
});
