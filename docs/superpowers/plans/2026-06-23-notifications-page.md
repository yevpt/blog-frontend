# 用户消息中心（/notifications）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`-[x]`) syntax for tracking.

**Goal:** 实现 `/notifications` 消息中心页面，支持全部/未读筛选、加载更多、单条标记已读/删除/跳转、批量已读，并补齐写操作的 BFF 代理路由。

**Architecture:** 纯客户端页面（`'use client'`）。客户端取数沿用既有模式 `apiJson`（`@/lib/client-fetch`）直打 BFF 路由 `/api/notifications/**`，BFF 经 `backend-proxy.ts` 转发真后端。写操作后通过 `useNotificationStore.setUnreadCount` 同步导航角标。复用既有 `formatRelativeTime`/`formatDateTime`、`getNotificationHref`、`@repo/ui`、`@repo/icons`。

**Tech Stack:** Next.js App Router、React、TypeScript、TailwindCSS、Zustand、Vitest（jsdom）。

**关联设计文档：** `docs/superpowers/specs/2026-06-23-notifications-page-design.md`

## Global Constraints

- 禁 `any`；用 `unknown` 或精确类型；纯函数 + Early Return。
- 改 Hook → `*.test.ts`、组件 → `*.test.tsx`、页面 → `page.test.tsx`（缺测 = 未完成）。
- UI 复用优先：基础组件来自 `@repo/ui`，图标用 `@repo/icons` 的 `SvgIcon`，禁裸 `<button>`/`<svg>`。
- 客户端通知取数统一用 `apiJson`（对齐 `notification-provider.tsx`），**不**新增 typed `@repo/api` 方法。
- 页面以移动端为基准，`max-w-2xl mx-auto`；页面导出 `metadata`。
- `page_size` 默认 20、最大 50。
- commit message 走 `commit-msg` 钩子强校验（Conventional + 中文 subject）。
- 真后端（Go）为独立仓库，不在本仓库范围；`read-all`/`DELETE` 端点路径以后端实际为准（默认 `POST /notifications/read-all`、`DELETE /notifications/{id}`）。

---

## 任务领取板（Claim Board）

Agent 领取前认领对应任务、完成后勾选。**A 组（T1/T2/T5/T6/T7）互不依赖，可并行启动**；其余按依赖推进。

| 任务 | 模块 | 依赖 | 并行组 | 状态 |
|------|------|------|--------|------|
| T1 | BFF 代理路由（read / read-all / delete） | 无 | A | ☑ |
| T2 | `notification-type.ts` 类型映射 | 无 | A | ☑ |
| T5 | `notification-filter-tabs` 筛选 Tab | 无 | A | ☑ |
| T6 | `notification-selection-bar` 选择操作条 | 无 | A | ☑ |
| T7 | 导航入口 + 跳转兜底修正 | 无 | A | ☑ |
| T3 | `use-notifications` 数据 Hook | T1（运行时）| B | ☑ |
| T4 | `notification-card` 卡片组件 | T2 | B | ☑ |
| T8 | 页面装配 `notifications-page` + 路由 | T3,T4,T5,T6 | C | ☑ |

依赖图：`A 组 → T3(运行时需 T1 路由)/T4(需 T2) → T8(需 T3,T4,T5,T6)`。T3 测试用 mock `apiJson`，与 T1 无代码耦合，可在 T1 完成前编写。

---

## 文件结构

新增：
- `apps/web/app/api/notifications/[id]/read/route.ts`(+`.test.ts`) — PATCH 代理
- `apps/web/app/api/notifications/read-all/route.ts`(+`.test.ts`) — POST 代理
- `apps/web/app/api/notifications/[id]/route.ts`(+`.test.ts`) — DELETE 代理
- `apps/web/components/notifications/notification-type.ts`(+`.test.ts`)
- `apps/web/components/notifications/use-notifications.ts`(+`.test.ts`)
- `apps/web/components/notifications/notification-card.tsx`(+`.test.tsx`)
- `apps/web/components/notifications/notification-filter-tabs.tsx`(+`.test.tsx`)
- `apps/web/components/notifications/notification-selection-bar.tsx`(+`.test.tsx`)
- `apps/web/components/notifications/notifications-page.tsx`(+`.test.tsx`)
- `apps/web/app/notifications/page.tsx`(+`page.test.tsx`)

修改：
- `apps/web/components/notifications/notification-target.ts`（兜底 `/messages`→`/notifications`）+ `notification-target.test.ts`
- `apps/web/components/navbar/navbar-user-menu.tsx`（`/messages`→`/notifications`）+ `navbar-user-menu.test.tsx`

---

## Task 1: BFF 代理路由

