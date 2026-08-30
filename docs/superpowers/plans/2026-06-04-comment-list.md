# 文章评论列表对接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CommentModal 从 mock 数据切换为真实 API，支持评论列表分页加载、发布新评论、回复评论，并建立可被详情页复用的 CommentSection 组件。

**Architecture:** CommentSection 是核心可复用单元，CommentModal 变为仅含遮罩/动画/标题的薄壳。数据层通过 Next.js Route Handler 代理转发至 Go 后端，两个 Hook（useCommentList / useCommentSubmit）各司其职。未登录用户通过 useLoginModal Zustand store 触发全局登录弹窗。

**Tech Stack:** React 18, Next.js 16 App Router, Zustand, TypeScript, Vitest + @testing-library/react

---

## 文件结构

| 动作   | 路径                                                    | 职责                               |
| ------ | ------------------------------------------------------- | ---------------------------------- |
| Create | `packages/api/src/types/comment.ts`                     | 对应后端 DTO 的 TS 类型            |
| Modify | `packages/api/src/client.ts`                            | 新增 comments 方法组               |
| Modify | `packages/api/src/index.ts`                             | 导出 comment 类型                  |
| Create | `apps/web/app/api/comments/route.ts`                    | GET（列表）+ POST（新建）代理      |
| Create | `apps/web/app/api/comments/route.test.ts`               | 路由测试                           |
| Create | `apps/web/app/api/comments/[id]/replies/route.ts`       | POST（回复）代理                   |
| Create | `apps/web/app/api/comments/[id]/replies/route.test.ts`  | 路由测试                           |
| Create | `apps/web/store/use-login-modal.ts`                     | 全局登录弹窗 Zustand store         |
| Create | `apps/web/components/auth/login-modal.tsx`              | 占位登录弹窗                       |
| Create | `apps/web/app/providers/global-modals.tsx`              | 把 LoginModal 挂到客户端树         |
| Modify | `apps/web/app/layout.tsx`                               | 渲染 GlobalModals                  |
| Create | `apps/web/hooks/use-comment-list.ts`                    | 列表取数 + 分页 + 本地追加         |
| Create | `apps/web/hooks/use-comment-list.test.ts`               | Hook 测试                          |
| Create | `apps/web/hooks/use-comment-submit.ts`                  | 发布评论 + 回复                    |
| Create | `apps/web/hooks/use-comment-submit.test.ts`             | Hook 测试                          |
| Modify | `apps/web/components/comments/comment-item.tsx`         | 接受 CommentItemResp，支持 onReply |
| Create | `apps/web/components/comments/comment-item.test.tsx`    | 组件测试                           |
| Modify | `apps/web/components/comments/comment-input.tsx`        | 登录门控，受控输入，回复上下文     |
| Modify | `apps/web/components/comments/comment-input.test.tsx`   | 补充测试（新建）                   |
| Create | `apps/web/components/comments/comment-section.tsx`      | 核心可复用评论区                   |
| Create | `apps/web/components/comments/comment-section.test.tsx` | 组件测试                           |
| Modify | `apps/web/components/comments/comment-modal.tsx`        | thin wrapper                       |
| Modify | `apps/web/components/comments/comment-modal.test.tsx`   | 更新测试                           |
| Modify | `apps/web/components/comments/index.ts`                 | 导出 CommentSection                |
| Modify | `apps/web/components/articles/article-section.tsx`      | ActiveComment 加 articleId         |
| Modify | `apps/web/components/articles/article-section.test.tsx` | 更新测试断言                       |

---

## Task 1: Comment TypeScript 类型

**Files:**

- Create: `packages/api/src/types/comment.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// packages/api/src/types/comment.ts

export interface CommentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface CommentReplyResp {
  id: number;
  target_type: string;
  comment_id: number;
  from_user_id: number;
  to_user_id: number;
  parent_reply_id: number;
  content: string;
  from_user?: CommentUserResp;
  to_user?: CommentUserResp;
  created_at: string;
  updated_at: string;
}

export interface CommentItemResp {
  id: number;
  target_type: string;
  target_id: number;
  user_id: number;
  content: string;
  user?: CommentUserResp;
  replies: CommentReplyResp[];
  created_at: string;
  updated_at: string;
}

export interface CommentPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: CommentItemResp[];
}

export interface CommentListReq {
  target_type: string;
  target_id: number;
  page?: number;
  page_size?: number;
}

export interface CommentCreateReq {
  target_type: string;
  target_id: number;
  content: string;
}

export interface CommentReplyCreateReq {
  target_type: string;
  parent_reply_id?: number;
  content: string;
}
```

- [ ] **Step 2: 导出类型**

在 `packages/api/src/index.ts` 末尾追加：

