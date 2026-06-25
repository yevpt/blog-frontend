import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTracker, type TrackerDeps } from "./tracker";
import type { CollectPayload } from "./types";

function makeDeps(overrides: Partial<TrackerDeps> = {}) {
  const sent: CollectPayload[] = [];
  let visible = true;
  let visibilityCb: (() => void) | null = null;
  let pageHideCb: (() => void) | null = null;
  let intervalCb: (() => void) | null = null;

  let interactionCb: (() => void) | null = null;
  let refreshCb: (() => void) | null = null;
  let refreshMs = 0;

  const fetchToken = vi.fn<() => Promise<string | undefined>>(() => Promise.resolve(undefined));

  const deps: TrackerDeps = {
    fetchToken,
    now: () => 1000,
    send: (p) => sent.push(p),
    getSession: () => "sid",
    buildPayload: (event_type, path, session_id, opts) => ({
      event_type,
      path,
      title: "t",
      referer: "",
      session_id,
      screen: "1x1",
      collect_token: opts?.collectToken,
      signals: {
        webdriver: false,
        no_interaction: opts?.hasInteracted === false,
      },
    }),
    setInterval: (cb, ms) => {
      // 同一假实现服务心跳与 token 刷新两类定时器，用间隔区分回调。
      if (ms >= 60000) {
        refreshCb = cb;
        refreshMs = ms;
        return 2;
      }
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
    onInteraction: (cb) => {
      interactionCb = cb;
      return () => {
        interactionCb = null;
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
    fireInteraction: () => interactionCb?.(),
    fireRefresh: () => refreshCb?.(),
    refreshMs: () => refreshMs,
    fetchToken,
    isInteractionSubscribed: () => interactionCb !== null,
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

  it("未交互前 no_interaction 为 true，交互后转为 false", () => {
    const t = createTracker(h.deps);
    t.start();
    t.trackPageView("/a");
    expect(h.sent.at(-1)?.signals?.no_interaction).toBe(true);
    h.fireInteraction();
    t.trackPageView("/b");
    expect(h.sent.at(-1)?.signals?.no_interaction).toBe(false);
  });

  it("collectToken 透传到每次上报载荷", () => {
    const t = createTracker(h.deps, { collectToken: "tok" });
    t.start();
    t.trackPageView("/a");
    expect(h.sent.at(-1)?.collect_token).toBe("tok");
  });

  it("start 订阅交互，stop 解绑交互监听", () => {
    const t = createTracker(h.deps);
    t.start();
    expect(h.isInteractionSubscribed()).toBe(true);
    t.stop();
    expect(h.isInteractionSubscribed()).toBe(false);
  });

  it("刷新定时器默认间隔 240000（< 后端 5 分钟 TTL）", () => {
    const t = createTracker(h.deps, { collectToken: "old" });
    t.start();
    expect(h.refreshMs()).toBe(240000);
  });

  it("刷新成功后续上报使用新 token", async () => {
    h.fetchToken.mockResolvedValue("new-tok");
    const t = createTracker(h.deps, { collectToken: "old" });
    t.start();
    t.trackPageView("/a");
    expect(h.sent.at(-1)?.collect_token).toBe("old");

    h.fireRefresh();
    await Promise.resolve(); // 等待 fetchToken 微任务结算
    expect(h.fetchToken).toHaveBeenCalledTimes(1);

    t.trackPageView("/b");
    expect(h.sent.at(-1)?.collect_token).toBe("new-tok");
  });

  it("刷新返回 undefined 时保留原 token（优雅降级）", async () => {
    h.fetchToken.mockResolvedValue(undefined);
    const t = createTracker(h.deps, { collectToken: "old" });
    t.start();
    h.fireRefresh();
    await Promise.resolve();
    t.trackPageView("/a");
    expect(h.sent.at(-1)?.collect_token).toBe("old");
  });

  it("刷新 reject 时保留原 token（优雅降级）", async () => {
    h.fetchToken.mockRejectedValue(new Error("network"));
    const t = createTracker(h.deps, { collectToken: "old" });
    t.start();
    h.fireRefresh();
    await Promise.resolve();
    await Promise.resolve();
    t.trackPageView("/a");
    expect(h.sent.at(-1)?.collect_token).toBe("old");
  });

  it("stop 清理刷新定时器", () => {
    const t = createTracker(h.deps, { collectToken: "old" });
    t.start();
    t.stop();
    expect(h.deps.clearInterval).toHaveBeenCalledWith(2);
  });
});
