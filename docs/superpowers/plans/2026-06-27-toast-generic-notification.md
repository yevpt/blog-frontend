# ToastRegion 泛型化 + 实时消息通知接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `@repo/ui` 的 `ToastRegion`/`ToastQueue` 支持任意内容类型（不只是简单的 `{message,type}`），再把 `apps/web` 的实时消息通知弹窗（`NotificationProvider`）从手写的 `useState`+`setTimeout` 状态机迁移到这套引擎上。

**Architecture:** `ToastRegion` 新增可选的 `itemClassName`（宽度/对齐覆盖）与 `renderToast`（自定义内容渲染，拿到 `{close}` helper 直接调用 `queue.close(key)`）。用 TS 函数重载保证：不传 `renderToast` 时类型与行为跟现在完全一样；换内容类型必须同时传 `renderToast`。`NotificationProvider` 改成把通知项 `add()` 进一个 `ToastQueue<NotificationItemResp>`，自定义渲染头像+动作文案+引用摘要，不再手写计时器数组。

**Tech Stack:** React + TypeScript + Tailwind CSS v4 + react-aria-components（`UNSTABLE_Toast*`）+ react-stately（`ToastQueue`/`QueuedToast` 类型）+ Vitest/happy-dom/jsdom + Testing Library。

## Global Constraints

- 不改 `apps/web/lib/toast.ts` 的 `addToast` 签名；现有 `<ToastRegion queue={toastQueue} />` 调用点（`apps/web/app/providers/global-modals.tsx`）零改动。
- 不改 `apps/web/components/notifications/notification-card.tsx`（`/notifications` 列表页，独立组件）。
- 不改通知轮询/去重/可见性感知重试逻辑（`syncLatestUnread`/`seedUnreadSnapshot`/`schedulePoll` 等），只改"新通知到达后怎么展示"这一段。
- 颜色走既有 Tailwind 设计令牌；新代码不引入硬编码十六进制色值。
- 组件改动后必须保持/补全同名 `*.test.tsx`。
- Commit message 必须满足 `scripts/validate-commit-msg.cjs`：`<type>(<scope>): <中文主题，≤50 字，不以句号结尾>`，`type` 取自 `feat/fix/refactor/test/chore/perf/docs/ci/style/build`。

---

### Task 1: `ToastRegion` 泛型化（`packages/ui`）

**Files:**

- Modify: `packages/ui/package.json`（新增 `react-stately` 直接依赖）
- Modify: `packages/ui/src/toast/types.ts`
- Modify: `packages/ui/src/toast/toast.tsx`
- Modify: `packages/ui/src/toast/index.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/toast/toast.test.tsx`

**Interfaces:**

- Consumes: 无（叶子任务）。
- Produces: `ToastRegion`（重载：`ToastRegion(props: ToastRegionProps<ToastContent>)` 与 `ToastRegion<T>(props: ToastRegionProps<T> & { renderToast: ... })`）、`ToastRenderHelpers`（`{ close: () => void }`）、`toastChromeClassName`（字符串常量）。Task 2 依赖这三者，从 `@repo/ui` 直接 import。

- [ ] **Step 1: 声明 `react-stately` 直接依赖**

`react-aria-components@1.18.0` 锁定依赖 `react-stately@3.47.0`（已在 lockfile 里，只是 `packages/ui` 没直接声明）。`packages/ui/package.json` 的 `"dependencies"` 字段里，在 `"react-aria-components": "^1.18.0"` 后面加一行：

```json
    "react-stately": "3.47.0",
```

```bash
pnpm install
```

预期：无报错，不应出现新增/重复安装的 react-stately 副本（lockfile 里已有相同版本）。

- [ ] **Step 2: 更新 `types.ts`，加泛型与新类型**

把 `packages/ui/src/toast/types.ts` 整个替换为：