**Files:**
- Create: `apps/web/app/api/notifications/[id]/read/route.ts`(+`route.test.ts`)
- Create: `apps/web/app/api/notifications/read-all/route.ts`(+`route.test.ts`)
- Create: `apps/web/app/api/notifications/[id]/route.ts`(+`route.test.ts`)

**Interfaces:**
- Consumes: `proxyPatch(req, path)`、`proxyPost(req, path)`、`proxyDelete(req, path)`（均在 `@/lib/backend-proxy`，已有）。
- Produces: 同源端点 `/api/notifications/{id}/read`(PATCH)、`/api/notifications/read-all`(POST)、`/api/notifications/{id}`(DELETE)。

> Next.js 15 动态段 `params` 为 Promise，handler 需 `await`。现有 GET 路由无动态段，此处建立动态段写法基准。

-[x] **Step 1: 写失败测试**

`apps/web/app/api/notifications/[id]/read/route.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyPatch = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPatch: (...a: unknown[]) => proxyPatch(...a) }));

import { PATCH } from "./route";

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/{id}/read", async () => {
    const req = {} as never;
    await PATCH(req, { params: Promise.resolve({ id: "9" }) });
    expect(proxyPatch).toHaveBeenCalledWith(req, "/notifications/9/read");
  });
});
```

`apps/web/app/api/notifications/read-all/route.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyPost = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPost: (...a: unknown[]) => proxyPost(...a) }));

import { POST } from "./route";

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/read-all", async () => {
    const req = {} as never;
    await POST(req);
    expect(proxyPost).toHaveBeenCalledWith(req, "/notifications/read-all");
  });
});
```

`apps/web/app/api/notifications/[id]/route.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyDelete = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyDelete: (...a: unknown[]) => proxyDelete(...a) }));

import { DELETE } from "./route";

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/{id}", async () => {
    const req = {} as never;
    await DELETE(req, { params: Promise.resolve({ id: "9" }) });
    expect(proxyDelete).toHaveBeenCalledWith(req, "/notifications/9");
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- app/api/notifications`
Expected: FAIL（route 文件不存在）

-[x] **Step 3: 实现路由**

`apps/web/app/api/notifications/[id]/read/route.ts`：

```ts
import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPatch(req, `/notifications/${id}/read`);
}
```

`apps/web/app/api/notifications/read-all/route.ts`：

```ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  return proxyPost(req, "/notifications/read-all");
}
```

`apps/web/app/api/notifications/[id]/route.ts`：

```ts
import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/notifications/${id}`);
}
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- app/api/notifications`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/app/api/notifications
git commit -m "feat(notifications): 新增已读/批量已读/删除 BFF 代理路由"
```

---

## Task 2: 类型映射 notification-type.ts

**Files:**
- Create: `apps/web/components/notifications/notification-type.ts`(+`.test.ts`)

**Interfaces:**
- Consumes: `NotificationItemResp`（`@repo/api`）；图标名取自 `@repo/icons` 可用集：`message-circle`/`heart`/`edit`/`bell`。
- Produces:
  - `interface NotificationVisual { icon: string; label: string; tone: "primary" | "pink" | "neutral" }`
  - `getNotificationVisual(item: NotificationItemResp): NotificationVisual`
  - `TONE_CLASS: Record<tone, { iconWrap: string; pill: string }>`

-[x] **Step 1: 写失败测试**

`notification-type.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import type { NotificationItemResp } from "@repo/api";
import { getNotificationVisual } from "./notification-type";

function item(root_type: string): NotificationItemResp {
  return {
    id: 1, event_id: 1, type: "comment", title: "t", content_excerpt: "",
    is_read: false, created_at: "", source_type: "", source_id: 0,
    root_type, root_id: 1,
  };
}

describe("getNotificationVisual", () => {
  it("article → 评论/紫", () => {
    expect(getNotificationVisual(item("article"))).toMatchObject({ label: "评论", tone: "primary" });
  });
  it("moment → 碎语/粉", () => {
    expect(getNotificationVisual(item("moment"))).toMatchObject({ label: "碎语", tone: "pink" });
  });
  it("guestbook → 留言/中性", () => {
    expect(getNotificationVisual(item("guestbook"))).toMatchObject({ label: "留言", tone: "neutral" });
  });
  it("未知 → 通知/bell", () => {
    expect(getNotificationVisual(item("unknown"))).toMatchObject({ label: "通知", icon: "bell" });
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notification-type`
Expected: FAIL

-[x] **Step 3: 实现映射**

