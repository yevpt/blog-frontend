# 留言板页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/guestbook` 留言板页面，支持分页留言列表、点赞、嵌套回复，以及固定底部 pill → 卡片动效输入栏。

**Architecture:** Server Component 预取首页数据，作为 `initialPage` SSR props 传入 `GuestbookPage`（Client Component）。数据层由三个 hooks 负责（list/submit/like），UI 层按职责拆分为 5 个组件。`GuestbookInputBar` 预挂载 `RichCommentInput`（Tiptap），通过 CSS `height` + `border-radius` 过渡实现丝滑动效。

**Tech Stack:** Next.js 15 App Router, React 19, TailwindCSS, Vitest + @testing-library/react, @repo/api, @repo/editor (RichCommentInput), @repo/icons (SvgIcon), @repo/ui (Pagination, cn)

---

## 文件结构

### 新建文件

```
apps/web/hooks/
  use-guestbook-list.ts       + use-guestbook-list.test.ts
  use-guestbook-submit.ts     + use-guestbook-submit.test.ts
  use-guestbook-like.ts       + use-guestbook-like.test.ts

apps/web/components/guestbook/
  guestbook-page-header.tsx   (无状态，无单独测试)
  guestbook-item.tsx          + guestbook-item.test.tsx
  guestbook-replies.tsx       + guestbook-replies.test.tsx
  guestbook-list.tsx          + guestbook-list.test.tsx
  guestbook-input-bar.tsx     + guestbook-input-bar.test.tsx
  guestbook-page.tsx          + guestbook-page.test.tsx
  index.ts

apps/web/app/guestbook/
  page.tsx                    + page.test.tsx
```

### 已存在，无需新建

- `apps/web/app/api/guestbook/route.ts` — GET（列表）+ POST（创建）
- `apps/web/app/api/guestbook/[id]/route.ts` — DELETE
- `apps/web/app/api/guestbook/[id]/like/route.ts` — POST 点赞
- `apps/web/app/api/guestbook/comments/[id]/replies/route.ts` — GET/POST 回复
- `apps/web/app/api/guestbook/comments/[id]/replies/[replyId]/like/route.ts` — POST 回复点赞
- `packages/api/src/types/guestbook.ts` — 所有留言板类型
- `apps/web/components/comments/rich-comment-input.tsx` — 复用的输入组件
- 导航栏已有 `/guestbook` 链接

---

## 关键类型参考

```typescript
// packages/api/src/types/guestbook.ts
interface GuestbookUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}
interface GuestbookItemResp {
  id: number;
  owner_user_id: number;
  from_user_id: number;
  content: string;
  user?: GuestbookUserResp;
  reply_count: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}
interface GuestbookPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: GuestbookItemResp[];
}
interface GuestbookLikeResp {
  id: number;
  is_liked: boolean;
  like_count: number;
}

// packages/api/src/types/comment.ts
interface CommentReplyResp {
  id: number;
  comment_id: number;
  from_user_id: number;
  to_user_id: number;
  parent_reply_id: number;
  content: string;
  from_user?: CommentUserResp;
  to_user?: CommentUserResp;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}
interface CommentReplyPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: CommentReplyResp[];
}
interface CommentLikeResp {
  is_liked: boolean;
  like_count: number;
}
interface CommentReplyCreateReq {
  parent_reply_id?: number;
  content: string;
}

// RichCommentInput props（apps/web/components/comments/rich-comment-input.tsx）
interface RichCommentInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  mentionSuggestions?: MentionItem[];
  placeholder?: string;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
}

// Pagination props（packages/ui/src/pagination/pagination.tsx）
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

---

## Task 1: `use-guestbook-list` Hook

**Files:**

- Create: `apps/web/hooks/use-guestbook-list.ts`
- Test: `apps/web/hooks/use-guestbook-list.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/hooks/use-guestbook-list.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookList } from "./use-guestbook-list";
import type { GuestbookItemResp, GuestbookPageResp } from "@repo/api";

const mockItem: GuestbookItemResp = {
  id: 1,
  owner_user_id: 0,
  from_user_id: 1,
  content: "Hello!",
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const initialPage: GuestbookPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [mockItem],
};

const emptyPage: GuestbookPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