```ts
import type { ReactNode } from "react";
import type { UNSTABLE_ToastQueue } from "react-aria-components/Toast";
import type { QueuedToast } from "react-stately/useToastState";

/** Toast 语义类型。 */
export type ToastType = "success" | "error" | "info";

/** Toast 弹出位置，默认 "bottom-right"。 */
export type ToastPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

/** 单条 toast 的内容。 */
export interface ToastContent {
  message: string;
  type?: ToastType;
}

/** 传给 `renderToast` 的操作辅助函数。 */
export interface ToastRenderHelpers {
  /** 直接调用 queue.close(key) 关闭这条 toast，不依赖 slot="close" 的隐式绑定。 */
  close: () => void;
}

/** `ToastRegion` 的 props。 */
export interface ToastRegionProps<T = ToastContent> {
  queue: UNSTABLE_ToastQueue<T>;
  className?: string;
  /** 弹出位置，默认 "bottom-right"（与改版前行为一致）。 */
  position?: ToastPosition;
  /** 单条 toast 容器的宽度/对齐策略覆盖；不传时用简单消息 toast 的默认值。 */
  itemClassName?: string;
  /** 自定义单条 toast 的内部内容；不传时按内置 ToastContent 渲染（图标芯片 + 文字 + 关闭按钮）。 */
  renderToast?: (toast: QueuedToast<T>, helpers: ToastRenderHelpers) => ReactNode;
}
```

- [ ] **Step 3: 更新 `toast.test.tsx`，先加泛型用法的新测试（此时实现代码还没改，新断言应该失败）**

在 `packages/ui/src/toast/toast.test.tsx` 文件末尾、最后一个 `it` 和结尾的 `});` 之间，插入以下三个新测试（保留原有全部内容不变）：

```tsx
it("传入 renderToast 时按自定义内容渲染", () => {
  interface DemoContent {
    label: string;
  }
  const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
  queue.add({ label: "自定义内容" });
  render(<ToastRegion queue={queue} renderToast={(toast) => <span>{toast.content.label}</span>} />);
  expect(screen.getByText("自定义内容")).toBeInTheDocument();
});

it("itemClassName 覆盖默认的宽度与对齐类名", () => {
  interface DemoContent {
    label: string;
  }
  const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
  queue.add({ label: "自定义内容" });
  render(
    <ToastRegion
      queue={queue}
      itemClassName="w-[300px] items-start"
      renderToast={(toast) => <span>{toast.content.label}</span>}
    />,
  );
  const item = screen.getByRole("alertdialog");
  expect(item).toHaveClass("w-[300px]");
  expect(item).toHaveClass("items-start");
  expect(item).not.toHaveClass("w-fit");
});

it("renderToast 的 close helper 能关闭对应 toast", async () => {
  interface DemoContent {
    label: string;
  }
  const user = userEvent.setup();
  const queue = new ToastQueue<DemoContent>({ maxVisibleToasts: 5 });
  queue.add({ label: "可关闭内容" });
  render(
    <ToastRegion
      queue={queue}
      renderToast={(toast, { close }) => (
        <button type="button" onClick={close}>
          关闭 {toast.content.label}
        </button>
      )}
    />,
  );
  const closeBtn = screen.getByRole("button", { name: /可关闭内容/ });
  await user.click(closeBtn);
  expect(screen.queryByText(/可关闭内容/)).not.toBeInTheDocument();
});
```

- [ ] **Step 4: 运行测试，确认新断言按预期失败**

```bash
pnpm test:run packages/ui/src/toast/toast.test.tsx
```

预期：新增的 3 条 FAIL（`ToastRegion` 还不认识 `renderToast`/`itemClassName`，会按 `ToastContent` 默认逻辑去读 `toast.content.type`/`.message`，渲染不出自定义内容，也不会有 `w-[300px]` class）；原有 10 条仍 PASS。

- [ ] **Step 5: 重写 `toast.tsx`**

把 `packages/ui/src/toast/toast.tsx` 整个替换为：

