# Analytics Phase 1 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browser-side analytics tracker SDK (`@repo/tracker`) plus a same-origin BFF proxy (`apps/web/app/api/collect/route.ts`) and wire it into the web front-end so real page views / heartbeats are reported to the Go backend `/collect` endpoint.

**Architecture:** A framework-agnostic tracker core (PV-on-navigation, visible-only heartbeat, sessionStorage session id) lives in a new `@repo/tracker` package, mirroring the existing `@repo/hooks` package shape (no build step, TS source export, per-package vitest). A thin React client component (`AnalyticsTracker`) binds the core to App-Router navigation via `usePathname()`. The browser only ever calls the same-origin Next route `/api/collect`, which converts the server-side HttpOnly `access_token` cookie into an `Authorization: Bearer` header (anonymous → omit), forwards `visitor_id` cookie + `Origin` + `X-Forwarded-For`, returns 204, and relays the backend's `Set-Cookie` (first-visit `visitor_id`).

**Tech Stack:** pnpm workspace, TypeScript (strict, ES2022, Bundler resolution), Next.js 16 App Router, React 19, Vitest 4 (jsdom for the web app, happy-dom for the package), @testing-library/react, @vitejs/plugin-react.

## Global Constraints

- **Backend `/collect` contract (do not deviate):** `POST /collect`, JSON body `{event_type, path, title, referer, session_id, screen}` where `event_type ∈ "page_view" | "heartbeat"`. Backend takes UA/IP/Origin/visitor_id itself; the client MUST NOT send `user_id`. Backend ALWAYS responds `204 No Content` (even for bad input). Field names are snake_case exactly as listed.
- **Privacy / identity:** The client never reads or sends the JWT. Login attribution happens only server-side in the BFF (HttpOnly cookie → `Authorization: Bearer`). `session_id` is generated client-side and stored in `sessionStorage`; 30 minutes with no event = new session.
- **Ghost-PV rule (critical):** Page views bind to **real navigation + page visible**, never to component mount. App-Router `<Link>` prefetch must NOT produce a PV. (Implementation: trigger on `usePathname()` change, dedup by last path; gate on document visibility.)
- **Heartbeat:** while the page is visible, send `heartbeat` every ~15s; stop on `visibilitychange → hidden`; send one final `heartbeat` when hidden / on `pagehide`.
- **Transport:** `fetch("/api/collect", { method: "POST", keepalive: true, credentials: "include", headers: { "Content-Type": "application/json" }, body })`. Best-effort: never throw into the page, swallow all transport errors.
- **BFF must forward, or the backend miscounts:** `Origin` header (backend anti-forgery allow-list → missing Origin is treated as `suspect` and excluded from all counts), `X-Forwarded-For` (backend `c.ClientIP()` for geo + ip_hash), and all cookies (so `visitor_id` round-trips). Relay backend `Set-Cookie` back to the browser. BFF returns 204.
- **Backend cookie facts (for reference):** backend issues `visitor_id` cookie (HttpOnly, SameSite=Lax, 1y, Path=/) on first `/collect`; reads identity from `Authorization: Bearer`; `access_token` cookie name is `access_token` (constant `ACCESS_TOKEN_COOKIE` in `apps/web/lib/auth-refresh.ts`).
- **Package conventions:** mirror `@repo/hooks` — `private: true`, `type: module`, `exports` map points at `./src/*.ts(x)` (no build), scripts `test`/`test:watch`/`check-types`/`lint`, peer `react`/`next` as `"*"`, devDeps pin `react ^19.0.0` / `next ^16.2.6` / `@testing-library/react ^16.3.2` / `vitest ^4.1.7`. tsconfig extends `@repo/typescript-config/react`. Per-package `vitest.config.ts` uses `@vitejs/plugin-react` + `environment` (happy-dom for the package).
- **Code style:** Prettier — `semi: true`, `singleQuote: false`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`. ESLint must pass `--max-warnings 0`. Chinese comments only where intent is non-obvious.
- **Branch & commits:** all work on `feat/analytics-phase1-frontend` (cut from `dev`). Conventional Commits with Chinese subject (e.g. `feat(analytics): 新增 tracker SDK 会话管理`). A pre-push hook runs `pnpm run test:run`.
- **Cross-repo (not implemented here, verify at deploy):** the Go backend env `ANALYTICS_ALLOWED_ORIGINS` must list the web origins (`https://www.yevpt.com,https://yevpt.com`) and must NOT list the admin origin.

