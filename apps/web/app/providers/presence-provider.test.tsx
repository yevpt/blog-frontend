import { act, cleanup, render } from "@testing-library/react";
import { getSubscribedIds, subscribe, usePresenceStore } from "@repo/hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PresenceProvider } from "./presence-provider";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  usePresenceStore.setState({ records: new Map() });
  global.fetch = vi.fn();
});

afterEach(() => {
  // 必须先卸载组件再切回真实计时器：卸载会运行 effect cleanup 清掉 pending timer，
  // 否则上一测试残留的 setTimeout 会在下一测试 advanceTimersByTime 时意外触发。
  cleanup();
  vi.useRealTimers();
  // presence-subscriptions 是模块级单例：清空残留订阅，避免泄漏到下一个测试。
  const ids = getSubscribedIds();
  if (ids.length > 0) subscribe(ids)();
});

describe("PresenceProvider", () => {
  it("挂载时立即拉取已订阅的全部 id，60s 后再次拉取", async () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1);
    subscribe(ids);
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ data: {} }));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/users/presence?ids=${ids.join(",")}`,
      undefined,
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("订阅集为空时不发请求", async () => {
    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("apply 把响应写入 presence store", async () => {
    subscribe([1]);
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ data: { 1: { is_online: true, last_active_at: 100 } } }),
    );

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();

    expect(usePresenceStore.getState().get(1)).toEqual({ is_online: true, last_active_at: 100 });
  });

  it("document.hidden=true 时暂停轮询，60s 内不再发请求", async () => {
    subscribe([1]);
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ data: {} }));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();
    vi.mocked(global.fetch).mockClear();

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flushAsyncWork();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("从隐藏切回可见时立即拉取一次", async () => {
    subscribe([1]);
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ data: {} }));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.mocked(global.fetch).mockClear();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("请求失败后指数退避：下次间隔变为 120s", async () => {
    subscribe([1]);
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network"));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();

    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ data: {} }));
    vi.mocked(global.fetch).mockClear();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flushAsyncWork();
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flushAsyncWork();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("连续失败 4 次后第 5 次的间隔封顶 300s", async () => {
    subscribe([1]);
    vi.mocked(global.fetch).mockRejectedValue(new Error("network"));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork(); // 第 1 次失败 → failCount=1，下次 120s

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    await flushAsyncWork(); // 第 2 次失败 → failCount=2，下次 240s

    await act(async () => {
      vi.advanceTimersByTime(240_000);
    });
    await flushAsyncWork(); // 第 3 次失败 → failCount=3，下次 300s（封顶）

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    await flushAsyncWork(); // 第 4 次失败 → failCount=4，下次仍 300s

    expect(global.fetch).toHaveBeenCalledTimes(4);
    vi.mocked(global.fetch).mockClear();

    await act(async () => {
      vi.advanceTimersByTime(299_000);
    });
    await flushAsyncWork();
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    await flushAsyncWork();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("订阅集高频变化时 200ms 去抖，只触发一次请求", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ data: {} }));

    render(
      <PresenceProvider>
        <span>child</span>
      </PresenceProvider>,
    );
    await flushAsyncWork();
    expect(global.fetch).not.toHaveBeenCalled();

    act(() => {
      subscribe([1]);
      subscribe([2]);
      subscribe([3]);
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await flushAsyncWork();
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    await flushAsyncWork();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/users/presence?ids=1,2,3", undefined);
  });
});