```tsx
"use client";

import type { ReactElement } from "react";
import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon, type IconName } from "@repo/icons";
import { cn } from "../lib/utils";
import type { ToastContent, ToastPosition, ToastRegionProps, ToastType } from "./types";

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

const typeStyles: Record<ToastType, { icon: IconName; chipClass: string }> = {
  success: { icon: "check", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error: { icon: "alert-circle", chipClass: "bg-destructive/12 text-destructive" },
  info: { icon: "info-circle", chipClass: "bg-primary/12 text-primary" },
};

// 各位置对应的锚点 + 堆叠对齐方向（左侧贴左对齐，右侧贴右对齐，居中两侧都收紧）
const positionStyles: Record<ToastPosition, string> = {
  "top-left": "left-4 top-4 items-start",
  "top-center": "left-1/2 top-4 -translate-x-1/2 items-center",
  "top-right": "right-4 top-4 items-end",
  "bottom-left": "left-4 bottom-4 items-start",
  "bottom-center": "left-1/2 bottom-4 -translate-x-1/2 items-center",
  "bottom-right": "right-4 bottom-4 items-end",
};

/** 共享的毛玻璃外观：圆角/边框/底色/阴影/blur/入场动画；不含宽度与对齐，由调用方决定。 */
export const toastChromeClassName =
  "rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter";

// 简单消息 toast 的默认宽度/对齐策略（2026-06-26 改版的值，原样保留）
const DEFAULT_ITEM_CLASS = "w-fit min-w-[15rem] max-w-[min(22rem,calc(100vw-2rem))] items-center";

function defaultRenderToastContent(content: ToastContent) {
  const { icon, chipClass } = typeStyles[content.type ?? "info"];
  return (
    <>
      <span
        className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", chipClass)}
      >
        <SvgIcon name={icon} size={15} />
      </span>
      <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed text-foreground">
        {content.message}
      </AriaToastContent>
      <Button
        slot="close"
        aria-label="关闭通知"
        className="flex size-7 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SvgIcon name="close" size={12} />
      </Button>
    </>
  );
}

export function ToastRegion(props: ToastRegionProps<ToastContent>): ReactElement;
export function ToastRegion<T>(
  props: ToastRegionProps<T> & Required<Pick<ToastRegionProps<T>, "renderToast">>,
): ReactElement;
export function ToastRegion<T>({
  queue,
  className,
  position = "bottom-right",
  itemClassName,
  renderToast,
}: ToastRegionProps<T>): ReactElement {
  return (
    <AriaToastRegion
      queue={queue}
      className={cn(
        "fixed z-[9999] flex flex-col gap-2 outline-none",
        positionStyles[position],
        className,
      )}
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={cn(toastChromeClassName, "flex gap-3", itemClassName ?? DEFAULT_ITEM_CLASS)}
        >
          {renderToast
            ? renderToast(toast, { close: () => queue.close(toast.key) })
            : defaultRenderToastContent(toast.content as ToastContent)}
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
```

- [ ] **Step 6: 再次运行测试，确认全部通过**

```bash
pnpm test:run packages/ui/src/toast/toast.test.tsx
```

预期：13 条全部 PASS。

- [ ] **Step 7: 更新 barrel 导出**

把 `packages/ui/src/toast/index.ts` 整个替换为：

```ts
export { ToastRegion, ToastQueue, toastChromeClassName } from "./toast";
export type {
  ToastContent,
  ToastPosition,
  ToastRegionProps,
  ToastRenderHelpers,
  ToastType,
} from "./types";
```

在 `packages/ui/src/index.ts` 里找到现有的：

```ts
export {
  ToastRegion,
  ToastQueue,
  type ToastContent,
  type ToastPosition,
  type ToastRegionProps,
  type ToastType,
} from "./toast";
```

替换为：

```ts
export {
  ToastRegion,
  ToastQueue,
  toastChromeClassName,
  type ToastContent,
  type ToastPosition,
  type ToastRegionProps,
  type ToastRenderHelpers,
  type ToastType,
} from "./toast";
```

- [ ] **Step 8: 类型检查 + lint**

```bash
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui lint
```

预期：均无报错。