```typescript
export type {
  CommentUserResp,
  CommentReplyResp,
  CommentItemResp,
  CommentPageResp,
  CommentListReq,
  CommentCreateReq,
  CommentReplyCreateReq,
} from "./types/comment";
```

- [ ] **Step 3: 验证类型编译**

```bash
pnpm --filter @repo/api check-types
```

Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/types/comment.ts packages/api/src/index.ts
git commit -m "feat(api): 新增评论相关 TypeScript 类型"
```

---

## Task 2: API Client 新增 comments 方法组

**Files:**

- Modify: `packages/api/src/client.ts`
- Test: `packages/api/src/client.test.ts`

- [ ] **Step 1: 写失败测试**

在 `packages/api/src/client.test.ts` 中，找到现有 `describe("createApiClient", ...)` 块，在末尾追加：

```typescript
// ── comments ─────────────────────────────────────────────────────────────────

describe("comments", () => {
  it("listPublic 拼接正确的查询参数", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.comments.listPublic({ target_type: "article", target_id: 5, page: 2 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/comments?target_type=article&target_id=5&page=2",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("create 使用 fetchAuthed 并发送正确 body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: {
          id: 1,
          target_type: "article",
          target_id: 5,
          user_id: 1,
          content: "hi",
          replies: [],
          created_at: "",
          updated_at: "",
        },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token123" });

    await client.comments.create({ target_type: "article", target_id: 5, content: "hi" });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target_type: "article", target_id: 5, content: "hi" }),
        headers: expect.objectContaining({ Authorization: "Bearer token123" }),
      }),
    );
  });

  it("reply 调用 /comments/{id}/replies", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: {
          id: 2,
          target_type: "article",
          comment_id: 1,
          from_user_id: 2,
          to_user_id: 1,
          parent_reply_id: 0,
          content: "ok",
          created_at: "",
          updated_at: "",
        },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token123" });

    await client.comments.reply(1, { target_type: "article", content: "ok" });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/comments/1/replies",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/api test -- --reporter=verbose 2>&1 | grep -E "FAIL|✗|comments"
```

Expected: 3 个测试 FAIL（`client.comments` 不存在）。

- [ ] **Step 3: 实现 comments 方法组**

在 `packages/api/src/client.ts` 顶部导入部分，在现有导入后追加：

```typescript
import type {
  CommentListReq,
  CommentPageResp,
  CommentCreateReq,
  CommentItemResp,
  CommentReplyCreateReq,
  CommentReplyResp,
} from "./types/comment";
```

在 `createApiClient` 返回对象的 `test` 字段之前，追加 `comments` 字段（与 `moments` 字段并列）：

```typescript
    comments: {
      /** 分页查询评论，支持 article / moment / guestbook */
      listPublic: (req: CommentListReq) => {
        const params = new URLSearchParams();
        params.set("target_type", req.target_type);
        params.set("target_id", String(req.target_id));
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        return fetchPublic<CommentPageResp>(`/comments?${params.toString()}`, { method: "GET" });
      },
      /** 新增一级评论（需登录） */
      create: (req: CommentCreateReq) =>
        fetchAuthed<CommentItemResp>("/comments", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 回复一级评论（需登录） */
      reply: (commentId: number, req: CommentReplyCreateReq) =>
        fetchAuthed<CommentReplyResp>(`/comments/${commentId}/replies`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
    },
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/api test -- --reporter=verbose 2>&1 | grep -E "PASS|✓|comments"
```

Expected: 3 个测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): 新增 comments 方法组（listPublic / create / reply）"
```

---

## Task 3: GET + POST /api/comments 代理路由

**Files:**

- Create: `apps/web/app/api/comments/route.ts`
- Create: `apps/web/app/api/comments/route.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/app/api/comments/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";

describe("/api/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  describe("GET", () => {
    it("转发查询参数并返回评论列表", async () => {
      const mockData = { total: 1, pages: 1, page: 1, page_size: 10, list: [] };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, message: "ok", data: mockData }),
      } as Response);

      const req = new NextRequest(
        "http://localhost/api/comments?target_type=article&target_id=5&page=1",
      );
      const res = await GET(req);
      const body = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("localhost:8080/comments"),
        expect.objectContaining({ method: "GET" }),
      );
      expect(body).toEqual(mockData);
    });

    it("后端返回非 0 code 时返回 400", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 400, message: "目标不存在" }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments?target_type=article&target_id=0");
      const res = await GET(req);

      expect(res.status).toBe(400);
    });
  });

  describe("POST", () => {
    it("转发 access_token cookie 并返回新评论", async () => {
      const newComment = {
        id: 1,
        target_type: "article",
        target_id: 5,
        user_id: 1,
        content: "写得好",
        user: null,
        replies: [],
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, message: "ok", data: newComment }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({ target_type: "article", target_id: 5, content: "写得好" }),
        headers: { Cookie: "access_token=mytoken123" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8080/comments",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer mytoken123" }),
        }),
      );
      expect(body).toEqual(newComment);
    });

    it("后端返回 401 时响应 401", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 401, message: "未登录" }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({ target_type: "article", target_id: 5, content: "hi" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/app/api/comments/route.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 实现路由**

```typescript
// apps/web/app/api/comments/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams.toString();
    const res = await fetch(`${process.env.API_BASE_URL}/comments?${params}`, {
      method: "GET",
    });
    const json = await res.json();
    if (json.code !== 0) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json(json.data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    const body = await request.json();
    const res = await fetch(`${process.env.API_BASE_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await res.json();
    if (json.code !== 0) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json(json.data);
  } catch {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/app/api/comments/route.test.ts --reporter=verbose
```

Expected: 4 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/comments/
git commit -m "feat(web): 新增 /api/comments 代理路由（GET 列表 + POST 新建）"
```

---

## Task 4: POST /api/comments/[id]/replies 代理路由

**Files:**

- Create: `apps/web/app/api/comments/[id]/replies/route.ts`
- Create: `apps/web/app/api/comments/[id]/replies/route.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/app/api/comments/[id]/replies/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("POST /api/comments/[id]/replies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("转发到 /comments/{id}/replies 并返回回复数据", async () => {
    const newReply = {
      id: 3,
      target_type: "article",
      comment_id: 1,
      from_user_id: 2,
      to_user_id: 1,
      parent_reply_id: 0,
      content: "回复内容",
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 0, message: "ok", data: newReply }),
    } as Response);

    const req = new NextRequest("http://localhost/api/comments/1/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", parent_reply_id: 0, content: "回复内容" }),
      headers: { Cookie: "access_token=mytoken" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/comments/1/replies",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      }),
    );
    expect(body).toEqual(newReply);
  });

  it("id 非法时返回 400", async () => {
    const req = new NextRequest("http://localhost/api/comments/abc/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", content: "hi" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });

    expect(res.status).toBe(400);
  });

  it("后端返回 401 时响应 401", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: 401, message: "未登录" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/comments/1/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", content: "hi" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- "apps/web/app/api/comments/\[id\]/replies/route.test.ts" --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 实现路由**

```typescript
// apps/web/app/api/comments/[id]/replies/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
    }
    const accessToken = request.cookies.get("access_token")?.value;
    const body = await request.json();
    const res = await fetch(`${process.env.API_BASE_URL}/comments/${commentId}/replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await res.json();
    if (json.code !== 0) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json(json.data);
  } catch {
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- "apps/web/app/api/comments/\[id\]/replies/route.test.ts" --reporter=verbose
```

Expected: 3 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/api/comments/[id]/"
git commit -m "feat(web): 新增 /api/comments/[id]/replies 代理路由"
```

---

## Task 5: useLoginModal store + LoginModal + GlobalModals

**Files:**

- Create: `apps/web/store/use-login-modal.ts`
- Create: `apps/web/components/auth/login-modal.tsx`
- Create: `apps/web/app/providers/global-modals.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: 创建 Zustand store**

```typescript
// apps/web/store/use-login-modal.ts
import { create } from "zustand";

interface LoginModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useLoginModal = create<LoginModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

- [ ] **Step 2: 创建占位登录弹窗**

```tsx
// apps/web/components/auth/login-modal.tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useLoginModal } from "@/store/use-login-modal";

export function LoginModal() {
  const { isOpen, close } = useLoginModal();
  if (!isOpen) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/45 backdrop-blur-md"
      onClick={(e) => {
        if (e.currentTarget === e.target) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="登录"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">登录</h2>
          <Button
            variant="ghost"
            onPress={close}
            aria-label="关闭登录弹窗"
            className="h-7 w-7 rounded-lg bg-border p-0"
          >
            <SvgIcon name="close" size={16} />
          </Button>
        </div>
        <p className="text-sm text-(--fg2)">登录功能即将上线，敬请期待。</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 GlobalModals**

```tsx
// apps/web/app/providers/global-modals.tsx
"use client";

import { LoginModal } from "@/components/auth/login-modal";

export function GlobalModals() {
  return <LoginModal />;
}
```

- [ ] **Step 4: 挂载到 layout.tsx**

在 `apps/web/app/layout.tsx` 中，在 `import { SessionProvider }` 之后追加导入：

```typescript
import { GlobalModals } from "./providers/global-modals";
```

在 `<SvgSprite />` 之后追加：

```tsx
<GlobalModals />
```

- [ ] **Step 5: 验证类型编译**

```bash
pnpm --filter @repo/web check-types
```

Expected: 无报错。

- [ ] **Step 6: Commit**

```bash
git add apps/web/store/ apps/web/components/auth/ apps/web/app/providers/global-modals.tsx apps/web/app/layout.tsx
git commit -m "feat(web): 新增 useLoginModal store、占位 LoginModal 及 GlobalModals 挂载"
```

---

## Task 6: useCommentList Hook

**Files:**

- Create: `apps/web/hooks/use-comment-list.ts`
- Create: `apps/web/hooks/use-comment-list.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/hooks/use-comment-list.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommentList } from "./use-comment-list";
import type { CommentItemResp, CommentPageResp, CommentReplyResp } from "@repo/api";

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论 ${id}`,
    replies: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function makeReply(id: number, commentId: number): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: commentId,
    from_user_id: 2,
    to_user_id: 1,
    parent_reply_id: 0,
    content: `回复 ${id}`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function mockPage(list: CommentItemResp[], page = 1, pages = 1): CommentPageResp {
  return { total: list.length, pages, page, page_size: 10, list };
}

describe("useCommentList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("挂载时自动加载第 1 页", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("hasMore 在 page < pages 时为 true", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)], 1, 3)),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore 追加下一页数据到列表末尾", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage([makeComment(1)], 1, 2)),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage([makeComment(2)], 2, 2)),
      } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBe(1);
    expect(result.current.comments[1].id).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("addComment 在列表末尾追加新评论", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addComment(makeComment(99));
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[1].id).toBe(99);
  });

  it("addReply 追加回复到正确的评论下", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addReply(1, makeReply(10, 1));
    });

    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies[0].id).toBe(10);
    expect(result.current.comments[1].replies).toHaveLength(0);
  });

  it("fetch 失败时设置 error 并停止 loading", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.comments).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/hooks/use-comment-list.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 实现 Hook**

```typescript
// apps/web/hooks/use-comment-list.ts
import { useState, useEffect, useCallback } from "react";
import type { CommentItemResp, CommentPageResp, CommentReplyResp } from "@repo/api";

