# Comment Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将评论模块重设计为 Instagram 风格的底部抽屉 + 内联两种布局，支持手势收起、懒加载回复、三态输入框，并对齐后端全新嵌套路由结构。

**Architecture:** 三层组件架构（Primitives → Section → Shell），`useSheetGesture` 封装完整手势状态机，`CommentReplies` 自管理懒加载，`CommentSection` 通过 `layout` prop 区分弹窗 / 内联场景。后端路由从通用 `/comments?target_type=` 升级为资源嵌套路由，前端新增对应 Route Handler 代理层。

**Tech Stack:** Next.js App Router, React, TypeScript, TailwindCSS, Vitest, @testing-library/react

---

## 文件变更地图

```
packages/api/src/
  types/comment.ts          MODIFY（完整重写：去掉 replies[]，补 reply_count/like_count/is_liked）
  types/guestbook.ts        CREATE（新增留言板类型）
  index.ts                  MODIFY（导出新类型）
  client.ts                 MODIFY（重写 comments 方法组，新增 guestbook 方法组）

apps/web/lib/
  backend-proxy.ts          CREATE（统一代理工具函数 proxyGet/proxyPost/proxyDelete）

apps/web/app/api/
  comments/route.ts                                       DELETE
  comments/[id]/replies/route.ts                          DELETE
  articles/[id]/comments/route.ts                         CREATE (GET, POST)
  articles/comments/[id]/like/route.ts                    CREATE (POST)
  articles/comments/[id]/replies/route.ts                 CREATE (GET, POST)
  articles/comments/[id]/replies/[replyId]/like/route.ts  CREATE (POST)
  articles/comments/[id]/route.ts                         CREATE (DELETE)
  moments/[id]/comments/route.ts                          CREATE (GET, POST)
  moments/comments/[id]/like/route.ts                     CREATE (POST)
  moments/comments/[id]/replies/route.ts                  CREATE (GET, POST)
  moments/comments/[id]/replies/[replyId]/like/route.ts   CREATE (POST)
  moments/comments/[id]/route.ts                          CREATE (DELETE)
  guestbook/route.ts                                      CREATE (GET, POST)
  guestbook/[id]/like/route.ts                            CREATE (POST)
  guestbook/[id]/route.ts                                 CREATE (DELETE)
  guestbook/comments/[id]/replies/route.ts                CREATE (GET, POST)
  guestbook/comments/[id]/replies/[replyId]/like/route.ts CREATE (POST)

apps/web/hooks/
  use-comment-list.ts       MODIFY（新 URL 结构，去掉 addReply，补 incrementReplyCount）
  use-comment-submit.ts     MODIFY（新 URL 结构）
  use-comment-like.ts       CREATE（新增 toggleCommentLike/toggleReplyLike）
  use-sheet-gesture.ts      CREATE（手势引擎，含完整状态机注释）
  use-sheet-gesture.test.ts CREATE
  use-comment-list.test.ts  MODIFY
  use-comment-submit.test.ts MODIFY
  use-comment-like.test.ts  CREATE

apps/web/components/comments/
  comment-replies.tsx       CREATE（懒加载回复子列表）
  comment-replies.test.tsx  CREATE
  comment-item.tsx          MODIFY（INS 风格，含 like 交互，使用 CommentReplies）
  comment-item.test.tsx     MODIFY
  comment-input.tsx         MODIFY（三态：未登录/空/有内容，↑ 发送按钮）
  comment-input.test.tsx    MODIFY
  comment-section.tsx       MODIFY（layout prop，pendingReplies，like 回调）
  comment-section.test.tsx  MODIFY
  comment-modal.tsx         MODIFY（INS Sheet，useSheetGesture，body scroll lock）
  comment-modal.test.tsx    MODIFY
  index.ts                  MODIFY（导出 CommentReplies）

apps/web/components/article-detail/
  article-comments.tsx      MODIFY（传 layout="inline"）
  article-comments.test.tsx MODIFY
```

---

### Task 1: 更新 packages/api 类型文件

**Files:**
- Modify: `packages/api/src/types/comment.ts`
- Create: `packages/api/src/types/guestbook.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 完整重写 `packages/api/src/types/comment.ts`**

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
  like_count: number;
  is_liked: boolean;
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
  reply_count: number;
  like_count: number;
  is_liked: boolean;
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

export interface CommentReplyPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: CommentReplyResp[];
}

export interface CommentListReq {
  page?: number;
  page_size?: number;
}

export interface CommentReplyListReq {
  page?: number;
  page_size?: number;
}

export interface CommentCreateReq {
  content: string;
}

export interface CommentReplyCreateReq {
  parent_reply_id?: number;
  content: string;
}

export interface CommentLikeResp {
  is_liked: boolean;
  like_count: number;
}

export interface CommentDeleteResp {
  id: number;
}
```

- [ ] **Step 2: 创建 `packages/api/src/types/guestbook.ts`**

```typescript
// packages/api/src/types/guestbook.ts
export interface GuestbookUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface GuestbookItemResp {
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

export interface GuestbookPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: GuestbookItemResp[];
}

export interface GuestbookListReq {
  owner_user_id?: number;
  page?: number;
  page_size?: number;
}

export interface GuestbookCreateReq {
  owner_user_id?: number;
  content: string;
}

export interface GuestbookLikeResp {
  id: number;
  is_liked: boolean;
  like_count: number;
}

export interface GuestbookDeleteResp {
  id: number;
}
```

- [ ] **Step 3: 更新 `packages/api/src/index.ts` 导出**

在 `index.ts` 中将原有 comment 导出替换，并新增 guestbook 导出：

```typescript
export type {
  CommentUserResp,
  CommentReplyResp,
  CommentItemResp,
  CommentPageResp,
  CommentReplyPageResp,
  CommentListReq,
  CommentReplyListReq,
  CommentCreateReq,
  CommentReplyCreateReq,
  CommentLikeResp,
  CommentDeleteResp,
} from "./types/comment";
export type {
  GuestbookUserResp,
  GuestbookItemResp,
  GuestbookPageResp,
  GuestbookListReq,
  GuestbookCreateReq,
  GuestbookLikeResp,
  GuestbookDeleteResp,
} from "./types/guestbook";
```

- [ ] **Step 4: 验证类型编译**

```bash
pnpm --filter @repo/api build
```

期望输出：无 TypeScript 错误。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/types/comment.ts packages/api/src/types/guestbook.ts packages/api/src/index.ts
git commit -m "feat(api): 重构评论类型，新增留言板类型