```ts
import type { NotificationItemResp } from "@repo/api";

export interface NotificationVisual {
  icon: string;
  label: string;
  tone: "primary" | "pink" | "neutral";
}

/** 按 root_type 映射通知的图标/胶囊文案/配色，未知类型落到系统通知兜底。 */
export function getNotificationVisual(item: NotificationItemResp): NotificationVisual {
  switch (item.root_type) {
    case "article":
      return { icon: "message-circle", label: "评论", tone: "primary" };
    case "moment":
      return { icon: "heart", label: "碎语", tone: "pink" };
    case "guestbook":
      return { icon: "edit", label: "留言", tone: "neutral" };
    default:
      return { icon: "bell", label: "通知", tone: "neutral" };
  }
}

/** tone → Tailwind 配色类（图标底色 + 胶囊），集中管理避免散落各组件。 */
export const TONE_CLASS: Record<NotificationVisual["tone"], { iconWrap: string; pill: string }> = {
  primary: { iconWrap: "bg-primary/10 text-primary", pill: "bg-primary/10 text-primary" },
  pink: { iconWrap: "bg-pink-500/10 text-pink-600", pill: "bg-pink-500/10 text-pink-600" },
  neutral: { iconWrap: "bg-muted text-muted-foreground", pill: "bg-muted text-muted-foreground" },
};
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- notification-type`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-type.ts apps/web/components/notifications/notification-type.test.ts
git commit -m "feat(notifications): 新增通知类型映射工具"
```

---

## Task 3: 数据 Hook use-notifications

**Files:**
- Create: `apps/web/components/notifications/use-notifications.ts`(+`.test.ts`)

**Interfaces:**
- Consumes: `apiJson`（`@/lib/client-fetch`）；`useNotificationStore`（`setUnreadCount`、`getState().unreadCount`）；类型 `NotificationItemResp`/`NotificationPageResp`/`NotificationReadResp`（`@repo/api`）。
- Produces:
  - `useNotifications({ pageSize?: number }) => { items, unreadOnly, setUnreadOnly, loading, error, hasMore, loadMore, reload, markRead, remove, markReadBatch, markAllRead }`

-[x] **Step 1: 写失败测试**

`use-notifications.test.ts`（jsdom，`renderHook`，mock `apiJson` 与 store）：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { NotificationPageResp } from "@repo/api";
import { useNotifications } from "./use-notifications";

const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }));

const setUnreadCount = vi.fn();
vi.mock("@/store/use-notification-store", () => ({
  useNotificationStore: Object.assign(
    (sel: (s: { setUnreadCount: typeof setUnreadCount }) => unknown) => sel({ setUnreadCount }),
    { getState: () => ({ unreadCount: 5 }) },
  ),
}));

function page(over: Partial<NotificationPageResp> = {}): NotificationPageResp {
  return { total: 1, page: 1, page_size: 20, list: [
    { id: 1, event_id: 1, type: "comment", title: "t", content_excerpt: "", is_read: false,
      created_at: "", source_type: "", source_id: 0, root_type: "article", root_id: 1 },
  ], ...over };
}

describe("useNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("首屏加载列表（unread_only=false）", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(apiJson).toHaveBeenCalledWith("/api/notifications?page=1&page_size=20&unread_only=false");
  });

  it("markRead 调 PATCH 并把该条置已读", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    apiJson.mockResolvedValueOnce({ updated: 1 });
    await act(async () => { await result.current.markRead(1); });
    expect(apiJson).toHaveBeenLastCalledWith("/api/notifications/1/read", { method: "PATCH" });
    expect(result.current.items[0].is_read).toBe(true);
  });

  it("remove 调 DELETE 并从列表移除", async () => {
    apiJson.mockResolvedValueOnce(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    apiJson.mockResolvedValueOnce({ updated: 1 });
    await act(async () => { await result.current.remove(1); });
    expect(result.current.items).toHaveLength(0);
  });

  it("切换 unreadOnly 重新拉取 unread_only=true", async () => {
    apiJson.mockResolvedValue(page());
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => { result.current.setUnreadOnly(true); });
    await waitFor(() =>
      expect(apiJson).toHaveBeenLastCalledWith("/api/notifications?page=1&page_size=20&unread_only=true"),
    );
  });

  it("加载失败置 error", async () => {
    apiJson.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useNotifications({ pageSize: 20 }));
    await waitFor(() => expect(result.current.error).toBe(true));
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- use-notifications`
Expected: FAIL

-[x] **Step 3: 实现 Hook**

