// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectReconnectingEventSource } from "./reconnecting-event-source";

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
  }

  simulateClosedError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }
}

describe("connectReconnectingEventSource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("建立连接并监听自定义事件", () => {
    const onMessage = vi.fn();
    connectReconnectingEventSource({
      url: "/api/notifications/stream",
      eventTypes: ["notification"],
      handlers: { onMessage },
    });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/notifications/stream");

    const event = new MessageEvent("notification", { data: "ping" });
    MockEventSource.instances[0]?.listeners.get("notification")?.[0]?.(event);
    expect(onMessage).toHaveBeenCalledWith("notification", event);
  });

  it("连接永久关闭后按退避间隔重连", () => {
    const onOpen = vi.fn();
    const disconnect = connectReconnectingEventSource({
      url: "/api/notifications/stream",
      eventTypes: ["notification"],
      handlers: { onOpen },
      initialRetryDelayMs: 1_000,
      maxRetryDelayMs: 8_000,
    });

    MockEventSource.instances[0]?.simulateOpen();
    MockEventSource.instances[0]?.simulateClosedError();
    expect(MockEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(999);
    expect(MockEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(MockEventSource.instances).toHaveLength(2);
    MockEventSource.instances[1]?.simulateOpen();
    expect(onOpen).toHaveBeenCalledTimes(1);

    MockEventSource.instances[1]?.simulateClosedError();
    vi.advanceTimersByTime(2_000);
    expect(MockEventSource.instances).toHaveLength(3);

    disconnect();
    vi.advanceTimersByTime(10_000);
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it("浏览器仍在 CONNECTING 时不额外建连", () => {
    connectReconnectingEventSource({
      url: "/api/notifications/stream",
      eventTypes: ["notification"],
      handlers: {},
    });

    const instance = MockEventSource.instances[0];
    instance!.readyState = MockEventSource.CONNECTING;
    instance!.onerror?.();

    vi.advanceTimersByTime(5_000);
    expect(MockEventSource.instances).toHaveLength(1);
  });
});