- CommentItemResp 去掉 replies[]，补 reply_count/like_count/is_liked
- CommentReplyResp 补 like_count/is_liked
- 新增 CommentReplyPageResp、CommentLikeResp、CommentDeleteResp
- 新增 guestbook.ts 对应留言板全部 DTO
- 更新 index.ts 导出"
```

---

### Task 2: 更新 packages/api client

**Files:**
- Modify: `packages/api/src/client.ts`

- [ ] **Step 1: 替换 comments 方法组，新增 guestbook 方法组**

将 `client.ts` 中的 `comments` 对象完整替换，并在末尾追加 `guestbook`：

```typescript
// 删除原有 comments 对象，替换为：
comments: {
  /** 分页查询文章评论（可选登录，登录后返回 is_liked） */
  listArticle: (articleId: number, req: CommentListReq = {}) => {
    const p = new URLSearchParams();
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<CommentPageResp>(
      `/articles/${articleId}/comments${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  /** 分页查询碎语评论 */
  listMoment: (momentId: number, req: CommentListReq = {}) => {
    const p = new URLSearchParams();
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<CommentPageResp>(
      `/moments/${momentId}/comments${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  /** 新增文章评论（需登录） */
  createArticle: (articleId: number, req: CommentCreateReq) =>
    fetchAuthed<CommentItemResp>(`/articles/${articleId}/comments`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 新增碎语评论（需登录） */
  createMoment: (momentId: number, req: CommentCreateReq) =>
    fetchAuthed<CommentItemResp>(`/moments/${momentId}/comments`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 分页查询文章评论回复（可选登录） */
  listArticleReplies: (commentId: number, req: CommentReplyListReq = {}) => {
    const p = new URLSearchParams();
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<CommentReplyPageResp>(
      `/articles/comments/${commentId}/replies${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  /** 分页查询碎语评论回复 */
  listMomentReplies: (commentId: number, req: CommentReplyListReq = {}) => {
    const p = new URLSearchParams();
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<CommentReplyPageResp>(
      `/moments/comments/${commentId}/replies${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  /** 回复文章评论（需登录） */
  replyArticle: (commentId: number, req: CommentReplyCreateReq) =>
    fetchAuthed<CommentReplyResp>(`/articles/comments/${commentId}/replies`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 回复碎语评论（需登录） */
  replyMoment: (commentId: number, req: CommentReplyCreateReq) =>
    fetchAuthed<CommentReplyResp>(`/moments/comments/${commentId}/replies`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 切换文章评论点赞（需登录） */
  toggleArticleLike: (commentId: number) =>
    fetchAuthed<CommentLikeResp>(`/articles/comments/${commentId}/like`, {
      method: "POST",
    }),
  /** 切换碎语评论点赞（需登录） */
  toggleMomentLike: (commentId: number) =>
    fetchAuthed<CommentLikeResp>(`/moments/comments/${commentId}/like`, {
      method: "POST",
    }),
  /** 切换文章评论回复点赞（需登录） */
  toggleArticleReplyLike: (commentId: number, replyId: number) =>
    fetchAuthed<CommentLikeResp>(
      `/articles/comments/${commentId}/replies/${replyId}/like`,
      { method: "POST" },
    ),
  /** 切换碎语评论回复点赞（需登录） */
  toggleMomentReplyLike: (commentId: number, replyId: number) =>
    fetchAuthed<CommentLikeResp>(
      `/moments/comments/${commentId}/replies/${replyId}/like`,
      { method: "POST" },
    ),
},
guestbook: {
  /** 分页查询留言（可选登录） */
  list: (req: GuestbookListReq = {}) => {
    const p = new URLSearchParams();
    if (req.owner_user_id !== undefined) p.set("owner_user_id", String(req.owner_user_id));
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<GuestbookPageResp>(`/guestbook${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },
  /** 发表留言（需登录） */
  create: (req: GuestbookCreateReq) =>
    fetchAuthed<GuestbookItemResp>("/guestbook", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 切换留言点赞（需登录） */
  toggleLike: (id: number) =>
    fetchAuthed<GuestbookLikeResp>(`/guestbook/${id}/like`, { method: "POST" }),
  /** 分页查询留言回复 */
  listReplies: (guestbookId: number, req: CommentReplyListReq = {}) => {
    const p = new URLSearchParams();
    if (req.page !== undefined) p.set("page", String(req.page));
    if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
    const qs = p.toString();
    return fetchOptionalAuth<CommentReplyPageResp>(
      `/guestbook/comments/${guestbookId}/replies${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  /** 回复留言（需登录） */
  reply: (guestbookId: number, req: CommentReplyCreateReq) =>
    fetchAuthed<CommentReplyResp>(`/guestbook/comments/${guestbookId}/replies`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  /** 切换留言回复点赞（需登录） */
  toggleReplyLike: (guestbookId: number, replyId: number) =>
    fetchAuthed<CommentLikeResp>(
      `/guestbook/comments/${guestbookId}/replies/${replyId}/like`,
      { method: "POST" },
    ),
},
```

同时在文件顶部 import 区域补充新类型：

```typescript
import type {
  CommentCreateReq,
  CommentItemResp,
  CommentListReq,
  CommentPageResp,
  CommentReplyCreateReq,
  CommentReplyListReq,
  CommentReplyPageResp,
  CommentReplyResp,
  CommentLikeResp,
} from "./types/comment";
import type {
  GuestbookCreateReq,
  GuestbookItemResp,
  GuestbookListReq,
  GuestbookLikeResp,
  GuestbookPageResp,
} from "./types/guestbook";
```

- [ ] **Step 2: 验证编译**

```bash
pnpm --filter @repo/api build
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/client.ts
git commit -m "feat(api): 重写评论/留言 client 方法对齐新后端路由"
```

---

### Task 3: 创建 Route Handler 代理工具函数

**Files:**
- Create: `apps/web/lib/backend-proxy.ts`

- [ ] **Step 1: 创建 `apps/web/lib/backend-proxy.ts`**

```typescript
// apps/web/lib/backend-proxy.ts
import { type NextRequest, NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL!;

function token(req: NextRequest) {
  return req.cookies.get("access_token")?.value;
}

function authHeader(t: string | undefined): Record<string, string> {
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function parseBackendJson(res: Response): Promise<NextResponse> {
  if (res.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (res.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (res.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const json = await res.json();
  if (json.code !== 0) return NextResponse.json({ error: json.message }, { status: 400 });
  return NextResponse.json(json.data);
}

/** GET 代理：转发 query 参数，携带可选 access token */
export async function proxyGet(req: NextRequest, path: string): Promise<NextResponse> {
  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
      method: "GET",
      headers: authHeader(token(req)),
    });
    return parseBackendJson(res);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** POST 代理：转发 JSON body，携带 access token（requireAuth=true 时无 token 直接 401） */
export async function proxyPost(
  req: NextRequest,
  path: string,
  opts: { requireAuth?: boolean; hasBody?: boolean } = {},
): Promise<NextResponse> {
  const { requireAuth = true, hasBody = true } = opts;
  const t = token(req);
  if (requireAuth && !t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = hasBody ? JSON.stringify(await req.json().catch(() => ({}))) : undefined;
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(t) },
      body,
    });
    return parseBackendJson(res);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

/** DELETE 代理：需要 access token */
export async function proxyDelete(req: NextRequest, path: string): Promise<NextResponse> {
  const t = token(req);
  if (!t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "DELETE",
      headers: authHeader(t),
    });
    return parseBackendJson(res);
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
```

- [ ] **Step 2: 验证类型**

```bash
pnpm --filter apps/web exec tsc --noEmit
```

- [ ] **Step 3: 删除旧 comment Route Handlers**

```bash
rm apps/web/app/api/comments/route.ts
rm apps/web/app/api/comments/[id]/replies/route.ts
rm -rf apps/web/app/api/comments
```

同时删除对应测试文件：

```bash
rm apps/web/app/api/comments/route.test.ts
rm "apps/web/app/api/comments/[id]/replies/route.test.ts"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/backend-proxy.ts
git rm -r apps/web/app/api/comments
git commit -m "feat(web): 新增 backend-proxy 工具函数，删除旧评论 Route Handlers"
```

---

### Task 4: 创建 Article 评论 Route Handlers

**Files:**
- Create: `apps/web/app/api/articles/[id]/comments/route.ts`
- Create: `apps/web/app/api/articles/comments/[id]/like/route.ts`
- Create: `apps/web/app/api/articles/comments/[id]/replies/route.ts`
- Create: `apps/web/app/api/articles/comments/[id]/replies/[replyId]/like/route.ts`
- Create: `apps/web/app/api/articles/comments/[id]/route.ts`

- [ ] **Step 1: 文章评论列表 + 创建**

```typescript
// apps/web/app/api/articles/[id]/comments/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/articles/${id}/comments`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/articles/${id}/comments`);
}
```

- [ ] **Step 2: 文章评论点赞**

```typescript
// apps/web/app/api/articles/comments/[id]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/articles/comments/${id}/like`, { hasBody: false });
}
```

- [ ] **Step 3: 文章评论回复列表 + 创建**

```typescript
// apps/web/app/api/articles/comments/[id]/replies/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/articles/comments/${id}/replies`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/articles/comments/${id}/replies`);
}
```

- [ ] **Step 4: 文章评论回复点赞**

```typescript
// apps/web/app/api/articles/comments/[id]/replies/[replyId]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const { id, replyId } = await params;
  return proxyPost(req, `/articles/comments/${id}/replies/${replyId}/like`, { hasBody: false });
}
```

- [ ] **Step 5: 删除文章评论**

```typescript
// apps/web/app/api/articles/comments/[id]/route.ts
import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/articles/comments/${id}`);
}
```

- [ ] **Step 6: 验证类型**

```bash
pnpm --filter apps/web exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/articles/
git commit -m "feat(web): 新增文章评论 Route Handlers（列表/创建/回复/点赞/删除）"
```

---

### Task 5: 创建 Moment + Guestbook Route Handlers

**Files:**
- Create: `apps/web/app/api/moments/[id]/comments/route.ts`
- Create: `apps/web/app/api/moments/comments/[id]/like/route.ts`
- Create: `apps/web/app/api/moments/comments/[id]/replies/route.ts`
- Create: `apps/web/app/api/moments/comments/[id]/replies/[replyId]/like/route.ts`
- Create: `apps/web/app/api/moments/comments/[id]/route.ts`
- Create: `apps/web/app/api/guestbook/route.ts`
- Create: `apps/web/app/api/guestbook/[id]/like/route.ts`
- Create: `apps/web/app/api/guestbook/[id]/route.ts`
- Create: `apps/web/app/api/guestbook/comments/[id]/replies/route.ts`
- Create: `apps/web/app/api/guestbook/comments/[id]/replies/[replyId]/like/route.ts`

- [ ] **Step 1: Moment 评论 Route Handlers**

```typescript
// apps/web/app/api/moments/[id]/comments/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/moments/${id}/comments`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/moments/${id}/comments`);
}
```

```typescript
// apps/web/app/api/moments/comments/[id]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/moments/comments/${id}/like`, { hasBody: false });
}
```

```typescript
// apps/web/app/api/moments/comments/[id]/replies/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/moments/comments/${id}/replies`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/moments/comments/${id}/replies`);
}
```

```typescript
// apps/web/app/api/moments/comments/[id]/replies/[replyId]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const { id, replyId } = await params;
  return proxyPost(req, `/moments/comments/${id}/replies/${replyId}/like`, { hasBody: false });
}
```

```typescript
// apps/web/app/api/moments/comments/[id]/route.ts
import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/moments/comments/${id}`);
}
```

- [ ] **Step 2: Guestbook Route Handlers**

```typescript
// apps/web/app/api/guestbook/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  return proxyGet(req, "/guestbook");
}

export async function POST(req: NextRequest) {
  return proxyPost(req, "/guestbook");
}
```

```typescript
// apps/web/app/api/guestbook/[id]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/guestbook/${id}/like`, { hasBody: false });
}
```

```typescript
// apps/web/app/api/guestbook/[id]/route.ts
import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/guestbook/${id}`);
}
```

```typescript
// apps/web/app/api/guestbook/comments/[id]/replies/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/guestbook/comments/${id}/replies`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/guestbook/comments/${id}/replies`);
}
```

```typescript
// apps/web/app/api/guestbook/comments/[id]/replies/[replyId]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const { id, replyId } = await params;
  return proxyPost(req, `/guestbook/comments/${id}/replies/${replyId}/like`, { hasBody: false });
}
```

- [ ] **Step 3: 验证类型**

```bash
pnpm --filter apps/web exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/moments/ apps/web/app/api/guestbook/
git commit -m "feat(web): 新增碎语评论和留言板 Route Handlers"
```

---

### Task 6: 更新 Hooks（use-comment-list / use-comment-submit / 新增 use-comment-like）

**Files:**
- Modify: `apps/web/hooks/use-comment-list.ts`
- Modify: `apps/web/hooks/use-comment-list.test.ts`
- Modify: `apps/web/hooks/use-comment-submit.ts`
- Modify: `apps/web/hooks/use-comment-submit.test.ts`
- Create: `apps/web/hooks/use-comment-like.ts`
- Create: `apps/web/hooks/use-comment-like.test.ts`

- [ ] **Step 1: 先写 use-comment-list 测试（红）**

完整替换 `apps/web/hooks/use-comment-list.test.ts`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { useCommentList } from "./use-comment-list";

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论 ${id}`,
    reply_count: 0,
    like_count: 0,
    is_liked: false,
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

  it("article 类型使用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    renderHook(() => useCommentList("article", 42));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/articles/42/comments"),
      );
    });
  });

  it("moment 类型使用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    renderHook(() => useCommentList("moment", 7));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/moments/7/comments"),
      );
    });
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

  it("loadMore 追加下一页", async () => {
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

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toHaveLength(2);
  });

  it("addComment 追加到列表末尾", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addComment(makeComment(99)));
    expect(result.current.comments[1].id).toBe(99);
  });

  it("incrementReplyCount 将指定评论 reply_count +1", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)])),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.incrementReplyCount(1));
    expect(result.current.comments[0].reply_count).toBe(1);
  });

  it("fetch 失败时设置 error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentList("article", 1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test hooks/use-comment-list
```

期望：FAIL（`addReply` 不存在，URL 不匹配）

- [ ] **Step 3: 实现新 `use-comment-list.ts`**

```typescript
// apps/web/hooks/use-comment-list.ts
import { useState, useEffect, useCallback } from "react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";

const PAGE_SIZE = 10;

type TargetType = "article" | "moment";

function buildListUrl(targetType: TargetType, targetId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/${targetId}/comments`
      : `/api/moments/${targetId}/comments`;
  return `${base}?page=${page}&page_size=${PAGE_SIZE}`;
}

export function useCommentList(targetType: TargetType, targetId: number) {
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
        const res = await fetch(buildListUrl(targetType, targetId, pageNum));
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as CommentPageResp;
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
    if (!isLoading && hasMore) void fetchPage(page + 1, true);
  }, [isLoading, hasMore, page, fetchPage]);

  const addComment = useCallback((comment: CommentItemResp) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const incrementReplyCount = useCallback((commentId: number) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, reply_count: c.reply_count + 1 } : c)),
    );
  }, []);

  return { comments, isLoading, hasMore, error, loadMore, addComment, incrementReplyCount };
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test hooks/use-comment-list
```

期望：PASS

- [ ] **Step 5: 先写 use-comment-submit 测试（红）**

完整替换 `apps/web/hooks/use-comment-submit.test.ts`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

describe("useCommentSubmit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("submitComment article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, content: "test", reply_count: 0, like_count: 0, is_liked: false, target_type: "article", target_id: 5, user_id: 1, created_at: "", updated_at: "" }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/5/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitComment moment 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, content: "test", reply_count: 0, like_count: 0, is_liked: false, target_type: "moment", target_id: 3, user_id: 1, created_at: "", updated_at: "" }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("moment", 3));
    await act(() => result.current.submitComment("hello"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/moments/3/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submitReply article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 10, content: "reply", like_count: 0, is_liked: false, target_type: "article", comment_id: 1, from_user_id: 2, to_user_id: 1, parent_reply_id: 0, created_at: "", updated_at: "" }),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 5));
    await act(() => result.current.submitReply(1, "reply content"));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/comments/1/replies",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("401 时返回 null 并设置 error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentSubmit("article", 1));
    let ret: unknown;
    await act(async () => { ret = await result.current.submitComment("test"); });

    expect(ret).toBeNull();
    expect(result.current.error).toBe("请先登录");
  });
});
```

- [ ] **Step 6: 实现新 `use-comment-submit.ts`**

```typescript
// apps/web/hooks/use-comment-submit.ts
import { useState, useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";

type TargetType = "article" | "moment";

function commentUrl(targetType: TargetType, targetId: number): string {
  return targetType === "article"
    ? `/api/articles/${targetId}/comments`
    : `/api/moments/${targetId}/comments`;
}

function replyUrl(targetType: TargetType, commentId: number): string {
  return targetType === "article"
    ? `/api/articles/comments/${commentId}/replies`
    : `/api/moments/comments/${commentId}/replies`;
}

export function useCommentSubmit(targetType: TargetType, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch(commentUrl(targetType, targetId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) { setError("请先登录"); return null; }
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
        const res = await fetch(replyUrl(targetType, commentId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        if (res.status === 401) { setError("请先登录"); return null; }
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

- [ ] **Step 7: 先写 use-comment-like 测试（红）**

创建 `apps/web/hooks/use-comment-like.test.ts`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentLike } from "./use-comment-like";

describe("useCommentLike", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("toggleCommentLike article 调用正确 URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 1 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("article"));
    await act(() => result.current.toggleCommentLike(42));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/articles/comments/42/like",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("toggleReplyLike moment 调用正确 URL（含 commentId）", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ is_liked: true, like_count: 2 }),
    } as Response);

    const { result } = renderHook(() => useCommentLike("moment"));
    await act(() => result.current.toggleReplyLike(10, 99));

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      "/api/moments/comments/10/replies/99/like",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("401 时返回 null", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useCommentLike("article"));
    let ret: unknown;
    await act(async () => { ret = await result.current.toggleCommentLike(1); });
    expect(ret).toBeNull();
  });
});
```

- [ ] **Step 8: 实现 `use-comment-like.ts`**

```typescript
// apps/web/hooks/use-comment-like.ts
import { useCallback } from "react";
import type { CommentLikeResp } from "@repo/api";

type TargetType = "article" | "moment";

export function useCommentLike(targetType: TargetType) {
  const toggleCommentLike = useCallback(
    async (commentId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/like`
          : `/api/moments/comments/${commentId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  const toggleReplyLike = useCallback(
    async (commentId: number, replyId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/replies/${replyId}/like`
          : `/api/moments/comments/${commentId}/replies/${replyId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  return { toggleCommentLike, toggleReplyLike };
}
```

- [ ] **Step 9: 运行全部 Hook 测试**

```bash
pnpm --filter apps/web test hooks/use-comment-list hooks/use-comment-submit hooks/use-comment-like
```

期望：PASS

- [ ] **Step 10: Commit**

```bash
git add apps/web/hooks/
git commit -m "feat(web): 更新评论 hooks，新增 use-comment-like

- use-comment-list：URL 对齐新路由，去掉 addReply 改为 incrementReplyCount
- use-comment-submit：URL 对齐新路由，去掉 target_type/target_id from body
- use-comment-like：新增，封装评论/回复点赞 toggle"
```

---

### Task 7: 实现 use-sheet-gesture Hook

**Files:**
- Create: `apps/web/hooks/use-sheet-gesture.ts`
- Create: `apps/web/hooks/use-sheet-gesture.test.ts`

- [ ] **Step 1: 先写测试（红）**

创建 `apps/web/hooks/use-sheet-gesture.test.ts`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useSheetGesture } from "./use-sheet-gesture";

