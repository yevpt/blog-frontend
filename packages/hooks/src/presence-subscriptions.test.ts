import { afterEach, describe, expect, it, vi } from "vitest";

import { getSubscribedIds, onSubscriptionChange, subscribe } from "./presence-subscriptions";

afterEach(() => {
  // 模块级单例：把当前所有订阅再清空一次，避免状态泄漏到下一个测试。
  const ids = getSubscribedIds();
  if (ids.length > 0) {
    subscribe(ids)();
  }
});

describe("presence-subscriptions", () => {
  it("按订阅顺序排列", () => {
    subscribe([1, 2, 3]);
    subscribe([4, 5]);
    expect(getSubscribedIds()).toEqual([1, 2, 3, 4, 5]);
  });

  it("重订阅同一 id 会移到队尾(LRU)", () => {
    subscribe([1, 2, 3]);
    subscribe([1]);
    expect(getSubscribedIds()).toEqual([2, 3, 1]);
  });

  it("硬上限 100:连续订阅 101 个不同 id 后淘汰最早那条", () => {
    for (let i = 1; i <= 101; i++) {
      subscribe([i]);
    }
    const ids = getSubscribedIds();
    expect(ids).toHaveLength(100);
    expect(ids).not.toContain(1);
    expect(ids[0]).toBe(2);
    expect(ids[ids.length - 1]).toBe(101);
  });

  it("cleanup 删除对应 id;重复删除不存在的 id 静默忽略", () => {
    const unsub = subscribe([1, 2]);
    unsub();
    expect(getSubscribedIds()).toEqual([]);
    expect(() => unsub()).not.toThrow();
  });

  it("订阅集真变化时触发 onSubscriptionChange(cleanup 也触发)", () => {
    const cb = vi.fn();
    const unsubListener = onSubscriptionChange(cb);

    const unsub = subscribe([1]);
    expect(cb).toHaveBeenCalledWith([1]);

    unsub();
    expect(cb).toHaveBeenCalledWith([]);

    unsubListener();
  });
});