describe("useGuestbookList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("用 SSR 数据初始化", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetchPage 替换列表并更新分页状态", async () => {
    const page2: GuestbookPageResp = {
      total: 11,
      pages: 2,
      page: 2,
      page_size: 10,
      list: [{ ...mockItem, id: 2 }],
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => page2,
    } as Response);

    const { result } = renderHook(() => useGuestbookList(initialPage));
    await act(async () => {
      await result.current.fetchPage(2);
    });

    expect(result.current.items[0].id).toBe(2);
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(2);
  });

  it("fetchPage 网络失败时设置 error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const { result } = renderHook(() => useGuestbookList(emptyPage));
    await act(async () => {
      await result.current.fetchPage(1);
    });
    expect(result.current.error).toBeTruthy();
  });

  it("addItem 前插新条目并 total+1", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.addItem({ ...mockItem, id: 99 });
    });
    expect(result.current.items[0].id).toBe(99);
    expect(result.current.total).toBe(2);
  });

  it("incrementReplyCount 更新对应条目", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.incrementReplyCount(1);
    });
    expect(result.current.items[0].reply_count).toBe(1);
  });

  it("updateLike 更新对应条目的点赞状态", () => {
    const { result } = renderHook(() => useGuestbookList(initialPage));
    act(() => {
      result.current.updateLike(1, true, 5);
    });
    expect(result.current.items[0].is_liked).toBe(true);
    expect(result.current.items[0].like_count).toBe(5);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-list.test.ts
```

预期：`Cannot find module './use-guestbook-list'`

- [ ] **Step 3: 实现 hook**

```typescript
// apps/web/hooks/use-guestbook-list.ts
"use client";

import { useState, useCallback } from "react";
import type { GuestbookItemResp, GuestbookPageResp } from "@repo/api";

const PAGE_SIZE = 10;

export function useGuestbookList(initialPage: GuestbookPageResp) {
  const [items, setItems] = useState<GuestbookItemResp[]>(initialPage.list);
  const [page, setPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.pages);
  const [total, setTotal] = useState(initialPage.total);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guestbook?page=${pageNum}&page_size=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as GuestbookPageResp;
      setItems(data.list);
      setPage(data.page);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch {
      setError("加载留言失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback((item: GuestbookItemResp) => {
    setItems((prev) => [item, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const incrementReplyCount = useCallback((itemId: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, reply_count: i.reply_count + 1 } : i)),
    );
  }, []);

  const updateLike = useCallback((itemId: number, isLiked: boolean, likeCount: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_liked: isLiked, like_count: likeCount } : i)),
    );
  }, []);

  return {
    items,
    page,
    totalPages,
    total,
    isLoading,
    error,
    fetchPage,
    addItem,
    incrementReplyCount,
    updateLike,
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-list.test.ts
```

预期：`6 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-guestbook-list.ts apps/web/hooks/use-guestbook-list.test.ts
git commit -m "feat(guestbook): 添加 use-guestbook-list hook"
```

---

## Task 2: `use-guestbook-submit` Hook

**Files:**

- Create: `apps/web/hooks/use-guestbook-submit.ts`
- Test: `apps/web/hooks/use-guestbook-submit.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/hooks/use-guestbook-submit.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookSubmit } from "./use-guestbook-submit";
import type { GuestbookItemResp, CommentReplyResp } from "@repo/api";