function makeEls() {
  const sheet = document.createElement("div");
  const scroll = document.createElement("div");
  document.body.appendChild(sheet);
  document.body.appendChild(scroll);
  Object.defineProperty(sheet, "offsetHeight", { value: 500, configurable: true });
  return { sheet, scroll };
}

function cleanup(sheet: HTMLElement, scroll: HTMLElement) {
  sheet.remove();
  scroll.remove();
}

function fire(el: HTMLElement, type: string, clientY: number) {
  const isEnd = type === "touchend" || type === "touchcancel";
  const touchInit: TouchEventInit = {
    bubbles: true,
    cancelable: true,
    touches: isEnd ? [] : [{ clientX: 0, clientY, identifier: 1, target: el } as Touch],
    changedTouches: [{ clientX: 0, clientY, identifier: 1, target: el } as Touch],
  };
  el.dispatchEvent(new TouchEvent(type, touchInit));
}

describe("useSheetGesture", () => {
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => { onDismiss = vi.fn(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("初始状态：transform=translateY(0px)，isDragging=false", () => {
    const { sheet, scroll } = makeEls();
    const sheetRef = { current: sheet };
    const scrollRef = { current: scroll };

    const { result, unmount } = renderHook(() =>
      useSheetGesture(sheetRef as never, scrollRef as never, { onDismiss }),
    );

    expect(result.current.isDragging).toBe(false);
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("从顶部向下拖动 > 8px 进入 drag 模式，isDragging=true", () => {
    const { sheet, scroll } = makeEls();
    // scrollTop 默认 0，满足 drag mode 判定
    const { result, unmount } = renderHook(() =>
      useSheetGesture(
        { current: sheet } as never,
        { current: scroll } as never,
        { onDismiss },
      ),
    );

    act(() => {
      fire(sheet, "touchstart", 300);
      fire(sheet, "touchmove", 310); // 10px 向下，超过 8px 阈值
    });

    expect(result.current.isDragging).toBe(true);
    unmount();
    cleanup(sheet, scroll);
  });

  it("大位移松手触发 onDismiss（延迟 350ms）", () => {
    const { sheet, scroll } = makeEls();
    const { unmount } = renderHook(() =>
      useSheetGesture(
        { current: sheet } as never,
        { current: scroll } as never,
        { onDismiss, snapThreshold: 0.3 },
      ),
    );

    act(() => {
      fire(sheet, "touchstart", 100);
      fire(sheet, "touchmove", 260); // 160px > 500×0.3=150px
      fire(sheet, "touchend", 260);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
    expect(onDismiss).toHaveBeenCalledOnce();
    unmount();
    cleanup(sheet, scroll);
  });

  it("小位移松手弹回，translateY 回到 0", () => {
    const { sheet, scroll } = makeEls();
    const { result, unmount } = renderHook(() =>
      useSheetGesture(
        { current: sheet } as never,
        { current: scroll } as never,
        { onDismiss },
      ),
    );

    act(() => {
      fire(sheet, "touchstart", 100);
      fire(sheet, "touchmove", 120); // 20px 向下，不超阈值
      fire(sheet, "touchend", 120);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(result.current.sheetStyle.transform).toBe("translateY(0px)");
    unmount();
    cleanup(sheet, scroll);
  });

  it("卸载时不报错（事件监听器已清理）", () => {
    const { sheet, scroll } = makeEls();
    const { unmount } = renderHook(() =>
      useSheetGesture(
        { current: sheet } as never,
        { current: scroll } as never,
        { onDismiss },
      ),
    );
    expect(() => unmount()).not.toThrow();
    cleanup(sheet, scroll);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test hooks/use-sheet-gesture
```

期望：FAIL（文件不存在）

- [ ] **Step 3: 实现 `use-sheet-gesture.ts`**

```typescript
// apps/web/hooks/use-sheet-gesture.ts
"use client";

/*
 * ════════════════════════════════════════════════════════════════════
 * useSheetGesture — 底部抽屉（Sheet）手势引擎
 * ════════════════════════════════════════════════════════════════════
 *
 * 调用方职责：
 *   sheetRef  → 整个抽屉 div（用于注册 touch 事件）
 *   scrollRef → 内部滚动列表 div（用于读取 scrollTop）
 *   body scroll lock 由调用方（CommentModal）自行管理
 *
 * ┌──────────────────── 状态机 ────────────────────────────────────┐
 * │                                                                │
 * │  [PHASE 1] touchstart                                          │
 * │    快照 startY、startScrollTop，mode = "undecided"             │
 * │                                                                │
 * │  [PHASE 2] touchmove ── 首次位移 > 8px 时锁定 mode             │
 * │    startScrollTop = 0 且向下  →  mode = "drag"                 │
 * │    其他                       →  mode = "scroll"               │
 * │    ⚠ mode 一旦确定，当次触摸全程不再改变                         │
 * │                                                                │
 * │  [PHASE 3] drag mode                                           │
 * │    translateY = max(deltaY, 0)   向上超出原位有阻尼 ×0.2         │
 * │    速度采样：保留最近 100ms 的 (y, t) 对，用于 touchend 计算      │
 * │                                                                │
 * │  [PHASE 4] scroll mode                                         │
 * │    正常滚动，不拦截                                              │
 * │    若 scrollTop=0 且向下 → rubber-band                          │
 * │      translateY = min(rubberDelta × 0.25, 40)                  │
 * │      ⚠ 仅视觉反馈，绝不切换为 drag mode                         │
 * │                                                                │
 * │  [PHASE 5] touchend                                            │
 * │    drag mode：计算是否 dismiss                                  │
 * │      ① displacement > sheetHeight × snapThreshold (默认 0.3)   │
 * │      ② velocity > velocityThreshold (默认 600px/s)              │
 * │         AND displacement > minDisplacement (默认 60px)          │
 * │      满足① 或 ② → DISMISS（translateY → height，350ms 后回调）  │
 * │      否则       → SNAP BACK（translateY → 0，spring 动画）       │
 * │    scroll mode：translateY → 0（必定弹回，绝不 dismiss）          │
 * │                                                                │
 * └────────────────────────────────────────────────────────────────┘
 *
 * pull-to-refresh 三层防御：
 *  [防御1] scrollRef 注入 overscrollBehaviorY = "contain"
 *          告知浏览器不接管 scroll 边界手势
 *  [防御2] startScrollTop=0 且向下时，mode 判定前提前 preventDefault
 *          关闭 8px 阈值窗口期内浏览器接管的机会（需 passive:false）
 *  [防御3] 调用方 CommentModal 管理 body scroll lock
 *          兼容老版 iOS Safari 的 body 穿透滚动
 */

import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";

interface SheetGestureOptions {
  /** 位移超过 sheetHeight × snapThreshold 即收起，默认 0.3 */
  snapThreshold?: number;
  /** 松手前 100ms 均速超过此值（px/s）视为快速甩出，默认 600 */
  velocityThreshold?: number;
  /** 快速甩出时位移的最小保底（px），排除"快划但停在高位"误触，默认 60 */
  minDisplacement?: number;
  /** 收起动画结束后调用（约 350ms 后） */
  onDismiss: () => void;
}

type GestureMode = "undecided" | "drag" | "scroll";

interface GestureState {
  startY: number;
  startScrollTop: number;
  mode: GestureMode;
  velocitySamples: Array<{ y: number; t: number }>;
  rubberBandStartY?: number;
  lastY: number;
}

export function useSheetGesture(
  sheetRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  {
    snapThreshold = 0.3,
    velocityThreshold = 600,
    minDisplacement = 60,
    onDismiss,
  }: SheetGestureOptions,
): { sheetStyle: CSSProperties; isDragging: boolean } {
  // 用 ref 在事件回调中读取最新 translateY，避免闭包旧值
  const translateYRef = useRef(0);
  const [translateY, _setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<GestureState | null>(null);
  // 始终持有最新的 onDismiss，避免闭包捕获旧版本
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  useEffect(() => {
    const sheet = sheetRef.current;
    const scroll = scrollRef.current;
    if (!sheet || !scroll) return;

    // [防御1] 阻止浏览器接管 scroll 边界行为
    scroll.style.overscrollBehaviorY = "contain";

    function setTranslateY(val: number) {
      translateYRef.current = val;
      _setTranslateY(val);
    }

    // ── [PHASE 1] touchstart ─────────────────────────────────────
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      gestureRef.current = {
        startY: touch.clientY,
        startScrollTop: scroll!.scrollTop,
        mode: "undecided",
        velocitySamples: [],
        lastY: touch.clientY,
      };
    }

    // ── [PHASE 2/3/4] touchmove ──────────────────────────────────
    function onTouchMove(e: TouchEvent) {
      const state = gestureRef.current;
      const touch = e.touches[0];
      if (!state || !touch) return;

      const deltaY = touch.clientY - state.startY;
      const now = Date.now();

      // 速度采样窗口：保留最近 100ms
      state.velocitySamples.push({ y: touch.clientY, t: now });
      state.velocitySamples = state.velocitySamples.filter((s) => now - s.t <= 100);

      // [防御2] 在 mode 判定前，startScrollTop=0 且向下 → 提前 preventDefault
      //   必须注册在 sheet（非 scroll）上且 passive:false 才能生效
      if (state.startScrollTop === 0 && deltaY > 0 && state.mode === "undecided") {
        e.preventDefault();
      }

      // [PHASE 2] mode 首次判定（超过 8px 阈值后锁定）
      if (state.mode === "undecided" && Math.abs(deltaY) > 8) {
        const isDragDown = state.startScrollTop === 0 && deltaY > 0;
        state.mode = isDragDown ? "drag" : "scroll";
        if (isDragDown) setIsDragging(true);
      }

      // [PHASE 3] drag mode：sheet 跟手
      if (state.mode === "drag") {
        e.preventDefault();
        // 向下线性跟手；向上超出原位阻尼 ×0.2（不允许负值过大）
        const ty = deltaY >= 0 ? deltaY : deltaY * 0.2;
        setTranslateY(Math.max(ty, 0));
        state.lastY = touch.clientY;
        return;
      }

      // [PHASE 4] scroll mode：正常滚动 + rubber-band
      if (state.mode === "scroll") {
        const currentScrollTop = scroll!.scrollTop;
        const movingDown = touch.clientY > state.lastY;

        if (currentScrollTop <= 0 && movingDown) {
          // scrollTop 归零后继续下滑：rubber-band 视觉
          if (state.rubberBandStartY === undefined) {
            state.rubberBandStartY = touch.clientY;
          }
          const rubberDelta = Math.max(touch.clientY - state.rubberBandStartY, 0);
          setTranslateY(Math.min(rubberDelta * 0.25, 40));
        } else {
          state.rubberBandStartY = undefined;
          setTranslateY(0);
        }
      }

      state.lastY = touch.clientY;
    }

    // ── [PHASE 5] touchend ───────────────────────────────────────
    function onTouchEnd() {
      const state = gestureRef.current;
      gestureRef.current = null;
      setIsDragging(false);

      if (!state || state.mode !== "drag") {
        // scroll mode 或 undecided：必定弹回
        setTranslateY(0);
        return;
      }

      const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
      const displacement = translateYRef.current;

      // 松手前 100ms 均速（px/s）
      const samples = state.velocitySamples;
      let velocity = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0) velocity = (last.y - first.y) / dt;
      }

      const shouldDismiss =
        displacement > sheetHeight * snapThreshold ||
        (velocity > velocityThreshold && displacement > minDisplacement);

      if (shouldDismiss) {
        // dismiss：translateY 推到底部，350ms 后调用 onDismiss
        setTranslateY(sheetHeight);
        setTimeout(() => onDismissRef.current(), 350);
      } else {
        // snap back：spring 动画弹回
        setTranslateY(0);
      }
    }

    // passive:false 允许在 onTouchMove 中调用 preventDefault
    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd, { passive: true });
    sheet.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("touchcancel", onTouchEnd);
      scroll.style.overscrollBehaviorY = "";
    };
  }, [sheetRef, scrollRef, snapThreshold, velocityThreshold, minDisplacement]);

  const sheetStyle: CSSProperties = {
    transform: `translateY(${translateY}px)`,
    // 拖动中关闭过渡（跟手），松手后 spring 弹回
    transition: isDragging ? "none" : "transform 0.35s cubic-bezier(.32,.72,0,1)",
    willChange: "transform",
  };

  return { sheetStyle, isDragging };
}
```

- [ ] **Step 4: 运行测试**

```bash
pnpm --filter apps/web test hooks/use-sheet-gesture
```

期望：PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-sheet-gesture.ts apps/web/hooks/use-sheet-gesture.test.ts
git commit -m "feat(web): 新增 useSheetGesture 手势引擎

- 状态机：undecided → drag/scroll 单向锁定
- drag mode：跟手 + 速度采样 + dismiss/snap-back 判断
- scroll mode：rubber-band 视觉反馈（上限 40px）
- pull-to-refresh 三层防御"
```

---

### Task 8: 创建 CommentReplies 组件

**Files:**
- Create: `apps/web/components/comments/comment-replies.tsx`
- Create: `apps/web/components/comments/comment-replies.test.tsx`

- [ ] **Step 1: 先写测试（红）**

创建 `apps/web/components/comments/comment-replies.test.tsx`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentReplyPageResp, CommentReplyResp } from "@repo/api";
import { CommentReplies } from "./comment-replies";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

function makeReply(id: number): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: 1,
    from_user_id: 2,
    to_user_id: 1,
    parent_reply_id: 0,
    content: `回复 ${id}`,
    from_user: { id: 2, username: "bob", nickname: "Bob" },
    to_user: { id: 1, username: "alice" },
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mockRepliesResp(replies: CommentReplyResp[], pages = 1): CommentReplyPageResp {
  return { total: replies.length, pages, page: 1, page_size: 10, list: replies };
}

describe("CommentReplies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("replyCount=0 时不渲染任何内容", () => {
    render(
      <CommentReplies commentId={1} targetType="article" replyCount={0} />,
    );
    expect(screen.queryByText(/查看/)).toBeNull();
  });

  it("replyCount>0 时显示「查看 N 条回复」触发器", () => {
    render(
      <CommentReplies commentId={1} targetType="article" replyCount={3} />,
    );
    expect(screen.getByText(/查看 3 条回复/)).toBeTruthy();
  });

  it("点击触发器加载回复并展开列表", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRepliesResp([makeReply(10), makeReply(11)])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={2} />);
    await user.click(screen.getByText(/查看 2 条回复/));

    await waitFor(() => expect(screen.getByText("回复 10")).toBeTruthy());
    expect(screen.getByText("回复 11")).toBeTruthy();
    // 触发器消失
    expect(screen.queryByText(/查看 2 条回复/)).toBeNull();
  });

  it("hasMore=true 时显示「查看更多回复」按钮", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRepliesResp([makeReply(1)], 2)),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={5} />);
    await user.click(screen.getByText(/查看 5 条回复/));

    await waitFor(() => expect(screen.getByText("查看更多回复")).toBeTruthy());
  });

  it("pendingReply 非 null 时追加到回复列表", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRepliesResp([makeReply(10)])),
    } as Response);

    const { rerender } = render(
      <CommentReplies commentId={1} targetType="article" replyCount={1} pendingReply={null} />,
    );
    await user.click(screen.getByText(/查看 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 10")).toBeTruthy());

    rerender(
      <CommentReplies
        commentId={1}
        targetType="article"
        replyCount={2}
        pendingReply={makeReply(99)}
      />,
    );
    await waitFor(() => expect(screen.getByText("回复 99")).toBeTruthy());
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test components/comments/comment-replies
```

- [ ] **Step 3: 实现 `comment-replies.tsx`**

```typescript
// apps/web/components/comments/comment-replies.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyPageResp, CommentReplyResp } from "@repo/api";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import type { ReplyTarget } from "./comment-item";

type TargetType = "article" | "moment";

interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  onReply?: (target: ReplyTarget) => void;
  onReplyLike?: (replyId: number) => void;
  pendingReply?: CommentReplyResp | null;
}

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function replyApiUrl(targetType: TargetType, commentId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/comments/${commentId}/replies`
      : `/api/moments/comments/${commentId}/replies`;
  return `${base}?page=${page}&page_size=10`;
}

export function CommentReplies({
  commentId,
  targetType,
  replyCount,
  onReply,
  onReplyLike,
  pendingReply,
}: CommentRepliesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // 防重复消费 pendingReply（同一条 reply 只追加一次）
  const lastConsumedIdRef = useRef<number | null>(null);

  const loadReplies = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      try {
        const res = await fetch(replyApiUrl(targetType, commentId, pageNum));
        if (!res.ok) return;
        const data = (await res.json()) as CommentReplyPageResp;
        setReplies((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, commentId],
  );

  const handleExpand = useCallback(async () => {
    setIsExpanded(true);
    await loadReplies(1, false);
  }, [loadReplies]);

  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore) await loadReplies(page + 1, true);
  }, [isLoading, hasMore, page, loadReplies]);

  // pendingReply 消费：展开状态下追加到列表末尾
  useEffect(() => {
    if (!pendingReply || pendingReply.id === lastConsumedIdRef.current) return;
    lastConsumedIdRef.current = pendingReply.id;
    if (isExpanded) {
      setReplies((prev) => [...prev, pendingReply]);
    }
  }, [pendingReply, isExpanded]);

  if (replyCount === 0 && !isExpanded) return null;

  // 收起状态：只显示触发器
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-(--fg3) hover:text-primary"
      >
        <span className="h-px w-4 bg-current opacity-50" />
        查看 {replyCount} 条回复
      </button>
    );
  }

  // 展开状态：显示回复列表
  return (
    <div className="mt-3 border-l-2 border-border pl-3.5">
      {isLoading && replies.length === 0 ? (
        <p className="py-2 text-xs text-(--fg3)">加载中...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {replies.map((reply) => {
            const fromName = getDisplayName(reply.from_user);
            const toName = reply.to_user ? getDisplayName(reply.to_user) : null;
            return (
              <div key={reply.id} className="flex gap-2">
                <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{fromName}</span>
                    <span className="text-[11px] text-(--fg3)">
                      {formatRelativeTime(new Date(reply.created_at))}
                    </span>
                  </div>
                  <p className="text-[13px] leading-[1.65] text-(--fg2)">
                    {toName && (
                      <span className="mr-1 text-[11px] font-semibold text-primary">
                        @{toName}
                      </span>
                    )}
                    {reply.content}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onReplyLike?.(reply.id)}
                      className="flex items-center gap-1 text-[11px] text-(--fg3) hover:text-primary"
                    >
                      ♥ {reply.like_count > 0 ? reply.like_count : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReply?.({
                          commentId,
                          parentReplyId: reply.id,
                          toUsername: fromName,
                        })
                      }
                      className="text-[11px] font-medium text-(--fg3) hover:text-primary"
                    >
                      回复
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          isDisabled={isLoading}
          onPress={handleLoadMore}
          className="mt-2 h-auto px-0 py-1 text-xs font-medium text-(--fg3) hover:text-primary"
        >
          {isLoading ? "加载中..." : "查看更多回复"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试**

```bash
pnpm --filter apps/web test components/comments/comment-replies
```

期望：PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/comment-replies.tsx apps/web/components/comments/comment-replies.test.tsx
git commit -m "feat(web): 新增 CommentReplies 组件（懒加载回复列表）"

---

### Task 9: 重构 CommentItem（INS 风格）

**Files:**
- Modify: `apps/web/components/comments/comment-item.tsx`
- Modify: `apps/web/components/comments/comment-item.test.tsx`

- [ ] **Step 1: 更新测试（先红）**

完整替换 `apps/web/components/comments/comment-item.test.tsx`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp } from "@repo/api";
import { CommentItem } from "./comment-item";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
// CommentReplies 在 comment-item 内部渲染，直接 mock 掉避免 fetch 依赖
vi.mock("./comment-replies", () => ({
  CommentReplies: ({ replyCount }: { replyCount: number }) => (
    <div data-testid="comment-replies">replies:{replyCount}</div>
  ),
}));

const baseComment: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 5,
  user_id: 10,
  content: "这篇文章写得很好",
  user: { id: 10, username: "alice", nickname: "Alice" },
  reply_count: 2,
  like_count: 5,
  is_liked: false,
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CommentItem", () => {
  it("显示评论者昵称和内容", () => {
    render(
      <CommentItem comment={baseComment} targetType="article" />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("无昵称时显示 username", () => {
    const comment = { ...baseComment, user: { id: 10, username: "alice" } };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("显示点赞数量", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByText(/5/)).toBeTruthy();
  });

  it("点击点赞触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onLike={onLike} />);
    await user.click(screen.getByRole("button", { name: /点赞|♥/i }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复触发 onReply 回调", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onReply={onReply} />);
    await user.click(screen.getByRole("button", { name: "回复" }));
    expect(onReply).toHaveBeenCalledWith({ commentId: 1, toUsername: "Alice" });
  });

  it("渲染 CommentReplies 并传入正确 replyCount", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByTestId("comment-replies")).toBeTruthy();
    expect(screen.getByText("replies:2")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 实现新 `comment-item.tsx`**

```typescript
// apps/web/components/comments/comment-item.tsx
"use client";

import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import { CommentReplies } from "./comment-replies";

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

type TargetType = "article" | "moment";

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (commentId: number) => void;
  onReplyLike?: (commentId: number, replyId: number) => void;
  pendingReply?: CommentReplyResp | null;
}

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

export function CommentItem({
  comment,
  targetType,
  onReply,
  onLike,
  onReplyLike,
  pendingReply,
}: CommentItemProps) {
  const displayName = getDisplayName(comment.user);
  const time = formatRelativeTime(new Date(comment.created_at));

  return (
    <div className="flex gap-2.5">
      <UserAvatar src={comment.user?.avatar_url} name={displayName} size="md" />
      <div className="min-w-0 flex-1">
        {/* 用户名 + 时间 */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{displayName}</span>
          <span className="text-[11px] text-(--fg3)">{time}</span>
        </div>
        {/* 评论内容 */}
        <p className="text-[13px] leading-[1.65] text-(--fg2)">{comment.content}</p>
        {/* 操作行：点赞（左）+ 回复（右） */}
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="button"
            aria-label="点赞"
            onClick={() => onLike?.(comment.id)}
            className="flex items-center gap-1 text-[11px] text-(--fg3) hover:text-primary"
          >
            <span className={comment.is_liked ? "text-primary" : ""}>♥</span>
            {comment.like_count > 0 && (
              <span>{comment.like_count}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onReply?.({ commentId: comment.id, toUsername: displayName })}
            className="text-[11px] font-medium text-(--fg3) hover:text-primary"
          >
            回复
          </button>
        </div>
        {/* 懒加载回复子列表 */}
        <CommentReplies
          commentId={comment.id}
          targetType={targetType}
          replyCount={comment.reply_count}
          onReply={onReply}
          onReplyLike={onReplyLike ? (replyId) => onReplyLike(comment.id, replyId) : undefined}
          pendingReply={pendingReply}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter apps/web test components/comments/comment-item
```

期望：PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/comments/comment-item.tsx apps/web/components/comments/comment-item.test.tsx
git commit -m "refactor(web): 重构 CommentItem 为 INS 风格，接入 CommentReplies"
```

---

### Task 10: 重构 CommentInput（三态 + ↑ 发送按钮）

**Files:**
- Modify: `apps/web/components/comments/comment-input.tsx`
- Modify: `apps/web/components/comments/comment-input.test.tsx`

- [ ] **Step 1: 更新测试（先红）**

完整替换 `apps/web/components/comments/comment-input.test.tsx`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentInput } from "./comment-input";

// mock session 和 login modal
vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: null })),
}));
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: vi.fn(() => ({ open: vi.fn() })),
}));
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