const PAGE_SIZE = 10;

export function useCommentList(targetType: string, targetId: number) {
  const [comments, setComments] = useState<CommentItemResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          target_type: targetType,
          target_id: String(targetId),
          page: String(pageNum),
          page_size: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/comments?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");
        const data: CommentPageResp = await res.json();
        setComments((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
      } catch {
        setError("加载评论失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, targetId],
  );

  useEffect(() => {
    setComments([]);
    setPage(1);
    setHasMore(false);
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      void fetchPage(page + 1, true);
    }
  }, [isLoading, hasMore, page, fetchPage]);

  const addComment = useCallback((comment: CommentItemResp) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const addReply = useCallback((commentId: number, reply: CommentReplyResp) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c)),
    );
  }, []);

  return { comments, isLoading, hasMore, error, loadMore, addComment, addReply };
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/hooks/use-comment-list.test.ts --reporter=verbose
```

Expected: 6 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-comment-list.ts apps/web/hooks/use-comment-list.test.ts
git commit -m "feat(web): 新增 useCommentList Hook（列表取数 + 分页 + 本地追加）"
```

---

## Task 7: useCommentSubmit Hook

**Files:**

- Create: `apps/web/hooks/use-comment-submit.ts`
- Create: `apps/web/hooks/use-comment-submit.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/web/hooks/use-comment-submit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

describe("useCommentSubmit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  describe("submitComment", () => {
    it("成功时返回新评论数据", async () => {
      const created = {
        id: 1,
        target_type: "article",
        target_id: 5,
        user_id: 1,
        content: "内容",
        replies: [],
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(created),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitComment("内容");
      });

      expect(returned).toEqual(created);
      expect(result.current.error).toBeNull();
    });

    it("401 时设置 error 并返回 null", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitComment("内容");
      });

      expect(returned).toBeNull();
      expect(result.current.error).toBe("请先登录");
    });

    it("isSubmitting 期间重复调用返回 null 且不发请求", async () => {
      let resolveFetch!: (v: unknown) => void;
      vi.mocked(global.fetch).mockReturnValue(
        new Promise((r) => {
          resolveFetch = r;
        }) as Promise<Response>,
      );

      const { result } = renderHook(() => useCommentSubmit("article", 5));

      // 第一次调用但不 await
      let p1: Promise<unknown>;
      act(() => {
        p1 = result.current.submitComment("内容");
      });

      // isSubmitting 应为 true
      expect(result.current.isSubmitting).toBe(true);

      // 第二次调用
      let returned2: unknown;
      await act(async () => {
        returned2 = await result.current.submitComment("内容");
      });
      expect(returned2).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 结束第一次请求
      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1, replies: [], created_at: "", updated_at: "" }),
      });
      await act(async () => {
        await p1;
      });
    });
  });

  describe("submitReply", () => {
    it("成功时返回新回复数据", async () => {
      const created = {
        id: 5,
        target_type: "article",
        comment_id: 1,
        from_user_id: 2,
        to_user_id: 1,
        parent_reply_id: 0,
        content: "回复",
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(created),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitReply(1, "回复", 0);
      });

      expect(returned).toEqual(created);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/comments/1/replies",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/hooks/use-comment-submit.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 实现 Hook**

```typescript
// apps/web/hooks/use-comment-submit.ts
import { useState, useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";

export function useCommentSubmit(targetType: string, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_type: targetType, target_id: targetId, content }),
        });
        if (res.status === 401) {
          setError("请先登录");
          return null;
        }
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as CommentItemResp;
      } catch {
        setError("发布失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, targetType, targetId],
  );

  const submitReply = useCallback(
    async (
      commentId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/comments/${commentId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: targetType,
            parent_reply_id: parentReplyId,
            content,
          }),
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
    [isSubmitting, targetType],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitComment, submitReply };
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/hooks/use-comment-submit.test.ts --reporter=verbose
```

Expected: 4 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-comment-submit.ts apps/web/hooks/use-comment-submit.test.ts
git commit -m "feat(web): 新增 useCommentSubmit Hook（发布评论 + 回复 + 防重提交）"
```

---

## Task 8: 更新 CommentItem 接受真实 API 类型

**Files:**

- Modify: `apps/web/components/comments/comment-item.tsx`
- Create: `apps/web/components/comments/comment-item.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// apps/web/components/comments/comment-item.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentItem } from "./comment-item";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const baseComment: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 5,
  user_id: 10,
  content: "这篇文章写得很好",
  user: { id: 10, username: "alice", nickname: "Alice" },
  replies: [],
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const replyData: CommentReplyResp = {
  id: 2,
  target_type: "article",
  comment_id: 1,
  from_user_id: 11,
  to_user_id: 10,
  parent_reply_id: 0,
  content: "谢谢你的反馈",
  from_user: { id: 11, username: "bob", nickname: "Bob" },
  to_user: { id: 10, username: "alice", nickname: "Alice" },
  created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CommentItem", () => {
  it("显示评论者昵称和评论内容", () => {
    render(<CommentItem comment={baseComment} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("无昵称时显示 username", () => {
    const comment = { ...baseComment, user: { id: 10, username: "alice" } };
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("无头像时显示首字母占位", () => {
    render(<CommentItem comment={baseComment} />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("点击回复触发 onReply 回调", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} onReply={onReply} />);

    await user.click(screen.getByText("回复"));

    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      toUsername: "Alice",
    });
  });

  it("渲染回复列表并显示 @被回复人", () => {
    const comment = { ...baseComment, replies: [replyData] };
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("谢谢你的反馈")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
  });

  it("回复的回复按钮触发 onReply 带 parentReplyId", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    const comment = { ...baseComment, replies: [replyData] };
    render(<CommentItem comment={comment} onReply={onReply} />);

    // 点击回复中的"回复"按钮（第二个回复按钮）
    const replyButtons = screen.getAllByText("回复");
    await user.click(replyButtons[1]);

    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 2,
      toUsername: "Bob",
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-item.test.tsx --reporter=verbose 2>&1 | tail -15
```

Expected: FAIL（CommentItem 不接受 CommentItemResp）。

- [ ] **Step 3: 重写 CommentItem**

完整替换 `apps/web/components/comments/comment-item.tsx`：

```tsx
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { formatRelativeTime } from "@/lib/format-time";

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

interface CommentItemProps {
  comment: CommentItemResp;
  onReply?: (target: ReplyTarget) => void;
}

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function Avatar({ url, name, size }: { url?: string; name: string; size: "sm" | "md" }) {
  const cls =
    size === "md" ? "h-7 w-7 shrink-0 rounded-full" : "h-[22px] w-[22px] shrink-0 rounded-full";
  const textCls = size === "md" ? "text-xs" : "text-[10px]";

  if (url) return <img src={url} alt={name} className={cls} />;
  return (
    <div
      className={`${cls} flex items-center justify-center bg-border font-bold text-(--fg2) ${textCls}`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  onReply?: (target: ReplyTarget) => void;
}

function ReplyItem({ reply, commentId, onReply }: ReplyItemProps) {
  const fromName = getDisplayName(reply.from_user);
  const toName = reply.to_user ? getDisplayName(reply.to_user) : null;
  const time = formatRelativeTime(new Date(reply.created_at));

  return (
    <div className="flex gap-2">
      <Avatar url={reply.from_user?.avatar_url} name={fromName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{fromName}</span>
          <span className="text-[11px] text-(--fg3)">{time}</span>
        </div>
        <p className="text-[13px] leading-[1.65] text-(--fg2)">
          {toName && <span className="mr-1 text-[11px] font-semibold text-primary">@{toName}</span>}
          {reply.content}
        </p>
        <button
          type="button"
          onClick={() => onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName })}
          className="mt-1 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-(--fg3) transition-colors hover:bg-primary/10 hover:text-primary"
        >
          回复
        </button>
      </div>
    </div>
  );
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
  const displayName = getDisplayName(comment.user);
  const time = formatRelativeTime(new Date(comment.created_at));

  return (
    <div className="comment-item">
      <div className="flex gap-2.5">
        <Avatar url={comment.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>
          <p className="text-[13px] leading-[1.65] text-(--fg2)">{comment.content}</p>
          <button
            type="button"
            onClick={() => onReply?.({ commentId: comment.id, toUsername: displayName })}
            className="mt-1.5 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-(--fg3) transition-colors hover:bg-primary/10 hover:text-primary"
          >
            回复
          </button>
          {comment.replies.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3.5">
              {comment.replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} commentId={comment.id} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-item.test.tsx --reporter=verbose
```

Expected: 6 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/comment-item.tsx apps/web/components/comments/comment-item.test.tsx
git commit -m "refactor(web): CommentItem 接入真实 API 类型，支持 onReply 回调"
```

---

## Task 9: 更新 CommentInput（登录门控 + 受控 + 回复上下文）

**Files:**

- Modify: `apps/web/components/comments/comment-input.tsx`
- Create: `apps/web/components/comments/comment-input.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// apps/web/components/comments/comment-input.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CommentInput } from "./comment-input";

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [k: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));