---

## File Structure

New package `packages/tracker` (`@repo/tracker`):

- `package.json` — package manifest, mirrors `@repo/hooks`.
- `tsconfig.json` — extends `@repo/typescript-config/react`.
- `vitest.config.ts` — `@vitejs/plugin-react`, `environment: "happy-dom"`, `name: "tracker"`.
- `eslint.config.js` — mirrors a react package's eslint config.
- `src/types.ts` — shared types: `AnalyticsEventType`, `CollectPayload`, `TrackerOptions`.
- `src/payload.ts` — `buildPayload()` reads `document.title` / `document.referrer` / `window.screen`.
- `src/session.ts` — `getSessionId()` sessionStorage 30-min session.
- `src/transport.ts` — `sendEvent()` keepalive fetch, error-swallowing, SSR-safe.
- `src/tracker.ts` — `createTracker(deps, options)` framework-agnostic controller; `TrackerDeps` seam for tests.
- `src/browser.ts` — `createBrowserTracker(options)` builds real browser `TrackerDeps`.
- `src/react.tsx` — `"use client"` `AnalyticsTracker` component (binds `usePathname()`).
- `src/index.ts` — public exports.
- `src/*.test.ts(x)` — colocated vitest tests per module.

Web app changes:

- Create `apps/web/app/api/collect/route.ts` — thin BFF proxy + `apps/web/app/api/collect/route.test.ts`.
- Modify `apps/web/package.json` — add `"@repo/tracker": "workspace:*"`.
- Modify `apps/web/next.config.mjs` — add `@repo/tracker` to `transpilePackages`.
- Modify `apps/web/app/layout.tsx` — render `<AnalyticsTracker />` (web only).

---

## Task 1: Scaffold `@repo/tracker` package + shared types

**Files:**

- Create: `packages/tracker/package.json`
- Create: `packages/tracker/tsconfig.json`
- Create: `packages/tracker/vitest.config.ts`
- Create: `packages/tracker/eslint.config.js`
- Create: `packages/tracker/src/types.ts`
- Create: `packages/tracker/src/index.ts`
- Test: `packages/tracker/src/types.test.ts`

**Interfaces:**

- Produces: `AnalyticsEventType = "page_view" | "heartbeat"`; `CollectPayload` (snake_case fields); `TrackerOptions { endpoint?: string; heartbeatMs?: number; sessionTimeoutMs?: number }`. Later tasks import these from `./types`.

- [ ] **Step 1: Create the package manifest**

`packages/tracker/package.json`:

```json
{
  "name": "@repo/tracker",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts" },
    "./react": { "types": "./src/react.tsx", "import": "./src/react.tsx" }
  },
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix"
  },
  "peerDependencies": {
    "next": "*",
    "react": "*"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@testing-library/react": "^16.3.2",
    "next": "^16.2.6",
    "react": "^19.0.0",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Create tsconfig + vitest + eslint config**

`packages/tracker/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/react",
  "compilerOptions": {
    "types": ["react", "vitest/globals"]
  },
  "include": ["src"]
}
```

`packages/tracker/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "tracker",
    environment: "happy-dom",
    globals: true,
  },
});
```

`packages/tracker/eslint.config.js` (mirror `packages/api/eslint.config.js`, browser globals + no-undef off for DOM types):

```js
import { base } from "@repo/eslint-config/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "no-undef": "off",
    },
  },
  { ignores: ["node_modules/**"] },
];
```

- [ ] **Step 3: Write the failing test for shared types**

`packages/tracker/src/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { CollectPayload } from "./types";