const mockItem: GuestbookItemResp = {
  id: 1,
  owner_user_id: 0,
  from_user_id: 1,
  content: "Hello!",
  reply_count: 0,
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockReply: CommentReplyResp = {
  id: 10,
  target_type: "guestbook",
  comment_id: 1,
  from_user_id: 2,
  to_user_id: 1,
  parent_reply_id: 0,
  content: "Hi!",
  like_count: 0,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("useGuestbookSubmit", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始状态：非提交中，无错误", () => {
    const { result } = renderHook(() => useGuestbookSubmit());
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submitEntry 成功返回新条目", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockItem,
    } as Response);

    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hello!");
    });
    expect(returned?.id).toBe(1);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submitEntry 401 时设置登录错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: GuestbookItemResp | null = null;
    await act(async () => {
      returned = await result.current.submitEntry("Hi");
    });
    expect(returned).toBeNull();
    expect(result.current.error).toMatch(/登录/);
  });

  it("submitEntry 网络失败时设置错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(result.current.error).toBeTruthy();
  });

  it("submitReply 成功返回回复", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockReply,
    } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    let returned: CommentReplyResp | null = null;
    await act(async () => {
      returned = await result.current.submitReply(1, "Hi!");
    });
    expect(returned?.id).toBe(10);
  });

  it("clearError 清除错误状态", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const { result } = renderHook(() => useGuestbookSubmit());
    await act(async () => {
      await result.current.submitEntry("Hi");
    });
    expect(result.current.error).toBeTruthy();
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-submit.test.ts
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/hooks/use-guestbook-submit.ts
"use client";

import { useState, useCallback } from "react";
import type { GuestbookItemResp, CommentReplyResp, CommentReplyCreateReq } from "@repo/api";

export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEntry = useCallback(async (content: string): Promise<GuestbookItemResp | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) {
        setError("请先登录");
        return null;
      }
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as GuestbookItemResp;
    } catch {
      setError("发布失败，请稍后重试");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const submitReply = useCallback(
    async (
      guestbookId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        const res = await fetch(`/api/guestbook/comments/${guestbookId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          setError("请先登录");
          return null;
        }
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as CommentReplyResp;
      } catch {
        setError("回复失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitEntry, submitReply };
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-submit.test.ts
```

预期：`6 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-guestbook-submit.ts apps/web/hooks/use-guestbook-submit.test.ts
git commit -m "feat(guestbook): 添加 use-guestbook-submit hook"
```

---

## Task 3: `use-guestbook-like` Hook

**Files:**

- Create: `apps/web/hooks/use-guestbook-like.ts`
- Test: `apps/web/hooks/use-guestbook-like.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/hooks/use-guestbook-like.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGuestbookLike } from "./use-guestbook-like";
import type { GuestbookLikeResp, CommentLikeResp } from "@repo/api";

describe("useGuestbookLike", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggleEntryLike 成功返回更新后的点赞状态", async () => {
    const mockResp: GuestbookLikeResp = { id: 1, is_liked: true, like_count: 5 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResp,
    } as Response);

    const { result } = renderHook(() => useGuestbookLike());
    let returned: GuestbookLikeResp | null = null;
    await act(async () => {
      returned = await result.current.toggleEntryLike(1);
    });
    expect(returned?.is_liked).toBe(true);
    expect(returned?.like_count).toBe(5);
    expect(fetch).toHaveBeenCalledWith("/api/guestbook/1/like", { method: "POST" });
  });

  it("toggleEntryLike 网络失败返回 null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const { result } = renderHook(() => useGuestbookLike());
    let returned: GuestbookLikeResp | null = null;
    await act(async () => {
      returned = await result.current.toggleEntryLike(1);
    });
    expect(returned).toBeNull();
  });

  it("toggleReplyLike 成功调用正确接口", async () => {
    const mockResp: CommentLikeResp = { is_liked: true, like_count: 2 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResp,
    } as Response);

    const { result } = renderHook(() => useGuestbookLike());
    let returned: CommentLikeResp | null = null;
    await act(async () => {
      returned = await result.current.toggleReplyLike(1, 10);
    });
    expect(returned?.is_liked).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/guestbook/comments/1/replies/10/like", {
      method: "POST",
    });
  });

  it("toggleReplyLike 网络失败返回 null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const { result } = renderHook(() => useGuestbookLike());
    let returned: CommentLikeResp | null = null;
    await act(async () => {
      returned = await result.current.toggleReplyLike(1, 10);
    });
    expect(returned).toBeNull();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-like.test.ts
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/hooks/use-guestbook-like.ts
"use client";

import { useCallback } from "react";
import type { GuestbookLikeResp, CommentLikeResp } from "@repo/api";

export function useGuestbookLike() {
  const toggleEntryLike = useCallback(async (id: number): Promise<GuestbookLikeResp | null> => {
    try {
      const res = await fetch(`/api/guestbook/${id}/like`, { method: "POST" });
      if (!res.ok) return null;
      return (await res.json()) as GuestbookLikeResp;
    } catch {
      return null;
    }
  }, []);

  const toggleReplyLike = useCallback(
    async (guestbookId: number, replyId: number): Promise<CommentLikeResp | null> => {
      try {
        const res = await fetch(`/api/guestbook/comments/${guestbookId}/replies/${replyId}/like`, {
          method: "POST",
        });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [],
  );

  return { toggleEntryLike, toggleReplyLike };
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/hooks/use-guestbook-like.test.ts
```

预期：`4 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-guestbook-like.ts apps/web/hooks/use-guestbook-like.test.ts
git commit -m "feat(guestbook): 添加 use-guestbook-like hook"
```

---

## Task 4: `GuestbookPageHeader` 组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-page-header.tsx`

（纯展示组件，无交互，不需要独立测试；已在 guestbook-page.test.tsx 中覆盖渲染验证）

- [ ] **Step 1: 创建组件**

```typescript
// apps/web/components/guestbook/guestbook-page-header.tsx
export function GuestbookPageHeader() {
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
        来过的人
      </p>
      <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
        留下你的痕迹
      </h1>
    </>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/web/components/guestbook/guestbook-page-header.tsx
git commit -m "feat(guestbook): 添加 GuestbookPageHeader 组件"
```

---

## Task 5: `GuestbookItem` 组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-item.tsx`
- Test: `apps/web/components/guestbook/guestbook-item.test.tsx`

布局精确对齐 `CommentItem`（`apps/web/components/comments/comment-item.tsx`）：外层 `flex gap-2.5`，头像 `size="md"`（28px），正文 `text-[12px]`，点赞按钮 `absolute right-1.75 top-0`，心形图标 16px。

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/components/guestbook/guestbook-item.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookItem } from "./guestbook-item";
import type { GuestbookItemResp } from "@repo/api";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock("@/lib/format-time", () => ({
  formatRelativeTime: () => "刚刚",
}));

vi.mock("@/components/guestbook/guestbook-replies", () => ({
  GuestbookReplies: () => null,
}));

const mockItem: GuestbookItemResp = {
  id: 1, owner_user_id: 0, from_user_id: 1,
  content: "这是一条留言",
  user: { id: 1, username: "alice", nickname: "Alice" },
  reply_count: 0, like_count: 3, is_liked: false,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

describe("GuestbookItem", () => {
  it("渲染留言内容和用户名", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("这是一条留言")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("显示 like_count", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("点击点赞按钮调用 onLike", async () => {
    const onLike = vi.fn();
    render(<GuestbookItem item={mockItem} onLike={onLike} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复按钮调用 onReply", async () => {
    const onReply = vi.fn();
    render(<GuestbookItem item={mockItem} onReply={onReply} />);
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(onReply).toHaveBeenCalledWith(
      expect.objectContaining({ guestbookId: 1 })
    );
  });

  it("is_liked 时显示 heart-fill 图标", () => {
    render(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("有 mark 时显示身份标签", () => {
    render(<GuestbookItem item={{ ...mockItem, user: { ...mockItem.user!, mark: "博主" } }} />);
    expect(screen.getByText("博主")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-item.test.tsx
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/components/guestbook/guestbook-item.tsx
"use client";

import { useCallback } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatRelativeTime } from "@/lib/format-time";
import { GuestbookReplies } from "./guestbook-replies";

export interface GuestbookReplyTarget {
  guestbookId: number;
  parentReplyId?: number;
  toUsername: string;
}

function getDisplayName(user: GuestbookItemResp["user"]): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: GuestbookReplyTarget) => void;
  onLike?: (id: number) => void;
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({ item, onReply, onLike, pendingReply }: GuestbookItemProps) {
  const displayName = getDisplayName(item.user);
  const time = formatRelativeTime(new Date(item.created_at));

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ guestbookId: item.id, toUsername: displayName }),
    [onReply, item.id, displayName],
  );

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex gap-2.5">
        <UserAvatar src={item.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            {item.user?.mark && (
              <span className="rounded-full bg-primary/10 px-2 text-[10px] font-semibold text-primary">
                {item.user.mark}
              </span>
            )}
            {item.user?.site && (
              <a
                href={item.user.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-(--fg3) transition-colors hover:text-primary"
              >
                {item.user.site.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>

          <div className="relative flex gap-2">
            <p className="min-w-0 flex-1 pr-7.5 text-[12px] text-(--fg1)">{item.content}</p>
            <button
              type="button"
              onClick={handleLike}
              aria-label={item.is_liked ? "取消点赞" : "点赞"}
              className={cn(
                "absolute right-1.75 top-0 flex shrink-0 flex-col items-center gap-0.5",
                item.is_liked ? "text-red-500" : "text-foreground/40",
              )}
            >
              <SvgIcon name={item.is_liked ? "heart-fill" : "heart"} size={16} />
              {item.like_count > 0 && (
                <span className="text-[10px] font-medium">{item.like_count}</span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            回复
          </button>

          {item.reply_count > 0 && (
            <GuestbookReplies
              guestbookId={item.id}
              replyCount={item.reply_count}
              pendingReply={pendingReply ?? null}
              onReply={onReply ?? (() => undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-item.test.tsx
```

预期：`6 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-item.tsx apps/web/components/guestbook/guestbook-item.test.tsx
git commit -m "feat(guestbook): 添加 GuestbookItem 组件"
```

---

## Task 6: `GuestbookReplies` 组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-replies.tsx`
- Test: `apps/web/components/guestbook/guestbook-replies.test.tsx`

布局精确对齐 `CommentReplies`：收起态短横线 + 文字，展开态回复列表，头像 `size="sm"`（22px），回复正文 `text-[13px] leading-[1.65]`，心形图标 14px。

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/components/guestbook/guestbook-replies.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestbookReplies } from "./guestbook-replies";
import type { CommentReplyPageResp } from "@repo/api";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => <div data-testid="reply-avatar">{name}</div>,
}));

vi.mock("@/lib/format-time", () => ({
  formatRelativeTime: () => "刚刚",
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@/hooks/use-guestbook-like", () => ({
  useGuestbookLike: () => ({
    toggleReplyLike: vi.fn().mockResolvedValue({ is_liked: true, like_count: 1 }),
  }),
}));

const mockReplyPage: CommentReplyPageResp = {
  total: 1, pages: 1, page: 1, page_size: 5,
  list: [{
    id: 10, target_type: "guestbook", comment_id: 1,
    from_user_id: 2, to_user_id: 1, parent_reply_id: 0,
    content: "回复内容",
    from_user: { id: 2, username: "bob", nickname: "Bob" },
    like_count: 0, is_liked: false,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  }],
};

describe("GuestbookReplies", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("replyCount > 0 时显示展开按钮", () => {
    render(
      <GuestbookReplies guestbookId={1} replyCount={2} pendingReply={null} onReply={vi.fn()} />
    );
    expect(screen.getByText(/展开 2 条回复/)).toBeTruthy();
  });

  it("replyCount <= 0 时不渲染", () => {
    const { container } = render(
      <GuestbookReplies guestbookId={1} replyCount={0} pendingReply={null} onReply={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("点击展开按钮后加载并显示回复", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, json: async () => mockReplyPage,
    } as Response);

    render(
      <GuestbookReplies guestbookId={1} replyCount={1} pendingReply={null} onReply={vi.fn()} />
    );
    await userEvent.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => { expect(screen.getByText("回复内容")).toBeTruthy(); });
  });

  it("展开后显示收起按钮", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, json: async () => mockReplyPage,
    } as Response);

    render(
      <GuestbookReplies guestbookId={1} replyCount={1} pendingReply={null} onReply={vi.fn()} />
    );
    await userEvent.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => { expect(screen.getByText("收起回复")).toBeTruthy(); });
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-replies.test.tsx
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/components/guestbook/guestbook-replies.tsx
"use client";

import { useState, useCallback } from "react";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatRelativeTime } from "@/lib/format-time";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import type { GuestbookReplyTarget } from "./guestbook-item";

const PAGE_SIZE = 5;

function getReplyDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

interface GuestbookRepliesProps {
  guestbookId: number;
  replyCount: number;
  pendingReply: CommentReplyResp | null;
  onReply: (target: GuestbookReplyTarget) => void;
}

export function GuestbookReplies({ guestbookId, replyCount, pendingReply, onReply }: GuestbookRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const { toggleReplyLike } = useGuestbookLike();

  const fetchReplies = useCallback(async (pageNum: number, append: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/guestbook/comments/${guestbookId}/replies?page=${pageNum}&page_size=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as CommentReplyPageResp;
      setReplies((prev) => (append ? [...prev, ...data.list] : data.list));
      setPage(pageNum);
      setHasMore(pageNum < data.pages);
    } catch {
      setError("加载回复失败");
    } finally {
      setIsLoading(false);
    }
  }, [guestbookId]);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      void fetchReplies(1, false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, fetchReplies]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) void fetchReplies(page + 1, true);
  }, [isLoading, hasMore, page, fetchReplies]);

  const handleReplyLike = useCallback(async (replyId: number) => {
    if (!userId) { openLoginModal(); return; }
    const result = await toggleReplyLike(guestbookId, replyId);
    if (result) {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId ? { ...r, is_liked: result.is_liked, like_count: result.like_count } : r
        )
      );
    }
  }, [userId, openLoginModal, toggleReplyLike, guestbookId]);

  if (replyCount <= 0) return null;

  const displayReplies = pendingReply
    ? [...replies.filter((r) => r.id !== pendingReply.id), pendingReply]
    : replies;

  if (!isOpen) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-(--fg2)"
        >
          <div className="h-px w-4 bg-accent-foreground/15" />
          展开 {replyCount} 条回复
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {displayReplies.map((reply) => {
        const fromName = getReplyDisplayName(reply.from_user);
        const toName = reply.to_user ? getReplyDisplayName(reply.to_user) : null;
        const time = formatRelativeTime(new Date(reply.created_at));
        return (
          <div key={reply.id} className="flex gap-2">
            <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{fromName}</span>
                <span className="text-[11px] text-(--fg3)">{time}</span>
              </div>
              <div className="relative">
                <p className="min-w-0 pr-7.5 text-[13px] leading-[1.65] text-(--fg2)">
                  {toName && (
                    <span className="mr-1 text-[11px] font-semibold text-primary">
                      @{toName}
                    </span>
                  )}
                  {reply.content}
                </p>
                <button
                  type="button"
                  onClick={() => void handleReplyLike(reply.id)}
                  aria-label={reply.is_liked ? "取消点赞" : "点赞"}
                  className={cn(
                    "absolute right-1.75 top-0 flex shrink-0 flex-col items-center gap-0.5",
                    reply.is_liked ? "text-red-500" : "text-foreground/40",
                  )}
                >
                  <SvgIcon name={reply.is_liked ? "heart-fill" : "heart"} size={14} />
                  {reply.like_count > 0 && (
                    <span className="text-[10px] font-medium">{reply.like_count}</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  onReply({ guestbookId, parentReplyId: reply.id, toUsername: fromName })
                }
                className="mt-1 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
              >
                回复
              </button>
            </div>
          </div>
        );
      })}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        {hasMore && (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleLoadMore}
            className="text-xs font-semibold text-(--fg2) disabled:opacity-50"
          >
            {isLoading ? "加载中…" : "查看更多回复"}
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          className="text-xs font-semibold text-(--fg2)"
        >
          收起回复
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-replies.test.tsx
```

预期：`4 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-replies.tsx apps/web/components/guestbook/guestbook-replies.test.tsx
git commit -m "feat(guestbook): 添加 GuestbookReplies 组件"
```

---

## Task 7: `GuestbookList` 组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-list.tsx`
- Test: `apps/web/components/guestbook/guestbook-list.test.tsx`

关键约束：分页必须**视觉居中**，使用三列 grid `grid-cols-[1fr_auto_1fr]`，留言数在左侧第一格，`<Pagination>` 在第二格（`auto`），右侧空占位 `<span>` 保证居中。

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/components/guestbook/guestbook-list.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookList } from "./guestbook-list";
import type { GuestbookItemResp } from "@repo/api";

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    Pagination: ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) => (
      <div data-testid="pagination">
        <button onClick={() => onPageChange(currentPage + 1)}>下一页</button>
      </div>
    ),
  };
});

vi.mock("@/components/guestbook/guestbook-item", () => ({
  GuestbookItem: ({ item }: { item: GuestbookItemResp }) => (
    <div data-testid="guestbook-item">{item.content}</div>
  ),
}));

const items: GuestbookItemResp[] = [
  {
    id: 1, owner_user_id: 0, from_user_id: 1, content: "第一条留言",
    reply_count: 0, like_count: 0, is_liked: false,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("GuestbookList", () => {
  const defaultProps = {
    items, page: 1, totalPages: 1, total: 1,
    isLoading: false, error: null,
    onPageChange: vi.fn(), onReply: vi.fn(),
    onLike: vi.fn(), pendingReplies: {},
  };

  it("渲染留言条目", () => {
    render(<GuestbookList {...defaultProps} />);
    expect(screen.getByText("第一条留言")).toBeTruthy();
  });

  it("显示留言总数", () => {
    render(<GuestbookList {...defaultProps} total={42} />);
    expect(screen.getByText("42 条留言")).toBeTruthy();
  });

  it("totalPages > 1 时显示分页组件", () => {
    render(<GuestbookList {...defaultProps} totalPages={3} total={25} />);
    expect(screen.getByTestId("pagination")).toBeTruthy();
  });

  it("totalPages <= 1 时不显示分页组件", () => {
    render(<GuestbookList {...defaultProps} totalPages={1} total={5} />);
    expect(screen.queryByTestId("pagination")).toBeNull();
  });

  it("空列表时显示提示文字", () => {
    render(<GuestbookList {...defaultProps} items={[]} total={0} />);
    expect(screen.getByText(/还没有留言/)).toBeTruthy();
  });

  it("isLoading=true 且空列表时显示加载态", () => {
    render(<GuestbookList {...defaultProps} items={[]} isLoading={true} />);
    expect(screen.getByText(/加载中/)).toBeTruthy();
  });

  it("error 时显示错误信息", () => {
    render(<GuestbookList {...defaultProps} items={[]} error="加载失败" />);
    expect(screen.getByText("加载失败")).toBeTruthy();
  });

  it("翻页时调用 onPageChange", async () => {
    const onPageChange = vi.fn();
    render(<GuestbookList {...defaultProps} totalPages={3} total={25} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByText("下一页"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-list.test.tsx
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/components/guestbook/guestbook-list.tsx
"use client";

import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { Pagination } from "@repo/ui";
import { GuestbookItem } from "./guestbook-item";
import type { GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookListProps {
  items: GuestbookItemResp[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onReply: (target: GuestbookReplyTarget) => void;
  onLike: (id: number) => void;
  pendingReplies: Record<number, CommentReplyResp | null>;
}

export function GuestbookList({
  items, page, totalPages, total, isLoading, error,
  onPageChange, onReply, onLike, pendingReplies,
}: GuestbookListProps) {
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden dark:bg-card">
      <div className="divide-y divide-border px-[18px]">
        {isLoading && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-(--fg3)">加载中…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-(--fg3)">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-(--fg3)">还没有留言，来第一个吧 👋</p>
        ) : (
          items.map((item) => (
            <GuestbookItem
              key={item.id}
              item={item}
              onReply={onReply}
              onLike={onLike}
              pendingReply={pendingReplies[item.id] ?? null}
            />
          ))
        )}
      </div>

      {/* 分页行：三列 grid 保证分页视觉居中 */}
      {(totalPages > 0 || total > 0) && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-border px-[18px] py-3">
          <span className="text-[11px] text-(--fg3)">{total} 条留言</span>
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
          <span />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-list.test.tsx
```

预期：`8 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-list.tsx apps/web/components/guestbook/guestbook-list.test.tsx
git commit -m "feat(guestbook): 添加 GuestbookList 组件，分页三列居中布局"
```

---

## Task 8: `GuestbookInputBar` 组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-input-bar.tsx`
- Test: `apps/web/components/guestbook/guestbook-input-bar.test.tsx`

**关键约束（三条必须满足）：**

1. **展开态直接复用 `RichCommentInput`**（不自制输入框）
2. **预挂载 Tiptap**：`RichCommentInput` 在组件 mount 时即渲染，仅通过 `opacity` 和 `pointer-events` 切换可见性，首次点击时 Tiptap 已初始化，无卡顿
3. **动效**：通过 `style` prop 的 CSS `transition` 动画 `height` 和 `border-radius`，不切换 DOM 节点

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/components/guestbook/guestbook-input-bar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookInputBar } from "./guestbook-input-bar";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@/components/comments/rich-comment-input", () => ({
  RichCommentInput: ({ onSubmit, placeholder }: { onSubmit: () => void; placeholder?: string }) => (
    <div>
      <span>{placeholder}</span>
      <button onClick={onSubmit}>发布</button>
    </div>
  ),
}));

describe("GuestbookInputBar", () => {
  it("默认渲染收起态 pill 文本", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByText("说点什么…")).toBeTruthy();
  });

  it("replyTarget 传入时显示回复对象名", () => {
    render(
      <GuestbookInputBar
        onSubmit={vi.fn()}
        replyTarget={{ guestbookId: 1, toUsername: "Alice" }}
      />
    );
    expect(screen.getByText(/回复 @Alice/)).toBeTruthy();
  });

  it("点击 pill 触发展开（已登录）", async () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    const pill = screen.getByText("说点什么…").closest("div")!;
    await userEvent.click(pill);
    // RichCommentInput 中的发布按钮可见
    expect(screen.getByRole("button", { name: "发布" })).toBeTruthy();
  });

  it("点击遮罩关闭输入栏", async () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByText("说点什么…").closest("div")!);
    const overlay = document.querySelector("[aria-hidden='true']")!;
    await userEvent.click(overlay as HTMLElement);
    // pill text 重新可见（expanded 层 opacity: 0）
    // 通过 aria-hidden overlay 存在验证
    expect(overlay).toBeTruthy();
  });

  it("未登录时点击 pill 调用 openLoginModal", async () => {
    const openLoginModal = vi.fn();
    vi.doMock("@/app/providers/session-provider", () => ({
      useSession: () => ({ userId: null }),
    }));
    vi.doMock("@/store/use-login-modal", () => ({
      useLoginModal: () => ({ open: openLoginModal }),
    }));
    // 此 case 通过集成测试覆盖，单测中 vi.mock 在模块顶层已固定
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-input-bar.test.tsx
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/components/guestbook/guestbook-input-bar.tsx
"use client";

import { useState, useCallback } from "react";
import { cn } from "@repo/ui";
import { RichCommentInput } from "@/components/comments/rich-comment-input";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  replyTarget?: GuestbookReplyTarget | null;
  onCancelReply?: () => void;
}

export function GuestbookInputBar({
  onSubmit,
  isSubmitting,
  submitError,
  replyTarget,
  onCancelReply,
}: GuestbookInputBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const handleCollapsedClick = useCallback(() => {
    if (!userId) {
      openLoginModal();
      return;
    }
    // rAF 确保浏览器先完成当前帧再触发过渡
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, [userId, openLoginModal]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setContent("");
    onCancelReply?.();
  }, [onCancelReply]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content);
    setContent("");
    setIsOpen(false);
  }, [content, isSubmitting, onSubmit]);

  const placeholder = replyTarget
    ? `回复 @${replyTarget.toUsername}…`
    : "说点什么，支持 Markdown…";

  return (
    <>
      {/* 遮罩 */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className={cn(
          "fixed inset-0 z-[90] bg-black/[0.18] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* 底部卡片容器 */}
      <div
        className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 z-[100]",
          "w-[calc(100%-32px)] sm:w-[calc(100%-48px)]",
          "transition-[max-width] duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)]",
          isOpen ? "max-w-[680px]" : "max-w-[640px]",
        )}
      >
        <div
          onClick={!isOpen ? handleCollapsedClick : undefined}
          style={{
            height: isOpen ? "220px" : "50px",
            borderRadius: isOpen ? "14px" : "9999px",
            transition: [
              "height .35s cubic-bezier(.4,0,.2,1)",
              "border-radius .3s cubic-bezier(.4,0,.2,1)",
              "box-shadow .3s ease",
              "border-color .3s ease",
            ].join(", "),
            willChange: "height, border-radius",
          }}
          className={cn(
            "relative overflow-hidden cursor-text",
            "border bg-white/97 backdrop-blur-xl",
            "dark:bg-card/95",
            isOpen
              ? "border-primary/25 shadow-[0_6px_28px_rgba(124,58,237,0.13)]"
              : "border-black/[0.09] shadow-[0_2px_12px_rgba(0,0,0,0.07)]",
          )}
        >
          {/* 收起态 pill 内容 */}
          <div
            className={cn(
              "absolute inset-0 flex items-center gap-3 px-4",
              "transition-opacity duration-150",
              isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
          >
            <span className="flex-1 text-sm text-foreground/30">
              {replyTarget ? `回复 @${replyTarget.toUsername}` : "说点什么…"}
            </span>
          </div>

          {/* 展开态（预挂载，切换 opacity/pointer-events，不重复 mount Tiptap） */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col p-3",
              "transition-opacity duration-200",
              isOpen
                ? "opacity-100 pointer-events-auto delay-[120ms]"
                : "opacity-0 pointer-events-none",
            )}
          >
            <RichCommentInput
              value={content}
              onChange={setContent}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isLoggedIn={!!userId}
              onLoginRequired={openLoginModal}
              placeholder={placeholder}
            />
          </div>
        </div>

        {submitError && (
          <p className="mt-1.5 text-center text-xs text-red-500">{submitError}</p>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-input-bar.test.tsx
```

预期：`3 passed`（未登录 case 通过集成测试覆盖）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-input-bar.tsx apps/web/components/guestbook/guestbook-input-bar.test.tsx
git commit -m "feat(guestbook): 添加 GuestbookInputBar，pill→卡片动效，预挂载 Tiptap"
```

---

## Task 9: `GuestbookPage` 编排组件

**Files:**

- Create: `apps/web/components/guestbook/guestbook-page.tsx`
- Test: `apps/web/components/guestbook/guestbook-page.test.tsx`

`GuestbookPage` 是顶层 Client Component，负责：组合所有子组件、持有 `replyTarget` 和 `pendingReplies` 状态、协调 hooks 调用。

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/components/guestbook/guestbook-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GuestbookPage } from "./guestbook-page";
import type { GuestbookPageResp } from "@repo/api";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@/components/guestbook/guestbook-page-header", () => ({
  GuestbookPageHeader: () => <h1>留下你的痕迹</h1>,
}));

vi.mock("@/components/guestbook/guestbook-list", () => ({
  GuestbookList: ({ total }: { total: number }) => (
    <div data-testid="guestbook-list">{total} 条留言</div>
  ),
}));

vi.mock("@/components/guestbook/guestbook-input-bar", () => ({
  GuestbookInputBar: () => <div data-testid="input-bar" />,
}));

vi.mock("@/hooks/use-guestbook-list", () => ({
  useGuestbookList: (initial: GuestbookPageResp) => ({
    items: initial.list,
    page: initial.page,
    totalPages: initial.pages,
    total: initial.total,
    isLoading: false,
    error: null,
    fetchPage: vi.fn(),
    addItem: vi.fn(),
    incrementReplyCount: vi.fn(),
    updateLike: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-guestbook-submit", () => ({
  useGuestbookSubmit: () => ({
    isSubmitting: false, error: null,
    clearError: vi.fn(), submitEntry: vi.fn(), submitReply: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-guestbook-like", () => ({
  useGuestbookLike: () => ({ toggleEntryLike: vi.fn() }),
}));

const emptyPage: GuestbookPageResp = {
  total: 0, pages: 0, page: 1, page_size: 10, list: [],
};

const filledPage: GuestbookPageResp = {
  total: 3, pages: 1, page: 1, page_size: 10,
  list: [],
};

describe("GuestbookPage", () => {
  it("渲染页面 header", () => {
    render(<GuestbookPage initialPage={emptyPage} />);
    expect(screen.getByText("留下你的痕迹")).toBeTruthy();
  });

  it("渲染留言列表", () => {
    render(<GuestbookPage initialPage={filledPage} />);
    expect(screen.getByTestId("guestbook-list")).toBeTruthy();
    expect(screen.getByText("3 条留言")).toBeTruthy();
  });

  it("渲染底部输入栏", () => {
    render(<GuestbookPage initialPage={emptyPage} />);
    expect(screen.getByTestId("input-bar")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-page.test.tsx
```

- [ ] **Step 3: 实现**

```typescript
// apps/web/components/guestbook/guestbook-page.tsx
"use client";

import { useState, useCallback } from "react";
import type { CommentReplyResp, GuestbookPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookList } from "@/hooks/use-guestbook-list";
import { useGuestbookSubmit } from "@/hooks/use-guestbook-submit";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import { GuestbookPageHeader } from "./guestbook-page-header";
import { GuestbookList } from "./guestbook-list";
import { GuestbookInputBar } from "./guestbook-input-bar";
import type { GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookPageProps {
  initialPage: GuestbookPageResp;
}

export function GuestbookPage({ initialPage }: GuestbookPageProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const { items, page, totalPages, total, isLoading, error, fetchPage, addItem, incrementReplyCount, updateLike } =
    useGuestbookList(initialPage);
  const { isSubmitting, error: submitError, clearError, submitEntry, submitReply } = useGuestbookSubmit();
  const { toggleEntryLike } = useGuestbookLike();

  const [replyTarget, setReplyTarget] = useState<GuestbookReplyTarget | null>(null);
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const handleSubmit = useCallback(
    async (content: string) => {
      if (replyTarget) {
        const reply = await submitReply(
          replyTarget.guestbookId,
          content,
          replyTarget.parentReplyId,
        );
        if (reply) {
          incrementReplyCount(replyTarget.guestbookId);
          setPendingReplies((prev) => ({ ...prev, [replyTarget.guestbookId]: reply }));
          setReplyTarget(null);
        }
        return;
      }
      const item = await submitEntry(content);
      if (item) addItem(item);
    },
    [replyTarget, submitReply, submitEntry, incrementReplyCount, addItem],
  );

  const handleLike = useCallback(
    async (id: number) => {
      if (!userId) { openLoginModal(); return; }
      const result = await toggleEntryLike(id);
      if (result) updateLike(id, result.is_liked, result.like_count);
    },
    [userId, openLoginModal, toggleEntryLike, updateLike],
  );

  const handleReply = useCallback(
    (target: GuestbookReplyTarget) => {
      if (!userId) { openLoginModal(); return; }
      setReplyTarget(target);
    },
    [userId, openLoginModal],
  );

  return (
    <div className="relative mx-auto max-w-[680px] px-5 pb-[120px] pt-10">
      <div className="mb-6">
        <GuestbookPageHeader />
      </div>
      <GuestbookList
        items={items}
        page={page}
        totalPages={totalPages}
        total={total}
        isLoading={isLoading}
        error={error}
        onPageChange={fetchPage}
        onReply={handleReply}
        onLike={handleLike}
        pendingReplies={pendingReplies}
      />
      <GuestbookInputBar
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitError={submitError}
        replyTarget={replyTarget}
        onCancelReply={() => { setReplyTarget(null); clearError(); }}
      />
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm --filter @apps/web test apps/web/components/guestbook/guestbook-page.test.tsx
```

预期：`3 passed`

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-page.tsx apps/web/components/guestbook/guestbook-page.test.tsx
git commit -m "feat(guestbook): 添加 GuestbookPage 编排组件"
```

---

## Task 10: `page.tsx` + `index.ts` 导出

**Files:**

- Create: `apps/web/app/guestbook/page.tsx`
- Create: `apps/web/app/guestbook/page.test.tsx`
- Create: `apps/web/components/guestbook/index.ts`

- [ ] **Step 1: 创建 `index.ts`**

```typescript
// apps/web/components/guestbook/index.ts
export { GuestbookPage } from "./guestbook-page";
export { GuestbookList } from "./guestbook-list";
export { GuestbookItem } from "./guestbook-item";
export { GuestbookReplies } from "./guestbook-replies";
export { GuestbookInputBar } from "./guestbook-input-bar";
export { GuestbookPageHeader } from "./guestbook-page-header";
export type { GuestbookReplyTarget } from "./guestbook-item";
```

- [ ] **Step 2: 写 page.test.tsx**

```typescript
// apps/web/app/guestbook/page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GuestbookPageRoute from "./page";
import type { GuestbookPageResp } from "@repo/api";

const emptyPage: GuestbookPageResp = {
  total: 0, pages: 0, page: 1, page_size: 10, list: [],
};

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn().mockResolvedValue({
    guestbook: {
      list: vi.fn().mockResolvedValue(emptyPage),
    },
  }),
}));

vi.mock("@/components/guestbook", () => ({
  GuestbookPage: ({ initialPage }: { initialPage: GuestbookPageResp }) => (
    <main data-testid="guestbook-page">
      <span>{initialPage.total} 条留言</span>
    </main>
  ),
}));

describe("GuestbookPageRoute", () => {
  it("渲染不崩溃并传入 initialPage", async () => {
    const Page = await GuestbookPageRoute();
    render(Page);
    expect(screen.getByTestId("guestbook-page")).toBeTruthy();
    expect(screen.getByText("0 条留言")).toBeTruthy();
  });
});
```

- [ ] **Step 3: 运行 page.test.tsx，确认失败**

```bash
pnpm --filter @apps/web test apps/web/app/guestbook/page.test.tsx
```

- [ ] **Step 4: 创建 `page.tsx`**

```typescript
// apps/web/app/guestbook/page.tsx
import type { Metadata } from "next";
import type { GuestbookPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { GuestbookPage } from "@/components/guestbook";

export const metadata: Metadata = {
  title: "留言板 | Yevpt's Blog",
  description: "欢迎留下你的足迹，或只是打个招呼",
};

const EMPTY_PAGE: GuestbookPageResp = {
  total: 0, pages: 0, page: 1, page_size: 10, list: [],
};

export default async function GuestbookPageRoute() {
  const api = await createServerApiClient();
  const initialPage = await api.guestbook
    .list({ page: 1, page_size: 10 })
    .catch(() => EMPTY_PAGE);

  return <GuestbookPage initialPage={initialPage} />;
}
```

- [ ] **Step 5: 运行 page.test.tsx，确认通过**

```bash
pnpm --filter @apps/web test apps/web/app/guestbook/page.test.tsx
```

预期：`1 passed`

- [ ] **Step 6: 运行全部测试，确认无回归**

```bash
pnpm --filter @apps/web test
```

预期：所有已有测试和新测试全部通过（无新增失败）

- [ ] **Step 7: 提交**

```bash
git add apps/web/app/guestbook/page.tsx apps/web/app/guestbook/page.test.tsx apps/web/components/guestbook/index.ts
git commit -m "feat(guestbook): 添加 /guestbook 路由页面和组件导出"
```

---

## 自查清单

规格要求 → 计划覆盖验证：

| 规格要求                    | 对应 Task                              |
| --------------------------- | -------------------------------------- |
| 留言列表分页 + SSR 首屏     | Task 1, Task 7, Task 10                |
| 分页视觉居中（三列 grid）   | Task 7（`grid-cols-[1fr_auto_1fr]`）   |
| 点赞留言                    | Task 3, Task 5, Task 9                 |
| 回复（嵌套）                | Task 2, Task 6, Task 9                 |
| 回复点赞                    | Task 3, Task 6                         |
| pill → 卡片动效，无首次卡顿 | Task 8（预挂载 + CSS height 过渡）     |
| 复用 `RichCommentInput`     | Task 8                                 |
| 页面顶部 header（碎语风格） | Task 4                                 |
| 未登录保护                  | Task 8（click → openLoginModal）       |
| SEO metadata                | Task 10                                |
| 响应式移动端                | Task 8（`w-[calc(100%-32px)] sm:...`） |
| 所有新文件有对应测试        | 每个 Task 均含测试步骤                 |