```ts
import { useCallback, useEffect, useState } from "react";
import type {
  NotificationItemResp,
  NotificationPageResp,
  NotificationReadResp,
} from "@repo/api";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";

interface UseNotificationsOptions {
  pageSize?: number;
}

export function useNotifications({ pageSize = 20 }: UseNotificationsOptions = {}) {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const [items, setItems] = useState<NotificationItemResp[]>([]);
  const [unreadOnly, setUnreadOnlyState] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean, unread: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const data = await apiJson<NotificationPageResp>(
          `/api/notifications?page=${nextPage}&page_size=${pageSize}&unread_only=${unread}`,
        );
        setTotal(data.total);
        setPage(data.page);
        setItems((cur) => (replace ? data.list : [...cur, ...data.list]));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    void fetchPage(1, true, unreadOnly);
  }, [fetchPage, unreadOnly]);

  const setUnreadOnly = useCallback((v: boolean) => setUnreadOnlyState(v), []);
  const reload = useCallback(() => fetchPage(1, true, unreadOnly), [fetchPage, unreadOnly]);
  const loadMore = useCallback(
    () => fetchPage(page + 1, false, unreadOnly),
    [fetchPage, page, unreadOnly],
  );

  // 本地把若干条置已读，并按实际由未读转已读的数量递减角标
  const applyRead = useCallback(
    (ids: Set<number>) => {
      setItems((cur) => {
        let freshlyRead = 0;
        const next = cur.map((it) => {
          if (ids.has(it.id) && !it.is_read) {
            freshlyRead += 1;
            return { ...it, is_read: true };
          }
          return it;
        });
        if (freshlyRead > 0) {
          setUnreadCount(useNotificationStore.getState().unreadCount - freshlyRead);
        }
        return next;
      });
    },
    [setUnreadCount],
  );

  const markRead = useCallback(
    async (id: number) => {
      await apiJson<NotificationReadResp>(`/api/notifications/${id}/read`, { method: "PATCH" });
      applyRead(new Set([id]));
    },
    [applyRead],
  );

  const markReadBatch = useCallback(
    async (ids: number[]) => {
      await apiJson<NotificationReadResp>("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      applyRead(new Set(ids));
    },
    [applyRead],
  );

  const markAllRead = useCallback(async () => {
    await apiJson<NotificationReadResp>("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((cur) => cur.map((it) => ({ ...it, is_read: true })));
    setUnreadCount(0);
  }, [setUnreadCount]);

  const remove = useCallback(
    async (id: number) => {
      await apiJson<NotificationReadResp>(`/api/notifications/${id}`, { method: "DELETE" });
      setItems((cur) => {
        const target = cur.find((it) => it.id === id);
        if (target && !target.is_read) {
          setUnreadCount(useNotificationStore.getState().unreadCount - 1);
        }
        return cur.filter((it) => it.id !== id);
      });
    },
    [setUnreadCount],
  );

  const hasMore = items.length < total;

  return {
    items, unreadOnly, setUnreadOnly, loading, error, hasMore,
    loadMore, reload, markRead, remove, markReadBatch, markAllRead,
  };
}
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- use-notifications`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/use-notifications.ts apps/web/components/notifications/use-notifications.test.ts
git commit -m "feat(notifications): 新增消息列表数据 Hook"
```

---

## Task 4: 卡片组件 notification-card

**Files:**
- Create: `apps/web/components/notifications/notification-card.tsx`(+`.test.tsx`)

**Interfaces:**
- Consumes: `getNotificationVisual`/`TONE_CLASS`（T2）；`formatRelativeTime`/`formatDateTime`（`@/lib/format-time`）；`SvgIcon`（`@repo/icons`）；`Button`/`cn`（`@repo/ui`）。
- Produces:
  - props `{ item: NotificationItemResp; selecting: boolean; selected: boolean; onOpen(item); onRead(id); onRemove(id); onToggleSelect(id) }`
  - default export `NotificationCard`

-[x] **Step 1: 写失败测试**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { NotificationItemResp } from "@repo/api";
import NotificationCard from "./notification-card";

vi.mock("@repo/icons", () => ({ SvgIcon: ({ name }: { name: string }) => <span data-icon={name} /> }));
vi.mock("@repo/ui", () => ({
  Button: ({ children, onPress, ...p }: never) => <button onClick={onPress} {...p}>{children}</button>,
  cn: (...a: unknown[]) => a.filter(Boolean).join(" "),
}));

function item(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return { id: 1, event_id: 1, type: "comment", title: "有人回复了你", content_excerpt: "正文",
    is_read: false, created_at: "2026-06-23T10:00:00Z", source_type: "", source_id: 0,
    root_type: "article", root_id: 5, ...over };
}

describe("NotificationCard", () => {
  it("未读显示标记已读按钮，点击触发 onRead", () => {
    const onRead = vi.fn();
    render(<NotificationCard item={item()} selecting={false} selected={false}
      onOpen={vi.fn()} onRead={onRead} onRemove={vi.fn()} onToggleSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("标记已读"));
    expect(onRead).toHaveBeenCalledWith(1);
  });

  it("已读不显示标记已读按钮", () => {
    render(<NotificationCard item={item({ is_read: true })} selecting={false} selected={false}
      onOpen={vi.fn()} onRead={vi.fn()} onRemove={vi.fn()} onToggleSelect={vi.fn()} />);
    expect(screen.queryByLabelText("标记已读")).toBeNull();
  });

  it("点击卡片主体触发 onOpen", () => {
    const onOpen = vi.fn();
    render(<NotificationCard item={item()} selecting={false} selected={false}
      onOpen={onOpen} onRead={vi.fn()} onRemove={vi.fn()} onToggleSelect={vi.fn()} />);
    fireEvent.click(screen.getByText("有人回复了你"));
    expect(onOpen).toHaveBeenCalled();
  });

  it("选择模式下点击主体触发 onToggleSelect 而非 onOpen", () => {
    const onOpen = vi.fn(); const onToggleSelect = vi.fn();
    render(<NotificationCard item={item()} selecting selected={false}
      onOpen={onOpen} onRead={vi.fn()} onRemove={vi.fn()} onToggleSelect={onToggleSelect} />);
    fireEvent.click(screen.getByText("有人回复了你"));
    expect(onToggleSelect).toHaveBeenCalledWith(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notification-card`