- [ ] **Step 9: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml packages/ui/src/toast/types.ts packages/ui/src/toast/toast.tsx packages/ui/src/toast/toast.test.tsx packages/ui/src/toast/index.ts packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(toast): ToastRegion 支持自定义内容渲染与宽度覆盖
EOF
)"
```

---

### Task 2: `NotificationProvider` 接入 `ToastQueue<NotificationItemResp>`（`apps/web`）

**Files:**

- Modify: `apps/web/components/notifications/notification-provider.tsx`
- Modify: `apps/web/components/notifications/notification-provider.test.tsx`

**Interfaces:**

- Consumes: Task 1 产出的 `ToastRegion`（泛型重载）、`ToastQueue`、`ToastRenderHelpers` 类型，均从 `@repo/ui` 导入。
- Produces: `notificationToastQueue`（导出的 `ToastQueue<NotificationItemResp>` 单例，供测试文件在 `beforeEach` 里调用 `.clear()` 重置）。`NotificationProvider` 对外 props（`{children}`）不变。

- [ ] **Step 1: 更新测试文件（实现代码还没改，新断言应该失败）**

把 `apps/web/components/notifications/notification-provider.test.tsx` 整个替换为：

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NotificationItemResp } from "@repo/api";
import { NotificationProvider, notificationToastQueue } from "./notification-provider";
import { useNotificationStore } from "@/store/use-notification-store";

const mockPush = vi.fn();
const mockUseSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

function notification(overrides: Partial<NotificationItemResp>): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment_created",
    title: "新评论",
    content_excerpt: "写得真好",
    is_read: false,
    created_at: "2026-06-23T00:00:00Z",
    source_type: "comment",
    source_id: 2,
    root_type: "article",
    root_id: 3,
    source_deleted: false,
    root_deleted: false,
    ...overrides,
  };
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", vi.fn());
    useNotificationStore.getState().reset();
    notificationToastQueue.clear();
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("登录后立即拉取未读数和最新未读快照且不建立 SSE 连接", async () => {
    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/notifications/unread-count", undefined);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications?unread_only=true&page=1&page_size=5",
      undefined,
    );
    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("轮询时未读数不变只刷新 count，不补拉列表", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }));

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(8000);
    });
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenLastCalledWith("/api/notifications/unread-count", undefined);
    expect(useNotificationStore.getState().listSyncVersion).toBe(0);
  });

  it("轮询发现未读数变化后补拉最新未读，只弹新增未读并可点击跳转", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            list: [
              notification({
                id: 2,
                root_id: 9,
                root_type: "moment",
                actor_user: { id: 8, nickname: "寒蝉" },
              }),
            ],
          }),
          { status: 200 },
        ),
      );

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(8000);
    });
    await flushAsyncWork();

    expect(useNotificationStore.getState().listSyncVersion).toBe(1);

    const toastButton = screen.getByRole("button", { name: /寒蝉.*评论了你的碎语/ });
    fireEvent.click(toastButton);

    expect(mockPush).toHaveBeenCalledWith("/moments");
  });

  it("点击弹窗的关闭按钮只消失，不触发跳转", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            list: [notification({ id: 2, actor_user: { id: 7, nickname: "萨" } })],
          }),
          { status: 200 },
        ),
      );

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    await act(async () => {
      vi.advanceTimersByTime(8000);
    });
    await flushAsyncWork();

    const user = userEvent.setup({ delay: null });
    const closeButton = screen.getByRole("button", { name: "关闭通知" });
    await user.click(closeButton);

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /萨/ })).not.toBeInTheDocument();
  });

  it("未登录时重置未读数且不建立 SSE", () => {
    useNotificationStore.getState().setUnreadCount(5);
    mockUseSession.mockReturnValue({ userId: null, profile: null });

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(global.EventSource).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

（与原测试文件的差异：新增 `notificationToastQueue` 导入与 `beforeEach` 里的 `.clear()`；新增 `userEvent` 导入；"轮询发现未读数变化..." 用例的 mock 通知加了 `actor_user`，查询断言从 `/新的碎语回复/` 换成 `/寒蝉.*评论了你的碎语/`；新增"点击关闭按钮"用例。）

- [ ] **Step 2: 运行测试，确认新/改的用例按预期失败**

```bash
pnpm test:run apps/web/components/notifications/notification-provider.test.tsx
```

预期：FAIL（`notification-provider.tsx` 还没导出 `notificationToastQueue`，且渲染逻辑还是旧的纯文字弹窗，找不到 `/寒蝉.*评论了你的碎语/` 这样的 button，也没有 `aria-label="关闭通知"` 的按钮）。

- [ ] **Step 3: 重写 `notification-provider.tsx`**

把 `apps/web/components/notifications/notification-provider.tsx` 整个替换为：

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  NotificationItemResp,
  NotificationPageResp,
  NotificationUnreadCountResp,
} from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ToastQueue, ToastRegion } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSession } from "@/app/providers/session-provider";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";
import { getNotificationHref } from "./notification-target";
import {
  getNotificationActionText,
  getNotificationActorName,
  getNotificationQuote,
} from "./notification-type";

const LATEST_UNREAD_PATH = "/api/notifications?unread_only=true&page=1&page_size=5";
const POLL_INTERVAL_MS = 8000;
const MAX_POLL_RETRY_DELAY_MS = 60_000;
const TOAST_TIMEOUT_MS = 6000;

/** 实时消息通知弹窗用的 toast 队列；导出供测试在 beforeEach 里 clear()。 */
export const notificationToastQueue = new ToastQueue<NotificationItemResp>({
  maxVisibleToasts: 3,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userId } = useSession();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const bumpListSync = useNotificationStore((state) => state.bumpListSync);
  const reset = useNotificationStore((state) => state.reset);
  const knownUnreadIdsRef = useRef<Set<number>>(new Set());
  const lastUnreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId == null) {
      knownUnreadIdsRef.current = new Set();
      lastUnreadCountRef.current = null;
      notificationToastQueue.clear();
      reset();
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let retryDelay = POLL_INTERVAL_MS;

    function isPageVisible() {
      return typeof document === "undefined" || document.visibilityState !== "hidden";
    }

    function clearPollTimer() {
      if (pollTimer === undefined) return;
      window.clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    function schedulePoll(delay = POLL_INTERVAL_MS) {
      if (cancelled || !isPageVisible()) return;
      clearPollTimer();
      pollTimer = window.setTimeout(() => {
        pollTimer = undefined;
        void runPoll();
      }, delay);
    }

    async function fetchUnreadCount() {
      const data = await apiJson<NotificationUnreadCountResp>("/api/notifications/unread-count");
      if (!cancelled) setUnreadCount(data.count);
      return data.count;
    }

    async function loadLatestUnread() {
      const data = await apiJson<NotificationPageResp>(LATEST_UNREAD_PATH);
      return data.list.filter((item) => !item.is_read);
    }

    async function seedUnreadSnapshot() {
      try {
        const [count, items] = await Promise.all([fetchUnreadCount(), loadLatestUnread()]);
        if (cancelled) return;
        lastUnreadCountRef.current = count;
        knownUnreadIdsRef.current = new Set(items.map((item) => item.id));
        retryDelay = POLL_INTERVAL_MS;
      } catch {
        // 通知入口不阻塞页面主流程；下次轮询或刷新时会再同步。
        retryDelay = Math.min(retryDelay * 2, MAX_POLL_RETRY_DELAY_MS);
      }
    }

    async function syncLatestUnread(forceLatest = false) {
      try {
        const previousCount = lastUnreadCountRef.current;
        const count = await fetchUnreadCount();
        if (cancelled) return;

        lastUnreadCountRef.current = count;
        if (!forceLatest && previousCount !== null && count === previousCount) {
          retryDelay = POLL_INTERVAL_MS;
          return;
        }

        const items = await loadLatestUnread();
        if (cancelled) return;

        const known = knownUnreadIdsRef.current;
        const freshItems = items.filter((item) => !known.has(item.id));
        knownUnreadIdsRef.current = new Set([...items.map((item) => item.id), ...known]);

        freshItems.forEach((item) =>
          notificationToastQueue.add(item, { timeout: TOAST_TIMEOUT_MS }),
        );
        bumpListSync();
        retryDelay = POLL_INTERVAL_MS;
      } catch {
        // 轮询失败时保持当前徽标，退避后重试，避免打扰用户。
        retryDelay = Math.min(retryDelay * 2, MAX_POLL_RETRY_DELAY_MS);
      }
    }

    async function runPoll(forceLatest = false) {
      if (!isPageVisible()) return;
      await syncLatestUnread(forceLatest);
      schedulePoll(retryDelay);
    }

    function handleVisibilityChange() {
      if (!isPageVisible()) {
        clearPollTimer();
        return;
      }
      retryDelay = POLL_INTERVAL_MS;
      void runPoll(true);
    }

    function handleOnline() {
      retryDelay = POLL_INTERVAL_MS;
      void runPoll(true);
    }

    knownUnreadIdsRef.current = new Set();
    lastUnreadCountRef.current = null;
    void seedUnreadSnapshot().finally(() => schedulePoll(POLL_INTERVAL_MS));

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      clearPollTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [bumpListSync, reset, setUnreadCount, userId]);

  return (
    <>
      {children}
      <ToastRegion
        queue={notificationToastQueue}
        position="top-right"
        className="top-20"
        itemClassName="w-[340px] max-w-[calc(100vw-2rem)] items-start"
        renderToast={(toast, { close }) => {
          const item = toast.content;
          const actorName = getNotificationActorName(item);
          const actionText = getNotificationActionText(item);
          const quote = getNotificationQuote(item);
          return (
            <>
              <UserAvatar
                src={item.actor_user?.avatar_url}
                name={actorName}
                size="md"
                className="mt-0.5"
              />
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer text-left"
                onClick={() => {
                  close();
                  router.push(getNotificationHref(item));
                }}
              >
                <span role="alert" aria-atomic="true" className="block">
                  <p className="truncate text-[13px] text-foreground">
                    <span className="font-semibold">{actorName}</span>{" "}
                    <span className="text-muted-foreground">{actionText}</span>
                  </p>
                  {quote?.text ? (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {quote.title ? `${quote.title} ` : ""}
                      {quote.text}
                    </p>
                  ) : null}
                </span>
              </button>
              <Button
                type="button"
                variant={null}
                size={null}
                aria-label="关闭通知"
                onPress={close}
                className="flex size-7 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <SvgIcon name="close" size={12} />
              </Button>
            </>
          );
        }}
      />
    </>
  );
}
```