import { useSession } from "@/app/providers/session-provider";

describe("CommentInput", () => {
  it("未登录：显示「登录后参与评论」提示，无发送按钮", () => {
    vi.mocked(useSession).mockReturnValue({ userId: null } as never);
    render(
      <CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(/登录后参与评论/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /发送|↑/ })).toBeNull();
  });

  it("已登录、内容为空：显示「写下你的评论」，无发送按钮", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1 } as never);
    render(
      <CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(/写下你的评论/)).toBeTruthy();
    expect(screen.queryByTestId("icon-send")).toBeNull();
  });

  it("已登录、有内容：显示 ↑ 发送按钮", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1 } as never);
    render(
      <CommentInput value="hello" onChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    // send 图标出现
    expect(screen.getByTestId("icon-arrow-up")).toBeTruthy();
  });

  it("点击 ↑ 发送按钮触发 onSubmit", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({ userId: 1 } as never);
    const onSubmit = vi.fn();
    render(
      <CommentInput value="hello" onChange={vi.fn()} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByTestId("icon-arrow-up").closest("button")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("回复目标显示 @用户名 + 取消按钮", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1 } as never);
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
    expect(screen.getByRole("button", { name: "取消" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: 检查 arrow-up 图标是否存在**

```bash
ls packages/icons/svg/ | grep arrow
```

如果不存在 `arrow-up.svg`，需要新增（见 Step 3）。

- [ ] **Step 3: 如缺少图标，新增 arrow-up.svg 并重建**

在 `packages/icons/svg/` 下新建 `arrow-up.svg`：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 19V5M5 12l7-7 7 7"/>
</svg>
```

然后重建 icons 包：

```bash
pnpm --filter @repo/icons build
```

- [ ] **Step 4: 实现新 `comment-input.tsx`**

```typescript
// apps/web/components/comments/comment-input.tsx
"use client";

import { SvgIcon } from "@repo/icons";
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
  const { userId } = useSession();
  const { open: openLogin } = useLoginModal();

  const isLoggedIn = userId != null;
  const hasContent = value.trim().length > 0;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-[18px] py-3 pb-safe-bottom">
      {/* 回复目标提示 */}
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
      {/* 输入区：pill 容器 */}
      <div
        className="relative flex items-end rounded-2xl border border-input bg-background px-3 py-2.5 focus-within:border-primary"
        onClick={!isLoggedIn ? () => openLogin() : undefined}
        role={!isLoggedIn ? "button" : undefined}
        tabIndex={!isLoggedIn ? 0 : undefined}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isLoggedIn ? "写下你的评论..." : "登录后参与评论"}
          disabled={!isLoggedIn || isSubmitting}
          rows={1}
          style={{ resize: "none", minHeight: "24px", maxHeight: "120px" }}
          className="flex-1 bg-transparent text-[13px] leading-normal text-foreground outline-none placeholder:text-(--fg3) disabled:cursor-pointer"
          // 自动扩展高度
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        {/* ↑ 发送按钮：仅在已登录 + 有内容时显示 */}
        {isLoggedIn && hasContent && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            aria-label="发送"
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/85 disabled:opacity-50"
          >
            <SvgIcon name="arrow-up" size={16} />
          </button>
        )}
      </div>
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  );
}
```

- [ ] **Step 5: 运行测试**

```bash
pnpm --filter apps/web test components/comments/comment-input
```

期望：PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/comments/comment-input.tsx apps/web/components/comments/comment-input.test.tsx packages/icons/
git commit -m "refactor(web): CommentInput 三态重构，↑ 发送按钮嵌入 pill 右侧"
```