// 已登录
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ user: { id: 1, username: "alice" } }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

describe("CommentInput（已登录）", () => {
  it("渲染文本框和发布按钮", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText("写下你的评论...")).toBeTruthy();
    expect(screen.getByText("发布")).toBeTruthy();
  });

  it("value 为空时发布按钮禁用", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    const btn = screen.getByText("发布").closest("button");
    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(true);
  });

  it("value 非空时发布按钮可用，点击触发 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput value="有内容" onChange={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByText("发布"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("回复模式下显示 @用户名 和取消按钮", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });

  it("点击取消回复触发 onCancelReply", async () => {
    const user = userEvent.setup();
    const onCancelReply = vi.fn();
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={onCancelReply}
      />,
    );
    await user.click(screen.getByText("取消"));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it("submitError 非空时显示错误信息", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitError="发布失败，请稍后重试"
      />,
    );
    expect(screen.getByText("发布失败，请稍后重试")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-input.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（CommentInput 不接受新 props）。

- [ ] **Step 3: 重写 CommentInput**

完整替换 `apps/web/components/comments/comment-input.tsx`：

```tsx
"use client";

import { Button } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { ReplyTarget } from "./comment-item";

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function CommentInput({
  value,
  onChange,
  onSubmit,
  replyTarget,
  onCancelReply,
  isSubmitting = false,
  submitError,
}: CommentInputProps) {
  const { user } = useSession();
  const { open: openLogin } = useLoginModal();

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-[18px] py-3 pb-4">
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-primary">@{replyTarget.toUsername}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-(--fg3) hover:text-foreground"
          >
            取消
          </button>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={user ? "写下你的评论..." : "请先登录才能发表评论"}
          disabled={!user || isSubmitting}
          rows={3}
          className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-[13px] leading-normal text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        <div className="flex justify-end">
          {user ? (
            <Button
              variant="default"
              size="sm"
              isDisabled={!value.trim() || isSubmitting}
              onPress={onSubmit}
              className="h-8 rounded-full bg-primary px-[18px] text-xs font-bold text-white hover:bg-primary/85"
            >
              {isSubmitting ? "发布中..." : "发布"}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onPress={openLogin}
              className="h-8 rounded-full bg-primary px-[18px] text-xs font-bold text-white hover:bg-primary/85"
            >
              请先登录
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-input.test.tsx --reporter=verbose
```

Expected: 6 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/comment-input.tsx apps/web/components/comments/comment-input.test.tsx
git commit -m "refactor(web): CommentInput 改为受控组件，增加登录门控与回复上下文"
```

---

## Task 10: 创建 CommentSection

**Files:**

- Create: `apps/web/components/comments/comment-section.tsx`
- Create: `apps/web/components/comments/comment-section.test.tsx`
- Modify: `apps/web/components/comments/index.ts`

- [ ] **Step 1: 写失败测试**

```tsx
// apps/web/components/comments/comment-section.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CommentSection } from "./comment-section";
import type { CommentPageResp } from "@repo/api";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [k: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ user: { id: 1, username: "alice" } }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

function makePageResp(count: number, pages = 1): CommentPageResp {
  return {
    total: count,
    pages,
    page: 1,
    page_size: 10,
    list: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      target_type: "article",
      target_id: 1,
      user_id: 1,
      content: `评论 ${i + 1}`,
      user: { id: 1, username: "alice", nickname: "Alice" },
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
  };
}

describe("CommentSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("加载完成后显示评论列表", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(2)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论 1")).toBeTruthy());
    expect(screen.getByText("评论 2")).toBeTruthy();
  });

  it("无评论时显示空状态提示", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(0)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("暂无评论，来发表第一条吧")).toBeTruthy());
  });

  it("hasMore 时显示「查看更多评论」按钮", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1, 2)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("查看更多评论")).toBeTruthy());
  });

  it("无更多时不显示「查看更多评论」", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1, 1)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论 1")).toBeTruthy());
    expect(screen.queryByText("查看更多评论")).toBeNull();
  });

  it("点击回复触发 CommentInput 回复模式", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => screen.getByText("评论 1"));

    await user.click(screen.getByText("回复"));
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-section.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 实现 CommentSection**