describe("CollectPayload", () => {
  it("有后端约定的全部 snake_case 字段", () => {
    const payload: CollectPayload = {
      event_type: "page_view",
      path: "/",
      title: "Home",
      referer: "",
      session_id: "sid",
      screen: "1920x1080",
    };
    expect(Object.keys(payload).sort()).toEqual(
      ["event_type", "path", "referer", "screen", "session_id", "title"].sort(),
    );
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @repo/tracker test`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 5: Implement types + index**

`packages/tracker/src/types.ts`:

```ts
// 上报事件类型，与后端 dto.CollectRequest.EventType 取值一致。
export type AnalyticsEventType = "page_view" | "heartbeat";

// 上报载荷，字段名与后端约定（snake_case）严格一致；不含 user_id。
export interface CollectPayload {
  event_type: AnalyticsEventType;
  path: string;
  title: string;
  referer: string;
  session_id: string;
  screen: string;
}

// tracker 可选配置，全部有默认值。
export interface TrackerOptions {
  endpoint?: string; // BFF 上报地址，默认 "/api/collect"
  heartbeatMs?: number; // 心跳间隔，默认 15000
  sessionTimeoutMs?: number; // 会话失活阈值，默认 30 分钟
}
```

`packages/tracker/src/index.ts`:

```ts
export type { AnalyticsEventType, CollectPayload, TrackerOptions } from "./types";
```

- [ ] **Step 6: Install workspace deps and run tests + type-check**

Run: `pnpm install`
Run: `pnpm --filter @repo/tracker test`
Expected: PASS (1 test).
Run: `pnpm --filter @repo/tracker check-types`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/tracker pnpm-lock.yaml
git commit -m "feat(analytics): 新增 tracker 包骨架与上报类型"
```

---

## Task 2: Session id (sessionStorage, 30-min reset)

**Files:**

- Create: `packages/tracker/src/session.ts`
- Test: `packages/tracker/src/session.test.ts`
- Modify: `packages/tracker/src/index.ts`

**Interfaces:**

- Consumes: `TrackerOptions` (for `sessionTimeoutMs`).
- Produces: `getSessionId(now?: number, timeoutMs?: number): string` — returns the current session id, creating a new one when none exists or when `now - lastActivity > timeoutMs`; always refreshes the stored last-activity timestamp; returns `""` when `sessionStorage` is unavailable (SSR).

- [ ] **Step 1: Write the failing tests**

`packages/tracker/src/session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getSessionId } from "./session";

describe("getSessionId", () => {
  beforeEach(() => sessionStorage.clear());

  it("首次调用生成并持久化一个 session id", () => {
    const id = getSessionId(1000);
    expect(id).not.toBe("");
    expect(getSessionId(2000)).toBe(id); // 同窗口内复用
  });

  it("失活阈值内复用同一 session id", () => {
    const id = getSessionId(0);
    expect(getSessionId(29 * 60 * 1000)).toBe(id);
  });

  it("超过失活阈值生成新的 session id", () => {
    const id = getSessionId(0);
    const next = getSessionId(30 * 60 * 1000 + 1);
    expect(next).not.toBe(id);
  });

  it("每次调用都会刷新 last-activity（滑动窗口）", () => {
    const id = getSessionId(0);
    getSessionId(20 * 60 * 1000); // 刷新
    expect(getSessionId(40 * 60 * 1000)).toBe(id); // 距上次仅 20min，仍复用
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/tracker test session`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Implement session.ts**

```ts
import type { TrackerOptions } from "./types";

const SESSION_ID_KEY = "blog_analytics_sid";
const LAST_ACTIVITY_KEY = "blog_analytics_last";
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// 生成随机 session id，优先用 crypto.randomUUID，降级到时间戳+随机串。
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 返回当前 session id：无记录或距上次活动超过 timeoutMs 时新建；每次调用刷新活动时间。
// SSR（无 sessionStorage）下返回空串。
export function getSessionId(
  now: number = Date.now(),
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
): string {
  if (typeof sessionStorage === "undefined") return "";

  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  const lastRaw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const last = lastRaw ? Number(lastRaw) : 0;

  let sid = existing ?? "";
  if (!sid || !last || now - last > timeoutMs) {
    sid = newId();
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  return sid;
}

export const SESSION_TIMEOUT_MS = DEFAULT_SESSION_TIMEOUT_MS;
export type { TrackerOptions };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/tracker test session`
Expected: PASS (4 tests).

- [ ] **Step 5: Export and commit**

Add to `packages/tracker/src/index.ts`:

```ts
export { getSessionId, SESSION_TIMEOUT_MS } from "./session";
```

```bash
git add packages/tracker/src
git commit -m "feat(analytics): 新增 tracker 会话 id 管理"
```

---

## Task 3: Payload builder + transport

**Files:**

- Create: `packages/tracker/src/payload.ts`
- Create: `packages/tracker/src/transport.ts`
- Test: `packages/tracker/src/payload.test.ts`
- Test: `packages/tracker/src/transport.test.ts`
- Modify: `packages/tracker/src/index.ts`

**Interfaces:**

- Consumes: `AnalyticsEventType`, `CollectPayload`.
- Produces:
  - `buildPayload(eventType: AnalyticsEventType, path: string, sessionId: string): CollectPayload` — fills `title`/`referer`/`screen` from `document`/`window`, SSR-safe (empty strings).
  - `sendEvent(payload: CollectPayload, endpoint?: string): void` — keepalive POST, swallows all errors, no-op when `fetch` is undefined. Default endpoint `"/api/collect"`.

- [ ] **Step 1: Write the failing tests**

`packages/tracker/src/payload.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildPayload } from "./payload";

describe("buildPayload", () => {
  beforeEach(() => {
    document.title = "Test Page";
  });

  it("组装含 path/title/session_id 的载荷", () => {
    const p = buildPayload("page_view", "/posts/1", "sid-1");
    expect(p.event_type).toBe("page_view");
    expect(p.path).toBe("/posts/1");
    expect(p.title).toBe("Test Page");
    expect(p.session_id).toBe("sid-1");
    expect(typeof p.screen).toBe("string");
    expect(typeof p.referer).toBe("string");
  });
});
```

`packages/tracker/src/transport.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEvent } from "./transport";
import type { CollectPayload } from "./types";

const payload: CollectPayload = {
  event_type: "page_view",
  path: "/",
  title: "t",
  referer: "",
  session_id: "sid",
  screen: "1x1",
};

describe("sendEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("以 keepalive + credentials 同源 POST 到 /api/collect", () => {
    sendEvent(payload);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/collect");
    expect(init).toMatchObject({
      method: "POST",
      keepalive: true,
      credentials: "include",
    });
    expect(JSON.parse(init!.body as string)).toEqual(payload);
  });

  it("尊重自定义 endpoint", () => {
    sendEvent(payload, "/custom/collect");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/custom/collect");
  });

  it("吞掉 fetch 抛出的异常，不向页面冒泡", () => {
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error("network down");
    });
    expect(() => sendEvent(payload)).not.toThrow();
  });

  it("吞掉 fetch 拒绝的 promise", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("rejected"));
    expect(() => sendEvent(payload)).not.toThrow();
    await Promise.resolve();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/tracker test payload transport`
Expected: FAIL — cannot resolve `./payload` / `./transport`.

- [ ] **Step 3: Implement payload.ts**

```ts
import type { AnalyticsEventType, CollectPayload } from "./types";

// 由运行环境（document/window）组装上报载荷；SSR 下相关字段降级为空串。
export function buildPayload(
  eventType: AnalyticsEventType,
  path: string,
  sessionId: string,
): CollectPayload {
  const screen =
    typeof window !== "undefined" && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : "";
  const title = typeof document !== "undefined" ? document.title : "";
  const referer = typeof document !== "undefined" ? document.referrer : "";
  return { event_type: eventType, path, title, referer, session_id: sessionId, screen };
}
```

- [ ] **Step 4: Implement transport.ts**

```ts
import type { CollectPayload } from "./types";

const DEFAULT_ENDPOINT = "/api/collect";

// 同源 BFF 上报。keepalive 保证卸载时仍能发出；best-effort，任何异常均吞掉。
export function sendEvent(payload: CollectPayload, endpoint: string = DEFAULT_ENDPOINT): void {
  if (typeof fetch === "undefined") return;
  try {
    void fetch(endpoint, {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // 统计为非关键路径，忽略网络错误
    });
  } catch {
    // 同步抛出（如 fetch 不可用）也忽略
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/tracker test payload transport`
Expected: PASS (payload 1 + transport 4).

- [ ] **Step 6: Export and commit**

Add to `packages/tracker/src/index.ts`:

```ts
export { buildPayload } from "./payload";
export { sendEvent } from "./transport";
```

```bash
git add packages/tracker/src
git commit -m "feat(analytics): 新增 tracker 载荷组装与上报传输"
```

---

## Task 4: Tracker controller (`createTracker`)

**Files:**

- Create: `packages/tracker/src/tracker.ts`
- Test: `packages/tracker/src/tracker.test.ts`
- Modify: `packages/tracker/src/index.ts`

**Interfaces:**

- Consumes: `CollectPayload`, `TrackerOptions`.
- Produces:
  - `TrackerDeps` — injectable seam: `{ now(): number; send(p: CollectPayload): void; getSession(now: number): string; buildPayload(type, path, sid): CollectPayload; setInterval(cb, ms): number; clearInterval(id): void; isVisible(): boolean; onVisibilityChange(cb): () => void; onPageHide(cb): () => void }`.
  - `Tracker` — `{ trackPageView(path: string): void; start(): void; stop(): void }`.
  - `createTracker(deps: TrackerDeps, options?: TrackerOptions): Tracker`.
- Behavior: PV dedup by last path; PV gated on visibility (hidden navigations queue a pending PV, flushed when visible); heartbeat interval runs only while visible; a final heartbeat fires when the page goes hidden and on pagehide; heartbeats are skipped until the first PV has set a current path.

- [ ] **Step 1: Write the failing tests**

`packages/tracker/src/tracker.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/tracker test tracker`
Expected: FAIL — cannot resolve `./tracker`.

- [ ] **Step 3: Implement tracker.ts**

```ts
import type { AnalyticsEventType, CollectPayload, TrackerOptions } from "./types";

const DEFAULT_HEARTBEAT_MS = 15000;

// 可注入依赖，使核心逻辑脱离浏览器全局，便于用假时钟/假可见性测试。
export interface TrackerDeps {
  now: () => number;
  send: (payload: CollectPayload) => void;
  getSession: (now: number) => string;
  buildPayload: (type: AnalyticsEventType, path: string, sessionId: string) => CollectPayload;
  setInterval: (cb: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  isVisible: () => boolean;
  onVisibilityChange: (cb: () => void) => () => void;
  onPageHide: (cb: () => void) => () => void;
}

export interface Tracker {
  trackPageView: (path: string) => void;
  start: () => void;
  stop: () => void;
}

// 创建 tracker 控制器：负责 PV 去重/可见性门控、心跳调度、隐藏与卸载补发。
export function createTracker(deps: TrackerDeps, options: TrackerOptions = {}): Tracker {
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;

  let currentPath = "";
  let pendingPath: string | null = null;
  let intervalId: number | null = null;
  let unsubVisibility: (() => void) | null = null;
  let unsubPageHide: (() => void) | null = null;

  function emit(type: AnalyticsEventType, path: string): void {
    const sid = deps.getSession(deps.now());
    deps.send(deps.buildPayload(type, path, sid));
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
    if (deps.isVisible()) startHeartbeat();
  }

  function stop(): void {
    stopHeartbeat();
    unsubVisibility?.();
    unsubPageHide?.();
    unsubVisibility = null;
    unsubPageHide = null;
  }

  return { trackPageView, start, stop };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/tracker test tracker`
Expected: PASS (8 tests).

- [ ] **Step 5: Export and commit**

Add to `packages/tracker/src/index.ts`:

```ts
export { createTracker } from "./tracker";
export type { Tracker, TrackerDeps } from "./tracker";
```

```bash
git add packages/tracker/src
git commit -m "feat(analytics): 新增 tracker 控制器（PV/心跳/可见性）"
```

---

## Task 5: Browser deps + React `AnalyticsTracker` component

**Files:**

- Create: `packages/tracker/src/browser.ts`
- Create: `packages/tracker/src/react.tsx`
- Test: `packages/tracker/src/react.test.tsx`
- Modify: `packages/tracker/src/index.ts`

**Interfaces:**

- Consumes: `createTracker`, `TrackerDeps`, `getSessionId`, `buildPayload`, `sendEvent`, `TrackerOptions`.
- Produces:
  - `createBrowserTracker(options?: TrackerOptions): Tracker` — wires real browser deps (Date.now, sendEvent with endpoint, getSessionId with sessionTimeout, window.setInterval/clearInterval, `document.visibilityState`, `visibilitychange` + `pagehide` listeners).
  - `AnalyticsTracker(props: { options?: TrackerOptions }): null` — `"use client"` component, creates a browser tracker once on mount, starts it, stops on unmount, and calls `trackPageView(pathname)` whenever `usePathname()` changes.

- [ ] **Step 1: Write the failing test**

`packages/tracker/src/react.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const pathname = { value: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { AnalyticsTracker } from "./react";

describe("AnalyticsTracker", () => {
  beforeEach(() => {
    pathname.value = "/";
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("挂载即上报首屏 page_view", () => {
    render(<AnalyticsTracker />);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ event_type: "page_view", path: "/" });
  });

  it("pathname 变化触发新的 page_view", () => {
    const { rerender } = render(<AnalyticsTracker />);
    expect(fetch).toHaveBeenCalledTimes(1);
    pathname.value = "/posts/1";
    rerender(<AnalyticsTracker />);
    const pvCalls = vi
      .mocked(fetch)
      .mock.calls.filter((c) => JSON.parse(c[1]!.body as string).event_type === "page_view");
    expect(pvCalls).toHaveLength(2);
    expect(JSON.parse(pvCalls[1][1]!.body as string).path).toBe("/posts/1");
  });

  it("pathname 不变的重渲染不重复上报 PV", () => {
    const { rerender } = render(<AnalyticsTracker />);
    rerender(<AnalyticsTracker />);
    const pvCalls = vi
      .mocked(fetch)
      .mock.calls.filter((c) => JSON.parse(c[1]!.body as string).event_type === "page_view");
    expect(pvCalls).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/tracker test react`
Expected: FAIL — cannot resolve `./react`.

- [ ] **Step 3: Implement browser.ts**

```ts
import { buildPayload } from "./payload";
import { getSessionId } from "./session";
import { sendEvent } from "./transport";
import { createTracker, type Tracker, type TrackerDeps } from "./tracker";
import type { TrackerOptions } from "./types";

// 用真实浏览器全局组装 TrackerDeps。
function browserDeps(options: TrackerOptions): TrackerDeps {
  const endpoint = options.endpoint;
  const sessionTimeoutMs = options.sessionTimeoutMs;
  return {
    now: () => Date.now(),
    send: (payload) => sendEvent(payload, endpoint),
    getSession: (now) => getSessionId(now, sessionTimeoutMs),
    buildPayload,
    setInterval: (cb, ms) => window.setInterval(cb, ms),
    clearInterval: (id) => window.clearInterval(id),
    isVisible: () => document.visibilityState === "visible",
    onVisibilityChange: (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    onPageHide: (cb) => {
      window.addEventListener("pagehide", cb);
      return () => window.removeEventListener("pagehide", cb);
    },
  };
}

// 创建绑定真实浏览器环境的 tracker。
export function createBrowserTracker(options: TrackerOptions = {}): Tracker {
  return createTracker(browserDeps(options), options);
}
```

> Note: `getSessionId`/`sendEvent` default their own params when passed `undefined`, so forwarding optional `endpoint`/`sessionTimeoutMs` as `undefined` is safe.

- [ ] **Step 4: Implement react.tsx**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createBrowserTracker } from "./browser";
import type { Tracker } from "./tracker";
import type { TrackerOptions } from "./types";

// 在 web 前台根布局挂载一次，把 App Router 导航绑定到 tracker。返回 null，无 DOM 输出。
export function AnalyticsTracker({ options }: { options?: TrackerOptions }): null {
  const pathname = usePathname();
  const trackerRef = useRef<Tracker | null>(null);

  useEffect(() => {
    const tracker = createBrowserTracker(options);
    trackerRef.current = tracker;
    tracker.start();
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
    // 仅挂载/卸载时建立与销毁，options 变化不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pathname) trackerRef.current?.trackPageView(pathname);
  }, [pathname]);

  return null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @repo/tracker test react`
Expected: PASS (3 tests). Then run the whole package: `pnpm --filter @repo/tracker test` (all green) and `pnpm --filter @repo/tracker check-types`.

- [ ] **Step 6: Export and commit**

Add to `packages/tracker/src/index.ts`:

```ts
export { createBrowserTracker } from "./browser";
```

(`AnalyticsTracker` is consumed via the `@repo/tracker/react` subpath export defined in Task 1.)

```bash
git add packages/tracker/src
git commit -m "feat(analytics): 新增 tracker 浏览器装配与 React 组件"
```

---

## Task 6: BFF proxy route `/api/collect`

**Files:**

- Create: `apps/web/app/api/collect/route.ts`
- Test: `apps/web/app/api/collect/route.test.ts`

**Interfaces:**

- Consumes: `ACCESS_TOKEN_COOKIE` from `@/lib/auth-refresh`; `process.env.API_BASE_URL`.
- Produces: `POST(req: NextRequest): Promise<NextResponse>` — a thin proxy that returns 204, converting the `access_token` cookie to `Authorization: Bearer` (anonymous omits it), forwarding `Cookie` / `Origin` / `X-Forwarded-For` / `X-Real-IP`, and relaying the backend's `Set-Cookie`.

> Design decision (recorded): this route does NOT reuse `lib/backend-proxy.ts` `proxyPost`, because that helper (a) never forwards `Origin` or `X-Forwarded-For` — both required by the backend collect handler — and (b) parses the body and emits `200 + JSON`, whereas `/collect` is a 204 no-body contract. It also intentionally does NOT perform token refresh: an expired token simply degrades to an anonymous event (still counted), keeping every heartbeat side-effect-free.

- [ ] **Step 1: Write the failing tests**

`apps/web/app/api/collect/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeReq(opts: { cookies?: string; origin?: string; xff?: string } = {}): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.cookies) headers.cookie = opts.cookies;
  if (opts.origin) headers.origin = opts.origin;
  if (opts.xff) headers["x-forwarded-for"] = opts.xff;
  return new NextRequest("http://localhost/api/collect", {
    method: "POST",
    headers,
    body: JSON.stringify({ event_type: "page_view", path: "/", session_id: "sid" }),
  });
}

describe("POST /api/collect", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "http://backend:8080";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("总是返回 204", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(204);
    expect(fetch).toHaveBeenCalledWith(
      "http://backend:8080/collect",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("有 access_token cookie 时加 Authorization Bearer", async () => {
    await POST(makeReq({ cookies: "access_token=jwt123; visitor_id=v1" }));
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt123");
  });

  it("匿名（无 access_token）不加 Authorization", async () => {
    await POST(makeReq({ cookies: "visitor_id=v1" }));
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("转发 Cookie / Origin / X-Forwarded-For 到后端", async () => {
    await POST(makeReq({ cookies: "visitor_id=v1", origin: "https://yevpt.com", xff: "1.2.3.4" }));
    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Cookie).toContain("visitor_id=v1");
    expect(headers.Origin).toBe("https://yevpt.com");
    expect(headers["X-Forwarded-For"]).toBe("1.2.3.4");
  });

  it("回写后端 Set-Cookie（首次下发 visitor_id）", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { "set-cookie": "visitor_id=newv; Path=/; HttpOnly" },
      }),
    );
    const res = await POST(makeReq());
    expect(res.headers.getSetCookie().join(",")).toContain("visitor_id=newv");
  });

  it("后端不可用时仍返回 204（best-effort，不影响前台）", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("backend down"));
    const res = await POST(makeReq());
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test app/api/collect`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Implement route.ts**

```ts
// apps/web/app/api/collect/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-refresh";

function apiBaseUrl(): string {
  return process.env.API_BASE_URL!;
}

// 站点分析上报薄代理：登录态由服务端 cookie 转 Bearer；透传 visitor_id/Origin/XFF；恒回 204。
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // 服务端 HttpOnly access_token → Authorization Bearer；匿名不加（不做 refresh，过期即按匿名计）。
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // 转发全部 Cookie，保证 visitor_id 往返不丢。
  const cookie = req.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  // Origin 必须透传：后端按白名单反伪造，缺失会被判为 suspect 而不计数。
  const origin = req.headers.get("origin");
  if (origin) headers.Origin = origin;

  // 透传真实客户端 IP，供后端地理解析与 ip_hash（c.ClientIP 依赖 XFF/Real-IP）。
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["X-Forwarded-For"] = xff;
  const realIp = req.headers.get("x-real-ip");
  if (realIp) headers["X-Real-IP"] = realIp;

  const res = new NextResponse(null, { status: 204 });
  try {
    const backendRes = await fetch(`${apiBaseUrl()}/collect`, { method: "POST", headers, body });
    for (const c of backendRes.headers.getSetCookie()) {
      res.headers.append("set-cookie", c);
    }
  } catch {
    // best-effort：后端不可用也不影响前台，静默返回 204
  }
  return res;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test app/api/collect`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/collect
git commit -m "feat(analytics): 新增 web BFF /api/collect 上报代理"
```

---

## Task 7: Wire `AnalyticsTracker` into the web app

**Files:**

- Modify: `apps/web/package.json` (add dependency)
- Modify: `apps/web/next.config.mjs` (transpilePackages)
- Modify: `apps/web/app/layout.tsx` (render the component)

**Interfaces:**

- Consumes: `AnalyticsTracker` from `@repo/tracker/react`.
- Produces: live tracking on every web page; no new exported API.

- [ ] **Step 1: Add the workspace dependency**

In `apps/web/package.json`, add to `dependencies` (keep alphabetical with the other `@repo/*` entries):

```json
"@repo/tracker": "workspace:*",
```

- [ ] **Step 2: Transpile the package**

In `apps/web/next.config.mjs`, add `"@repo/tracker"` to the existing `transpilePackages` array (it currently lists `@repo/ui`, `@repo/icons`, `@repo/hooks`, `@repo/styles`, `@repo/editor`, `@repo/markdown`):

```js
transpilePackages: [
  "@repo/ui",
  "@repo/icons",
  "@repo/hooks",
  "@repo/styles",
  "@repo/editor",
  "@repo/markdown",
  "@repo/tracker",
],
```

- [ ] **Step 3: Render the tracker in the root layout**

In `apps/web/app/layout.tsx`, import and render `AnalyticsTracker` inside `<body>` (it renders `null`; place it just inside `<ThemeProvider>` or directly under `<body>`). Add the import near the other component imports:

```tsx
import { AnalyticsTracker } from "@repo/tracker/react";
```

And render it inside the body tree (it returns `null`, so position is not visually significant — put it right after the opening provider stack, e.g. directly inside `<body>` before `<ThemeProvider>` or just inside it):

```tsx
<body>
  <AnalyticsTracker />
  <ThemeProvider>{/* ...existing tree... */}</ThemeProvider>
</body>
```

- [ ] **Step 4: Install and verify build + types + tests**

Run: `pnpm install`
Run: `pnpm --filter web check-types`
Expected: no errors.
Run: `pnpm --filter web build`
Expected: Next build succeeds (server compiles the new route + layout).
Run: `pnpm --filter @repo/tracker test && pnpm --filter web test app/api/collect`
Expected: all green.

- [ ] **Step 5: Manual verification (record results in the report; cannot be unit-tested)**

With the Go backend running locally (`API_BASE_URL=http://localhost:8080`, `ANALYTICS_ALLOWED_ORIGINS` empty or including `http://localhost:3000`) and the web app via `pnpm --filter web dev`:

1. Open the site, watch the Network tab → exactly one `POST /api/collect` with `event_type:"page_view"` on first load (status 204).
2. Navigate via an in-app `<Link>` → exactly one new `page_view` per destination; hovering links (prefetch) produces NO `page_view`.
3. Idle on a visible page → a `heartbeat` roughly every 15s.
4. Switch to another tab → heartbeats stop and one final `heartbeat` is sent; switch back → heartbeats resume.
5. First-ever load sets a `visitor_id` cookie (Application → Cookies).

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/next.config.mjs apps/web/app/layout.tsx pnpm-lock.yaml
git commit -m "feat(analytics): web 前台接入 tracker 上报"
```

---

## Self-Review

**Spec coverage (handoff §5):**

- tracker SDK: PV on real navigation + visible, not on mount → Task 4 (dedup + visibility gate) + Task 5 (usePathname binding). ✔
- heartbeat ~15s, stop on hidden, final beat on hidden/pagehide → Task 4. ✔
- session_id in sessionStorage, 30-min new session, no user_id → Task 2 + Global Constraints. ✔
- transport keepalive + credentials include to web BFF `/api/collect` → Task 3. ✔
- payload `{event_type, path, title, referer, session_id, screen}` → Task 1 (type) + Task 3 (builder). ✔
- unit tests: route-change one PV, prefetch none, heartbeat throttle, hidden stops → Tasks 4/5. ✔
- BFF method A: HttpOnly cookie → Bearer when logged in, anonymous none; forward to `POST /collect`; pass visitor_id cookie + relay Set-Cookie; forward Origin + X-Forwarded-For; thin proxy → Task 6. ✔
- Inject tracker in web root layout only (admin not instrumented) → Task 7 (web layout only; admin untouched). ✔
- Confirm prod `ANALYTICS_ALLOWED_ORIGINS` includes web, excludes admin → Global Constraints (deploy note) + Task 7 Step 5. ✔

**Placeholder scan:** every code step contains complete, runnable code; no TODO/TBD; commands have expected output.

**Type consistency:** `CollectPayload`/`AnalyticsEventType`/`TrackerOptions` defined in Task 1 are reused verbatim in Tasks 3/4/5; `TrackerDeps`/`Tracker`/`createTracker` defined in Task 4 are consumed unchanged in Task 5; `ACCESS_TOKEN_COOKIE` matches the backend cookie name; payload field names match the backend `/collect` contract exactly.

---

## Execution Handoff

Recommended: superpowers:subagent-driven-development — fresh implementer + task reviewer per task, dispatched on the most capable model; final whole-branch review at the end. Branch `feat/analytics-phase1-frontend` cut from `dev` before Task 1.