---

### Task 11: 重构 CommentSection（layout prop + pendingReplies + like 回调）

**Files:**
- Modify: `apps/web/components/comments/comment-section.tsx`
- Modify: `apps/web/components/comments/comment-section.test.tsx`

- [ ] **Step 1: 更新测试（先红）**

完整替换 `apps/web/components/comments/comment-section.test.tsx`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { CommentSection } from "./comment-section";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: 1 })),
}));
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: vi.fn(() => ({ open: vi.fn() })),
}));
vi.mock("./comment-replies", () => ({
  CommentReplies: () => null,
}));

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论内容 ${id}`,
    user: { id: 1, username: "alice", nickname: "Alice" },
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mockPage(list: CommentItemResp[]): CommentPageResp {
  return { total: list.length, pages: 1, page: 1, page_size: 10, list };
}

describe("CommentSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);
  });

  it("modal layout：加载并渲染评论列表", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="modal" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.getByText("评论内容 2")).toBeTruthy();
  });

  it("inline layout：评论列表仍然渲染", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="inline" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("暂无评论时显示提示文案", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([])),
    } as Response);
    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText(/暂无评论/)).toBeTruthy());
  });
});
```

- [ ] **Step 2: 实现新 `comment-section.tsx`**

```typescript
// apps/web/components/comments/comment-section.tsx
"use client";

import { useState, useCallback, type RefObject } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp } from "@repo/api";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { useCommentLike } from "@/hooks/use-comment-like";
import { CommentInput } from "./comment-input";
import { CommentItem, type ReplyTarget } from "./comment-item";

type TargetType = "article" | "moment";

interface CommentSectionProps {
  targetType: TargetType;
  targetId: number;
  /** modal：输入框在底部（默认）；inline：输入框在顶部，列表自然流 */
  layout?: "modal" | "inline";
  /** modal layout 时由 CommentModal 传入，供 useSheetGesture 读取 scrollTop */
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export function CommentSection({
  targetType,
  targetId,
  layout = "modal",
  scrollRef,
}: CommentSectionProps) {
  const { comments, isLoading, hasMore, error, loadMore, addComment, incrementReplyCount } =
    useCommentList(targetType, targetId);
  const { isSubmitting, error: submitError, clearError, submitComment, submitReply } =
    useCommentSubmit(targetType, targetId);
  const { toggleCommentLike, toggleReplyLike } = useCommentLike(targetType);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");
  // 每个评论最新待展示的回复（由 CommentReplies 的 pendingReply prop 消费）
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

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
        incrementReplyCount(replyTarget.commentId);
        setPendingReplies((prev) => ({ ...prev, [replyTarget.commentId]: reply }));
        setReplyTarget(null);
        setContent("");
      }
      return;
    }

    const comment = await submitComment(content);
    if (comment) {
      addComment(comment);
      setContent("");
    }
  }, [content, replyTarget, submitReply, submitComment, addComment, incrementReplyCount]);

  const handleCommentLike = useCallback(
    async (commentId: number) => {
      await toggleCommentLike(commentId);
    },
    [toggleCommentLike],
  );

  const handleReplyLike = useCallback(
    async (commentId: number, replyId: number) => {
      await toggleReplyLike(commentId, replyId);
    },
    [toggleReplyLike],
  );

  const commentList = (
    <>
      {isLoading && comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-(--fg3)">加载中...</div>
      ) : error ? (
        <p className="py-4 text-center text-sm text-(--fg3)">{error}</p>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-(--fg3)">暂无评论，来发表第一条吧</p>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetType={targetType}
              onReply={handleReply}
              onLike={handleCommentLike}
              onReplyLike={handleReplyLike}
              pendingReply={pendingReplies[comment.id] ?? null}
            />
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
    </>
  );

  const input = (
    <CommentInput
      value={content}
      onChange={setContent}
      onSubmit={handleSubmit}
      replyTarget={replyTarget}
      onCancelReply={handleCancelReply}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );

  // modal layout：列表可滚动在上，输入框固定在下
  if (layout === "modal") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-[18px] py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {commentList}
        </div>
        {input}
      </div>
    );
  }

  // inline layout：输入框在上，列表自然流（页面整体可滚动）
  return (
    <div className="flex flex-col gap-6">
      {input}
      <div>{commentList}</div>
    </div>
  );
}
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter apps/web test components/comments/comment-section
```