```tsx
// apps/web/components/comments/comment-section.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@repo/ui";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { CommentItem } from "./comment-item";
import { CommentInput } from "./comment-input";
import type { ReplyTarget } from "./comment-item";

interface CommentSectionProps {
  targetType: "article" | "moment" | "guestbook";
  targetId: number;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { comments, isLoading, hasMore, error, loadMore, addComment, addReply } = useCommentList(
    targetType,
    targetId,
  );
  const {
    isSubmitting,
    error: submitError,
    clearError,
    submitComment,
    submitReply,
  } = useCommentSubmit(targetType, targetId);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      setReplyTarget(target);
      setContent("");
      clearError();
    },
    [clearError],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setContent("");
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;

    if (replyTarget) {
      const reply = await submitReply(replyTarget.commentId, content, replyTarget.parentReplyId);
      if (reply) {
        addReply(replyTarget.commentId, reply);
        setReplyTarget(null);
        setContent("");
      }
    } else {
      const comment = await submitComment(content);
      if (comment) {
        addComment(comment);
        setContent("");
      }
    }
  }, [content, replyTarget, submitReply, submitComment, addReply, addComment]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-[18px] py-4">
        {isLoading && comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-(--fg3)">加载中...</div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-(--fg3)">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-(--fg3)">暂无评论，来发表第一条吧</p>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
            ))}
          </div>
        )}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              isDisabled={isLoading}
              onPress={loadMore}
              className="h-8 rounded-full px-[18px] text-xs font-semibold text-(--fg2) hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              {isLoading ? "加载中..." : "查看更多评论"}
            </Button>
          </div>
        )}
      </div>
      <CommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        replyTarget={replyTarget}
        onCancelReply={handleCancelReply}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
```

