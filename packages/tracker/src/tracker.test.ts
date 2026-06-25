import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTracker, type TrackerDeps } from "./tracker";
import type { CollectPayload } from "./types";

function makeDeps(overrides: Partial<TrackerDeps> = {}) {
  const sent: CollectPayload[] = [];
  let visible = true;
  let visibilityCb: (() => void) | null = null;
  let pageHideCb: (() => void) | null = null;
  let intervalCb: (() => void) | null = null;

  const deps: TrackerDeps = {
    now: () => 1000,
    send: (p) => sent.push(p),
    getSession: () => "sid",
    buildPayload: (event_type, path, session_id) => ({
      event_type,
      path,
      title: "t",
      referer: "",
      session_id,
      screen: "1x1",
    }),
    setInterval: (cb) => {
      intervalCb = cb;
      return 1;
    },
    clearInterval: vi.fn(),
    isVisible: () => visible,
    onVisibilityChange: (cb) => {
      visibilityCb = cb;
      return () => {
        visibilityCb = null;
      };
    },
    onPageHide: (cb) => {
      pageHideCb = cb;
      return () => {
        pageHideCb = null;
      };
    },
    ...overrides,
  };

  return {
    deps,
    sent,
    setVisible: (v: boolean) => {
      visible = v;
    },
    fireVisibility: () => visibilityCb?.(),
    firePageHide: () => pageHideCb?.(),
    fireInterval: () => intervalCb?.(),
  };
}

describe("createTracker", () => {
  let h: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    h = makeDeps();
  });

  it("可见时导航发送一次 page_view", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]).toMatchObject({ event_type: "page_view", path: "/a" });
  });

  it("同一路径重复调用不重复发送（预取/重渲染不产生 PV）", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    t.trackPageView("/a");
    expect(h.sent.filter((e) => e.event_type === "page_view")).toHaveLength(1);
  });

  it("隐藏时导航不发 PV，转为可见后补发", () => {
    h.setVisible(false);
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    expect(h.sent).toHaveLength(0);
    h.setVisible(true);
    h.fireVisibility();
    expect(h.sent.filter((e) => e.event_type === "page_view")).toHaveLength(1);
  });

  it("可见时心跳定时器发送 heartbeat（已有当前路径）", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    h.fireInterval();
    expect(h.sent.filter((e) => e.event_type === "heartbeat")).toHaveLength(1);
    expect(h.sent.at(-1)).toMatchObject({ event_type: "heartbeat", path: "/a" });
  });

  it("尚无 PV 时心跳不发送", () => {
    const t = createTracker(h.deps);
    t.start();
    h.fireInterval();
    expect(h.sent).toHaveLength(0);
  });

  it("转为隐藏时补发一次 heartbeat 并清理定时器", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    h.setVisible(false);
    h.fireVisibility();
    expect(h.sent.filter((e) => e.event_type === "heartbeat")).toHaveLength(1);
    expect(h.deps.clearInterval).toHaveBeenCalled();
  });

  it("pagehide 补发 heartbeat 并停止", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    h.firePageHide();
    expect(h.sent.filter((e) => e.event_type === "heartbeat")).toHaveLength(1);
  });

  it("stop 后解绑监听，不再响应可见性变化", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    t.stop();
    h.fireVisibility();
    expect(h.sent.filter((e) => e.event_type === "heartbeat")).toHaveLength(0);
  });
});