注：文字内容用 `<span role="alert" aria-atomic="true">` 包裹（不是 spec 草稿里设想的 `AriaToastContent` 重新导出）——同样的可访问性语义，但不需要在 `packages/ui` 新增一个跟现有类型 `ToastContent` 撞名风险的再导出，更简单。`role="alert"` 必须放在跳转 `<button>` 内部的子元素上，不能直接放在 `<button>` 自身——否则会覆盖按钮的可交互语义。

- [ ] **Step 4: 再次运行测试，确认全部通过**

```bash
pnpm test:run apps/web/components/notifications/notification-provider.test.tsx
```

预期：5 条全部 PASS。

- [ ] **Step 5: 跑通知相关全部测试，确认没有连带破坏**

```bash
pnpm test:run apps/web/components/notifications
```

预期：全部 PASS（之前是 14 个文件 / 120 个测试）。

- [ ] **Step 6: 类型检查 + lint**

```bash
pnpm --filter web check-types
cd apps/web && pnpm exec eslint components/notifications/notification-provider.tsx components/notifications/notification-provider.test.tsx --max-warnings 0
cd ../..
```

预期：均无报错。

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/notifications/notification-provider.tsx apps/web/components/notifications/notification-provider.test.tsx
git commit -m "$(cat <<'EOF'
refactor(notifications): 实时通知弹窗接入统一 ToastQueue 引擎
EOF
)"
```

---

## Self-Review Notes

- **Spec 覆盖**：`ToastRegion` 泛型化 + `itemClassName` + `renderToast` + `ToastRenderHelpers` ✓（Task 1）；共享 `toastChromeClassName` 常量 ✓；函数重载类型安全 ✓；`NotificationProvider` 迁移到 `ToastQueue<NotificationItemResp>`、删掉手写倒计时 effect、`position="top-right"` + `className="top-20"` 覆盖、`itemClassName` 还原旧宽度策略 ✓（Task 2）；测试覆盖（泛型用法 3 条 + notification 弹窗 2 条改/新增）✓。`addToast`/`global-modals.tsx` 不动 ✓。
- **占位符扫描**：两个任务每步都有完整代码与精确命令，无 TBD。
- **类型一致性**：`ToastRenderHelpers.close`、`renderToast` 签名在 Task 1 定义、Task 2 直接消费，参数/返回类型一致；`notificationToastQueue` 的导出名在 Task 2 的实现文件与测试文件里一致。
- 唯一需要实现时留意的点：Step 5（Task 1）的函数重载写法在 `tsc` 严格模式下首次编译如报类型错误，多半是 `Required<Pick<...>>` 与 `ToastRegionProps<T>` 交叉类型在某个 TS 版本下的已知收窄问题，按 spec 风险提示里写的思路调整（不改变对外行为承诺）即可，不需要回头改设计。