- [ ] **Step 4: 导出 CommentSection**

修改 `apps/web/components/comments/index.ts`：

```typescript
export { CommentModal } from "./comment-modal";
export { CommentSection } from "./comment-section";
```

- [ ] **Step 5: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-section.test.tsx --reporter=verbose
```

Expected: 5 个测试全 PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/comments/comment-section.tsx apps/web/components/comments/comment-section.test.tsx apps/web/components/comments/index.ts
git commit -m "feat(web): 新增 CommentSection 可复用评论区组件"
```

---

## Task 11: 改造 CommentModal 为 thin wrapper

**Files:**

- Modify: `apps/web/components/comments/comment-modal.tsx`
- Modify: `apps/web/components/comments/comment-modal.test.tsx`

- [ ] **Step 1: 更新测试**

完整替换 `apps/web/components/comments/comment-modal.test.tsx`：

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CommentModal } from "./comment-modal";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

// CommentSection 内部依赖 fetch，在弹窗测试中 mock 掉整个 CommentSection
vi.mock("./comment-section", () => ({
  CommentSection: ({ targetType, targetId }: { targetType: string; targetId: number }) => (
    <div data-testid="comment-section" data-target-type={targetType} data-target-id={targetId} />
  ),
}));

describe("CommentModal", () => {
  it("关闭时不渲染弹窗内容", () => {
    render(
      <CommentModal open={false} title="测试文章" type="技术" targetId={5} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("打开时显示文章类型和标题", () => {
    render(<CommentModal open title="测试文章" type="技术" targetId={5} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "评论" })).toBeTruthy();
    expect(screen.getByText("技术 · 评论")).toBeTruthy();
    expect(screen.getByText("测试文章")).toBeTruthy();
  });

  it("将正确的 targetType 和 targetId 传给 CommentSection", () => {
    render(<CommentModal open title="测试文章" type="技术" targetId={42} onClose={vi.fn()} />);
    const section = screen.getByTestId("comment-section");
    expect(section.dataset.targetType).toBe("article");
    expect(section.dataset.targetId).toBe("42");
  });

  it("点击关闭按钮触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal open title="测试文章" type="技术" targetId={5} onClose={onClose} />);

    await user.click(screen.getByLabelText("关闭评论"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-modal.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: FAIL（CommentModal 不接受 targetId）。

- [ ] **Step 3: 重写 CommentModal**

完整替换 `apps/web/components/comments/comment-modal.tsx`：

```tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { CommentSection } from "./comment-section";

interface CommentModalProps {
  open: boolean;
  title: string;
  type: string;
  targetId: number;
  onClose: () => void;
}

export function CommentModal({ open, title, type, targetId, onClose }: CommentModalProps) {
  if (!open) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/45 p-0 backdrop-blur-md md:items-end md:p-5"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.25)] animate-[slideUpFull_0.4s_cubic-bezier(.32,.72,0,1)] md:relative md:inset-auto md:max-h-[85vh] md:max-w-[520px] md:rounded-[20px_20px_16px_16px] md:border md:animate-[slideUpCard_0.35s_cubic-bezier(.32,.72,0,1)]"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border md:hidden" />
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-[18px] py-3.5">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
              {type} · 评论
            </p>
            <h2 className="line-clamp-2 text-sm font-bold leading-[1.4] text-foreground">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            onPress={onClose}
            aria-label="关闭评论"
            className="h-7 w-7 shrink-0 rounded-lg bg-border p-0 text-(--fg2) hover:bg-primary/10 hover:text-primary"
          >
            <SvgIcon name="close" size={16} />
          </Button>
        </header>
        <CommentSection targetType="article" targetId={targetId} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @repo/web test -- apps/web/components/comments/comment-modal.test.tsx --reporter=verbose
```

Expected: 4 个测试全 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/comment-modal.tsx apps/web/components/comments/comment-modal.test.tsx
git commit -m "refactor(web): CommentModal 改造为 thin wrapper，接入 CommentSection"
```

---

## Task 12: ArticleSection 补全 articleId

**Files:**

- Modify: `apps/web/components/articles/article-section.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 修改 ActiveComment 类型并传递 articleId**

在 `apps/web/components/articles/article-section.tsx` 中：

将：

```typescript
interface ActiveComment {
  title: string;
  type: string;
}
```

改为：

```typescript
interface ActiveComment {
  articleId: number;
  title: string;
  type: string;
}
```

将 `openComment` 函数改为：

```typescript
const openComment = (article: ArticleListItemResp) => {
  setActiveComment({
    articleId: article.id,
    title: article.title,
    type: article.category?.name ?? "文章",
  });
};
```

将 `<CommentModal ...>` 改为：

```tsx
<CommentModal
  open={activeComment !== null}
  title={activeComment?.title ?? ""}
  type={activeComment?.type ?? "文章"}
  targetId={activeComment?.articleId ?? 0}
  onClose={() => setActiveComment(null)}
/>
```

- [ ] **Step 2: 在 article-section.test.tsx 里 mock CommentModal 并新增验证用例**

`article-section.test.tsx` 目前没有 mock `CommentModal`。由于现有测试从不打开评论弹窗（`open` 始终为 `false`），直接渲染真实的 `CommentModal` 也不会导致 fetch。但为了验证 `articleId` 被正确传入，在该文件顶部（其他 `vi.mock` 之后）添加：

```typescript
vi.mock("@/components/comments", () => ({
  CommentModal: ({
    open,
    targetId,
  }: {
    open: boolean;
    targetId: number;
    title: string;
    type: string;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="comment-modal" data-target-id={String(targetId)} />
    ) : null,
}));
```

然后在 `describe("ArticleSection", ...)` 末尾追加：

```typescript
it("点击评论按钮后弹窗接收到正确的 articleId", async () => {
  const user = userEvent.setup();
  // fetch mock 用于 CommentSection 内部（此处弹窗已被 mock，不会实际调用）
  render(
    <ArticleSection
      initialPage={makePageResp({ list: [makeArticle(7, "目标文章")] })}
      categories={mockCategories}
    />,
  );

  // ArticleCardStats 里评论按钮（aria-label="评论"）
  await user.click(screen.getByLabelText("评论"));

  const modal = screen.getByTestId("comment-modal");
  expect(modal.dataset.targetId).toBe("7");
});
```

- [ ] **Step 3: 跑全量测试**

```bash
pnpm --filter @repo/web test -- --reporter=verbose 2>&1 | tail -30
```

Expected: 所有测试 PASS。

- [ ] **Step 4: 类型检查**

```bash
pnpm -r --if-present check-types
```

Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/articles/article-section.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "fix(web): ArticleSection 传递 articleId 给 CommentModal"
```

---

## 全量验证

- [ ] **跑全部测试**

```bash
pnpm -r --if-present test -- --reporter=verbose 2>&1 | tail -40
```

Expected: 所有 PASS，零 FAIL。

- [ ] **类型检查**

```bash
pnpm -r --if-present check-types
```

Expected: 无报错。

- [ ] **Lint**

```bash
pnpm -r --if-present lint
```

Expected: 无报错。