期望：PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/comments/comment-section.tsx apps/web/components/comments/comment-section.test.tsx
git commit -m "refactor(web): CommentSection 新增 layout prop，接入 like/pendingReplies"

---

### Task 12: 重构 CommentModal（INS Sheet + useSheetGesture + body scroll lock）

**Files:**
- Modify: `apps/web/components/comments/comment-modal.tsx`
- Modify: `apps/web/components/comments/comment-modal.test.tsx`

- [ ] **Step 1: 更新测试（先红）**

完整替换 `apps/web/components/comments/comment-modal.test.tsx`：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentModal } from "./comment-modal";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("./comment-section", () => ({
  CommentSection: () => <div data-testid="comment-section" />,
}));
vi.mock("@/hooks/use-sheet-gesture", () => ({
  useSheetGesture: () => ({
    sheetStyle: {},
    isDragging: false,
  }),
}));

describe("CommentModal", () => {
  it("open=false 时不渲染", () => {
    render(
      <CommentModal open={false} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染遮罩和 dialog", () => {
    render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("评论")).toBeTruthy();
  });

  it("header 只显示「评论」，不显示文章标题", () => {
    render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    // 确认 header 里不含其他文字（只有"评论"）
    const header = screen.getByRole("banner") ?? screen.getByText("评论").closest("header");
    expect(header?.textContent?.trim()).toBe("评论");
  });

  it("点击遮罩触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={onClose} />,
    );
    // 点击遮罩（最外层 div）
    const backdrop = container.firstElementChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape 键触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={onClose} />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("渲染 CommentSection 并传入正确 targetType/targetId", () => {
    render(
      <CommentModal open={true} targetType="moment" targetId={7} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId("comment-section")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 实现新 `comment-modal.tsx`**

```typescript
// apps/web/components/comments/comment-modal.tsx
"use client";

import { useRef, useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";
import { CommentSection } from "./comment-section";

type TargetType = "article" | "moment";

interface CommentModalProps {
  open: boolean;
  targetType: TargetType;
  targetId: number;
  onClose: () => void;
}

export function CommentModal({ open, targetType, targetId, onClose }: CommentModalProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { sheetStyle, isDragging } = useSheetGesture(
    sheetRef as never,
    scrollRef as never,
    { onDismiss: onClose },
  );

  // [防御3] body scroll lock：sheet 打开时锁定 body，防止底层页面滚动穿透
  useEffect(() => {
    if (!open) return;
    const savedScrollY = window.scrollY;
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${savedScrollY}px;width:100%`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, savedScrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    // 遮罩层
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Sheet 主体：移动端全宽 70%dvh，PC 端固定宽度卡片 */}
      <section
        ref={sheetRef as never}
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        style={isDragging ? sheetStyle : { ...sheetStyle }}
        className="
          relative flex w-full flex-col overflow-hidden rounded-t-[20px] bg-card shadow-[0_-4px_40px_rgba(0,0,0,0.18)]
          [height:70dvh] [max-height:92dvh]
          md:relative md:inset-auto md:h-auto md:max-h-[85vh] md:max-w-[520px] md:rounded-[20px_20px_16px_16px]
          animate-[slideUpSheet_0.4s_cubic-bezier(.32,.72,0,1)]
        "
      >
        {/* 拖动把手 */}
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 cursor-grab rounded-full bg-border active:cursor-grabbing md:hidden" />

        {/* Header：居中"评论"，右侧关闭按钮 */}
        <header className="flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
          <h2 className="text-sm font-semibold text-foreground">评论</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭评论"
            className="absolute right-[18px] flex h-7 w-7 items-center justify-center rounded-lg bg-border text-(--fg2) hover:bg-primary/10 hover:text-primary"
          >
            <SvgIcon name="close" size={16} />
          </button>
        </header>

        {/* CommentSection（modal layout，传入 scrollRef 供手势引擎读 scrollTop） */}
        <CommentSection
          targetType={targetType}
          targetId={targetId}
          layout="modal"
          scrollRef={scrollRef}
        />
      </section>
    </div>
  );
}
```

在 `apps/web/app/globals.css`（或项目的 Tailwind config）中添加动画：

```css
@keyframes slideUpSheet {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

如果项目已有 `animate-[slideUpFull_...]` 等动画，在同一位置追加 `slideUpSheet` 即可，不要重复定义已有动画。

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter apps/web test components/comments/comment-modal
```

期望：PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/comments/comment-modal.tsx apps/web/components/comments/comment-modal.test.tsx
git commit -m "refactor(web): CommentModal 重构为 INS Sheet，接入 useSheetGesture + body lock"
```

---

### Task 13: 更新 ArticleComments + 清理导出 + 全量验证

**Files:**
- Modify: `apps/web/components/article-detail/article-comments.tsx`
- Modify: `apps/web/components/article-detail/article-comments.test.tsx`
- Modify: `apps/web/components/comments/index.ts`

- [ ] **Step 1: 更新 article-comments.tsx（传入 layout="inline"）**

```typescript
// apps/web/components/article-detail/article-comments.tsx
"use client";

import { CommentSection } from "@/components/comments";

interface ArticleCommentsProps {
  articleId: number;
  commentCount: number;
}

export function ArticleComments({ articleId, commentCount }: ArticleCommentsProps) {
  return (
    <section id="article-comments" className="border-t border-border">
      <div className="mx-auto max-w-[720px] px-5 pb-20 pt-10">
        <h2 className="mb-6 text-lg font-bold text-foreground">
          评论{" "}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
        </h2>
        <CommentSection targetType="article" targetId={articleId} layout="inline" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 更新 article-comments.test.tsx**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleComments } from "./article-comments";

vi.mock("@/components/comments", () => ({
  CommentSection: ({ layout }: { layout: string }) => (
    <div data-testid="comment-section" data-layout={layout} />
  ),
}));

describe("ArticleComments", () => {
  it("渲染评论标题和数量", () => {
    render(<ArticleComments articleId={1} commentCount={5} />);
    expect(screen.getByText(/评论/)).toBeTruthy();
    expect(screen.getByText("5 条")).toBeTruthy();
  });

  it("传入 layout=inline 给 CommentSection", () => {
    render(<ArticleComments articleId={1} commentCount={0} />);
    expect(screen.getByTestId("comment-section").dataset.layout).toBe("inline");
  });
});
```

- [ ] **Step 3: 更新 comments/index.ts**

```typescript
// apps/web/components/comments/index.ts
export { CommentModal } from "./comment-modal";
export { CommentSection } from "./comment-section";
export { CommentReplies } from "./comment-replies";
```

- [ ] **Step 4: 运行所有评论相关测试**

```bash
pnpm --filter apps/web test components/comments components/article-detail/article-comments hooks/use-comment-list hooks/use-comment-submit hooks/use-comment-like hooks/use-sheet-gesture
```

期望：全部 PASS

- [ ] **Step 5: 类型检查**

```bash
pnpm --filter apps/web exec tsc --noEmit
pnpm --filter @repo/api build
```

期望：无错误

- [ ] **Step 6: 最终 Commit**

```bash
git add apps/web/components/article-detail/ apps/web/components/comments/index.ts
git commit -m "feat(web): ArticleComments 接入 inline layout，更新 comments 导出

- ArticleComments 传入 layout=\"inline\" 给 CommentSection
- comments/index.ts 导出新增 CommentReplies"
```

---

## 自查清单

**Spec 覆盖：**
- [x] INS 风格底部抽屉（70%dvh，把手，手势收起）→ Task 12
- [x] useSheetGesture 状态机（undecided/drag/scroll，速度+位移判断）→ Task 7
- [x] pull-to-refresh 三层防御 → Task 7
- [x] rubber-band 阻尼效果（×0.25，上限 40px）→ Task 7
- [x] 回复懒加载（默认折叠，点击展开，查看更多）→ Task 8
- [x] pendingReply 优化追加 → Task 8/11
- [x] CommentInput 三态（未登录/空/有内容）→ Task 10
- [x] ↑ 发送按钮嵌入 pill 右侧 → Task 10
- [x] layout="inline"（输入框在上） → Task 11/13
- [x] 后端路由对齐（新 Route Handlers）→ Task 3/4/5
- [x] API 类型更新（reply_count/like_count/is_liked）→ Task 1/2
- [x] 点赞功能（评论/回复）→ Task 6/9/11
- [x] guestbook 类型 + Route Handlers（UI 暂留未来）→ Task 1/5

**类型一致性确认：**
- `CommentItemResp.reply_count`（非 `replies[]`）贯穿 Task 1→6→8→9
- `TargetType = "article" | "moment"` 贯穿 Task 6→8→9→11→12
- `ReplyTarget` 定义在 `comment-item.tsx`，由 `comment-replies.tsx` / `comment-section.tsx` 导入
- `scrollRef` 从 `CommentModal` 传入 `CommentSection`（Task 11/12 对齐）
```
```