Expected: FAIL

-[x] **Step 3: 实现组件**

```tsx
"use client";

import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { formatDateTime, formatRelativeTime } from "@/lib/format-time";
import { getNotificationVisual, TONE_CLASS } from "./notification-type";

interface NotificationCardProps {
  item: NotificationItemResp;
  selecting: boolean;
  selected: boolean;
  onOpen: (item: NotificationItemResp) => void;
  onRead: (id: number) => void;
  onRemove: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

export default function NotificationCard({
  item, selecting, selected, onOpen, onRead, onRemove, onToggleSelect,
}: NotificationCardProps) {
  const visual = getNotificationVisual(item);
  const tone = TONE_CLASS[visual.tone];
  const unread = !item.is_read;
  const created = item.created_at ? new Date(item.created_at) : null;

  function handleBody() {
    if (selecting) onToggleSelect(item.id);
    else onOpen(item);
  }

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors",
        unread ? "bg-primary/5" : "bg-card opacity-90",
      )}
    >
      {selecting && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label="选择该通知"
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
      )}
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone.iconWrap)}>
        <SvgIcon name={visual.icon} size={18} />
      </span>

      <button type="button" onClick={handleBody} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          {unread && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" aria-hidden />}
          <span className={cn("truncate text-sm font-medium", unread ? "text-foreground" : "text-muted-foreground")}>
            {item.title || "你有一条新消息"}
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", tone.pill)}>{visual.label}</span>
        </span>
        {item.content_excerpt && (
          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-muted-foreground">
            {item.content_excerpt}
          </span>
        )}
        {created && (
          <span className="mt-1 block text-xs text-muted-foreground/80" title={formatDateTime(created)}>
            {formatRelativeTime(created)}
          </span>
        )}
      </button>

      {!selecting && (
        <span className="flex flex-col gap-1.5 self-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          {unread && (
            <Button type="button" variant={null} size={null} aria-label="标记已读"
              onPress={() => onRead(item.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06]">
              <SvgIcon name="check" size={16} />
            </Button>
          )}
          <Button type="button" variant={null} size={null} aria-label="删除"
            onPress={() => onRemove(item.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-destructive/80 hover:bg-destructive/[0.08]">
            <SvgIcon name="trash" size={16} />
          </Button>
        </span>
      )}
    </div>
  );
}
```

> 注：`@repo/ui` 的 `Button` props（`variant`/`size`/`onPress`）对齐 navbar 现有写法；实现前确认 `cn` 是否从 `@repo/ui` 导出（grep 既有 import），不一致则改为实际来源。

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- notification-card`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-card.tsx apps/web/components/notifications/notification-card.test.tsx
git commit -m "feat(notifications): 新增通知卡片组件"
```

---

## Task 5: 筛选 Tab notification-filter-tabs

**Files:**
- Create: `apps/web/components/notifications/notification-filter-tabs.tsx`(+`.test.tsx`)

**Interfaces:**
- Consumes: `cn`（`@repo/ui`）。
- Produces: props `{ unreadOnly: boolean; unreadCount: number; onChange(unreadOnly: boolean) }`，default export `NotificationFilterTabs`。

-[x] **Step 1: 写失败测试**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationFilterTabs from "./notification-filter-tabs";

vi.mock("@repo/ui", () => ({ cn: (...a: unknown[]) => a.filter(Boolean).join(" ") }));

