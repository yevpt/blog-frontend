import type { AnalyticsEventType, CollectPayload, TrackerOptions } from "./types";

const DEFAULT_HEARTBEAT_MS = 15000;
const DEFAULT_REFRESH_TOKEN_MS = 240000; // 4 分钟，须 < 后端 collect token 5 分钟 TTL

// 可注入依赖，使核心逻辑脱离浏览器全局，便于用假时钟/假可见性测试。
export interface TrackerDeps {
  now: () => number;
  send: (payload: CollectPayload) => void;
  getSession: (now: number) => string;
  buildPayload: (
    type: AnalyticsEventType,
    path: string,
    sessionId: string,
    opts?: { collectToken?: string; hasInteracted?: boolean },
  ) => CollectPayload;
  setInterval: (cb: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  fetchToken: () => Promise<string | undefined>; // 向 BFF 重签端点取新 collect token
  isVisible: () => boolean;
  onVisibilityChange: (cb: () => void) => () => void;
  onPageHide: (cb: () => void) => () => void;
  onInteraction: (cb: () => void) => () => void;
}

export interface Tracker {
  trackPageView: (path: string) => void;
  start: () => void;
  stop: () => void;
}

// 创建 tracker 控制器：负责 PV 去重/可见性门控、心跳调度、隐藏与卸载补发。
export function createTracker(deps: TrackerDeps, options: TrackerOptions = {}): Tracker {
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const refreshTokenMs = options.refreshTokenMs ?? DEFAULT_REFRESH_TOKEN_MS;

  let currentPath = "";
  let pendingPath: string | null = null;
  let intervalId: number | null = null;
  let refreshId: number | null = null;
  let collectToken = options.collectToken; // 可变：长会话中由刷新调度器替换为新 token
  let hasInteracted = false;
  let unsubVisibility: (() => void) | null = null;
  let unsubPageHide: (() => void) | null = null;
  let unsubInteraction: (() => void) | null = null;

  function emit(type: AnalyticsEventType, path: string): void {
    const sid = deps.getSession(deps.now());
    deps.send(
      deps.buildPayload(type, path, sid, {
        collectToken, // 读当前可变值，确保刷新后随即生效
        hasInteracted,
      }),
    );
  }

  function sendHeartbeat(): void {
    if (!currentPath) return; // 还没有 PV，不发心跳
    emit("heartbeat", currentPath);
  }

  function startHeartbeat(): void {
    if (intervalId !== null) return;
    intervalId = deps.setInterval(sendHeartbeat, heartbeatMs);
  }

  function stopHeartbeat(): void {
    if (intervalId !== null) {
      deps.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function refreshToken(): void {
    // 优雅降级：失败或拿到 undefined 时绝不清空原有 token，保证长会话仍带有效 token。
    deps
      .fetchToken()
      .then((tok) => {
        if (tok) collectToken = tok;
      })
      .catch(() => {});
  }

  function startRefresh(): void {
    if (refreshId !== null) return;
    refreshId = deps.setInterval(refreshToken, refreshTokenMs);
  }

  function stopRefresh(): void {
    if (refreshId !== null) {
      deps.clearInterval(refreshId);
      refreshId = null;
    }
  }

  function flushPending(): void {
    if (pendingPath !== null) {
      emit("page_view", pendingPath);
      pendingPath = null;
    }
  }

  function handleVisibility(): void {
    if (deps.isVisible()) {
      flushPending();
      startHeartbeat();
    } else {
      stopHeartbeat();
      sendHeartbeat(); // 隐藏时补发一次
    }
  }

  function handlePageHide(): void {
    sendHeartbeat();
    stop();
  }

  function trackPageView(path: string): void {
    if (path === currentPath) return; // 去重：预取/重渲染不产生 PV
    currentPath = path;
    if (deps.isVisible()) {
      emit("page_view", path);
    } else {
      pendingPath = path; // 隐藏时排队，转可见后补发
    }
  }

  function start(): void {
    unsubVisibility = deps.onVisibilityChange(handleVisibility);
    unsubPageHide = deps.onPageHide(handlePageHide);
    unsubInteraction = deps.onInteraction(() => {
      hasInteracted = true;
    });
    startRefresh(); // token 刷新与可见性无关，常驻运行
    if (deps.isVisible()) startHeartbeat();
  }

  function stop(): void {
    stopHeartbeat();
    stopRefresh();
    unsubVisibility?.();
    unsubPageHide?.();
    unsubInteraction?.();
    unsubVisibility = null;
    unsubPageHide = null;
    unsubInteraction = null;
  }

  return { trackPageView, start, stop };
}