describe("NotificationFilterTabs", () => {
  it("点击未读触发 onChange(true)", () => {
    const onChange = vi.fn();
    render(<NotificationFilterTabs unreadOnly={false} unreadCount={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /未读/ }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("未读计数 > 0 时显示徽标", () => {
    render(<NotificationFilterTabs unreadOnly={false} unreadCount={3} onChange={vi.fn()} />);
    expect(screen.getByText("3")).toBeTruthy();
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notification-filter-tabs`
Expected: FAIL

-[x] **Step 3: 实现组件**

```tsx
"use client";

import { cn } from "@repo/ui";

interface NotificationFilterTabsProps {
  unreadOnly: boolean;
  unreadCount: number;
  onChange: (unreadOnly: boolean) => void;
}

export default function NotificationFilterTabs({ unreadOnly, unreadCount, onChange }: NotificationFilterTabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      <button type="button" role="tab" aria-selected={!unreadOnly} onClick={() => onChange(false)}
        className={cn("px-1 py-2 text-sm", !unreadOnly
          ? "border-b-2 border-primary font-medium text-foreground"
          : "text-muted-foreground")}>
        全部
      </button>
      <button type="button" role="tab" aria-selected={unreadOnly} onClick={() => onChange(true)}
        className={cn("flex items-center gap-1.5 px-3 py-2 text-sm", unreadOnly
          ? "border-b-2 border-primary font-medium text-foreground"
          : "text-muted-foreground")}>
        未读
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- notification-filter-tabs`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-filter-tabs.tsx apps/web/components/notifications/notification-filter-tabs.test.tsx
git commit -m "feat(notifications): 新增全部/未读筛选 Tab"
```

---

## Task 6: 选择操作条 notification-selection-bar

**Files:**
- Create: `apps/web/components/notifications/notification-selection-bar.tsx`(+`.test.tsx`)

**Interfaces:**
- Consumes: `Button`（`@repo/ui`）、`SvgIcon`（`@repo/icons`）。
- Produces: props `{ count: number; onMarkRead(); onCancel() }`，default export `NotificationSelectionBar`。

-[x] **Step 1: 写失败测试**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationSelectionBar from "./notification-selection-bar";

vi.mock("@repo/icons", () => ({ SvgIcon: ({ name }: { name: string }) => <span data-icon={name} /> }));
vi.mock("@repo/ui", () => ({
  Button: ({ children, onPress, isDisabled, ...p }: never) =>
    <button onClick={onPress} disabled={isDisabled} {...p}>{children}</button>,
}));

describe("NotificationSelectionBar", () => {
  it("显示已选数量并触发标记已读", () => {
    const onMarkRead = vi.fn();
    render(<NotificationSelectionBar count={2} onMarkRead={onMarkRead} onCancel={vi.fn()} />);
    expect(screen.getByText(/已选 2 条/)).toBeTruthy();
    fireEvent.click(screen.getByText("标记已读"));
    expect(onMarkRead).toHaveBeenCalled();
  });

  it("count 为 0 时标记已读禁用", () => {
    render(<NotificationSelectionBar count={0} onMarkRead={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("标记已读").closest("button")?.disabled).toBe(true);
  });
});
```

> 测试里把 `@repo/ui` Button 的 `isDisabled` 映射成原生 `disabled` 以便断言；实现用 `isDisabled`（与 navbar 现有 Button 用法一致）。

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notification-selection-bar`
Expected: FAIL

-[x] **Step 3: 实现组件**

```tsx
"use client";

import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface NotificationSelectionBarProps {
  count: number;
  onMarkRead: () => void;
  onCancel: () => void;
}

export default function NotificationSelectionBar({ count, onMarkRead, onCancel }: NotificationSelectionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
      <span className="text-sm text-muted-foreground">已选 {count} 条</span>
      <span className="flex gap-2">
        <Button type="button" variant={null} size={null} isDisabled={count === 0} onPress={onMarkRead}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">
          <SvgIcon name="check" size={15} />
          标记已读
        </Button>
        <Button type="button" variant={null} size={null} onPress={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
          取消
        </Button>
      </span>
    </div>
  );
}
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- notification-selection-bar`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-selection-bar.tsx apps/web/components/notifications/notification-selection-bar.test.tsx
git commit -m "feat(notifications): 新增批量选择操作条"
```

---

## Task 7: 导航入口与跳转兜底修正

**Files:**
- Modify: `apps/web/components/notifications/notification-target.ts`（兜底 return）+ `notification-target.test.ts`
- Modify: `apps/web/components/navbar/navbar-user-menu.tsx:130`（`navigate("/messages")`）+ `navbar-user-menu.test.tsx`

**Interfaces:** 无新增导出，仅改目标字符串。

-[x] **Step 1: 写/改失败测试**

`notification-target.test.ts` 增/改兜底断言（沿用文件里已有的 `base` 夹具；若无则参照已有用例构造一个最小 `NotificationItemResp`）：

```ts
it("未知 root_type 兜底到 /notifications", () => {
  expect(getNotificationHref({ ...base, root_type: "x", root_id: 1 } as never)).toBe("/notifications");
});
```

`navbar-user-menu.test.tsx`：定位断言「我的消息」跳转 `/messages` 的用例，把期望值改为 `/notifications`。

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notification-target navbar-user-menu`
Expected: FAIL（仍是 /messages）

-[x] **Step 3: 改实现**

`notification-target.ts` 兜底：

```ts
  return "/notifications";
```

`navbar-user-menu.tsx:130`：

```tsx
          onPress={() => navigate("/notifications")}
```

-[x] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- notification-target navbar-user-menu`
Expected: PASS

-[x] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-target.ts apps/web/components/notifications/notification-target.test.ts apps/web/components/navbar/navbar-user-menu.tsx apps/web/components/navbar/navbar-user-menu.test.tsx
git commit -m "fix(notifications): 消息入口与跳转兜底改为 /notifications"
```

---

## Task 8: 页面装配 notifications-page + 路由

**Files:**
- Create: `apps/web/components/notifications/notifications-page.tsx`(+`.test.tsx`)
- Create: `apps/web/app/notifications/page.tsx`(+`page.test.tsx`)

**Interfaces:**
- Consumes: `useNotifications`（T3）、`NotificationCard`（T4）、`NotificationFilterTabs`（T5）、`NotificationSelectionBar`（T6）、`useNotificationStore`、`getNotificationHref`、`useRouter`（`next/navigation`）。
- Produces: `NotificationsPage`（default export 客户端容器）；路由 `page.tsx` 渲染它并导出 `metadata`。

-[x] **Step 1: 写失败测试（容器）**

`notifications-page.test.tsx`（mock Hook + 子组件 + store + router）：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const hook = {
  items: [] as unknown[], unreadOnly: false, setUnreadOnly: vi.fn(),
  loading: false, error: false, hasMore: false,
  loadMore: vi.fn(), reload: vi.fn(), markRead: vi.fn(),
  remove: vi.fn(), markReadBatch: vi.fn(), markAllRead: vi.fn(),
};
vi.mock("./use-notifications", () => ({ useNotifications: () => hook }));
vi.mock("@/store/use-notification-store", () => ({
  useNotificationStore: (sel: (s: { unreadCount: number }) => unknown) => sel({ unreadCount: 0 }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@repo/ui", () => ({
  Button: ({ children, onPress, isDisabled, ...p }: never) =>
    <button onClick={onPress} disabled={isDisabled} {...p}>{children}</button>,
}));
vi.mock("@repo/icons", () => ({ SvgIcon: ({ name }: { name: string }) => <span data-icon={name} /> }));
vi.mock("./notification-card", () => ({ default: () => <div data-testid="card" /> }));
vi.mock("./notification-filter-tabs", () => ({ default: () => <div data-testid="tabs" /> }));
vi.mock("./notification-selection-bar", () => ({ default: () => <div data-testid="bar" /> }));

import NotificationsPage from "./notifications-page";

describe("NotificationsPage", () => {
  it("无数据显示空状态", () => {
    hook.error = false; hook.items = [];
    render(<NotificationsPage />);
    expect(screen.getByText(/还没有消息|没有未读/)).toBeTruthy();
  });

  it("错误态显示重试并触发 reload", () => {
    hook.error = true;
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("重试"));
    expect(hook.reload).toHaveBeenCalled();
    hook.error = false;
  });
});
```

-[x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- notifications-page`
Expected: FAIL

-[x] **Step 3: 实现容器**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useNotificationStore } from "@/store/use-notification-store";
import { useNotifications } from "./use-notifications";
import { getNotificationHref } from "./notification-target";
import NotificationCard from "./notification-card";
import NotificationFilterTabs from "./notification-filter-tabs";
import NotificationSelectionBar from "./notification-selection-bar";

export default function NotificationsPage() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const n = useNotifications({ pageSize: 20 });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function openItem(item: NotificationItemResp) {
    if (!item.is_read) await n.markRead(item.id);
    router.push(getNotificationHref(item));
  }

  async function batchRead() {
    await n.markReadBatch([...selected]);
    exitSelect();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-medium text-foreground">消息中心</h1>
          <span className="text-[13px] text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} 条未读` : "全部已读"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant={null} size={null}
            onPress={() => (selecting ? exitSelect() : setSelecting(true))}
            className="rounded-lg border border-border px-3 py-1.5 text-[13px]">
            {selecting ? "取消" : "选择"}
          </Button>
          <Button type="button" variant={null} size={null} isDisabled={unreadCount === 0}
            onPress={n.markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] disabled:opacity-50">
            <SvgIcon name="check" size={15} />
            全部已读
          </Button>
        </div>
      </header>

      <NotificationFilterTabs unreadOnly={n.unreadOnly} unreadCount={unreadCount}
        onChange={(v) => { exitSelect(); n.setUnreadOnly(v); }} />

      <div className="mt-3.5">
        {n.error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">加载失败了</p>
            <Button type="button" variant={null} size={null} onPress={n.reload}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm">
              <SvgIcon name="refresh-cw" size={15} />
              重试
            </Button>
          </div>
        ) : n.loading && n.items.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : n.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <SvgIcon name="bell" size={28} />
            <p className="text-sm">{n.unreadOnly ? "没有未读消息" : "这里还没有消息"}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {n.items.map((item) => (
                <NotificationCard key={item.id} item={item} selecting={selecting}
                  selected={selected.has(item.id)} onOpen={openItem} onRead={n.markRead}
                  onRemove={n.remove} onToggleSelect={toggleSelect} />
              ))}
            </div>
            {n.hasMore && (
              <div className="mt-3.5 flex justify-center">
                <Button type="button" variant={null} size={null} isDisabled={n.loading}
                  onPress={n.loadMore}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2 text-[13px] disabled:opacity-50">
                  {n.loading ? "加载中…" : "加载更多"}
                  {!n.loading && <SvgIcon name="chevron-down" size={15} />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selecting && (
        <NotificationSelectionBar count={selected.size} onMarkRead={batchRead} onCancel={exitSelect} />
      )}
    </main>
  );
}
```

> 注：`SvgIcon`/`Button` import 与全项目一致即可；`useNotifications` 不再注入 client，内部直连 `apiJson`。

-[x] **Step 4: 写路由 page.tsx + page.test.tsx**

`apps/web/app/notifications/page.tsx`：

```tsx
import type { Metadata } from "next";
import NotificationsPage from "@/components/notifications/notifications-page";

export const metadata: Metadata = {
  title: "消息中心 | Yevpt's Blog",
  description: "查看你的站内通知与互动消息",
};

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
```

`apps/web/app/notifications/page.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/notifications/notifications-page", () => ({
  default: () => <div data-testid="notifications-page" />,
}));

import NotificationsRoute, { metadata } from "./page";

describe("NotificationsRoute", () => {
  it("导出 metadata 标题", () => {
    expect(metadata.title).toContain("消息中心");
  });
  it("渲染消息中心容器", () => {
    const { getByTestId } = render(<NotificationsRoute />);
    expect(getByTestId("notifications-page")).toBeTruthy();
  });
});
```

-[x] **Step 5: 跑全部相关测试确认通过**

Run: `pnpm --filter web test -- notifications-page app/notifications`
Expected: PASS

-[x] **Step 6: 类型与 lint 全量校验**

Run: `pnpm -r --if-present check-types && pnpm -r --if-present lint`
Expected: 全 Done 无错误

-[x] **Step 7: 提交**

```bash
git add apps/web/components/notifications/notifications-page.tsx apps/web/components/notifications/notifications-page.test.tsx apps/web/app/notifications
git commit -m "feat(notifications): 新增消息中心页面与路由"
```

---

## 验证（全部任务完成后）

-[x] `pnpm -r --if-present check-types` 全绿
-[x] `pnpm -r --if-present lint` 全绿
-[x] `pnpm --filter web test` 全绿
-[x] 起 dev server，登录态下访问 `/notifications`：全部/未读切换、加载更多、单条标记已读/删除/跳转、选择模式批量已读、空/错误态、导航角标随操作同步。

## Self-Review 记录

- Spec 覆盖：筛选(T5/T8)、加载更多(T3/T8)、单条展示(T4)、单条操作(T4/T3)、批量(T6/T3/T8)、空/加载/错误(T8)、跳转规则(T7)、BFF 对接(T1)、客户端取数走 apiJson(T3)、角标同步(T3)、metadata(T8)、测试(各任务)——均有对应任务。
- 类型一致性：`getNotificationVisual`/`TONE_CLASS`(T2) 被 T4 消费；`useNotifications` 返回成员名在 T3 定义、T8 使用一致；`markReadBatch`/`markAllRead`/`remove`/`markRead` 命名贯穿一致。
- 架构修正：放弃给 `@repo/api` 加 typed 写方法（会成死代码），客户端统一 `apiJson` 直打 BFF，对齐既有 `notification-provider.tsx`。
- 待实现期确认（非计划缺口，均为低风险探查点）：`@repo/ui` 的 `cn` 导出来源与 `Button` 的 `isDisabled` prop 名；`notification-target.test.ts` 既有夹具名。
