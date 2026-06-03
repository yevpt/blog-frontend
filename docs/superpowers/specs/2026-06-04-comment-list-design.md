# 文章评论列表对接设计

**日期**：2026-06-04  
**范围**：`apps/web` + `packages/api`  
**目标**：将 `CommentModal` 从 mock 数据切换为真实 API；同时建立可被详情页复用的 `CommentSection` 组件，支持发布评论与回复。

---

## 1. 核心架构

`CommentSection` 是所有评论展示场景的可复用单元。`CommentModal` 是一个薄壳——它只包含遮罩、动画与关闭逻辑，不持有任何评论状态。

```
弹窗场景（当前）
  CommentModal ──wraps──▶ CommentSection(targetType, targetId)

详情页场景（未来）
  ArticleDetailPage ──▶ CommentSection(targetType="article", targetId={id})
  SnippetDetailPage  ──▶ CommentSection(targetType="moment",  targetId={id})
```

---

## 2. 文件变更清单

### 新增

| 文件 | 职责 |
|------|------|
| `packages/api/src/types/comment.ts` | 对应后端 DTO 的 TypeScript 类型 |
| `apps/web/app/api/comments/route.ts` | GET（列表）+ POST（新建评论）代理 |
| `apps/web/app/api/comments/[id]/replies/route.ts` | POST（新建回复）代理 |
| `apps/web/hooks/use-comment-list.ts` | 列表取数、分页、本地追加 |
| `apps/web/hooks/use-comment-submit.ts` | 发布评论、发布回复 |
| `apps/web/store/use-login-modal.ts` | 全局登录弹窗 Zustand store |
| `apps/web/components/comments/comment-section.tsx` | 核心可复用评论区组件 |
| `apps/web/components/auth/login-modal.tsx` | 全局登录弹窗（当前占位） |
| `apps/web/app/providers/global-modals.tsx` | 把 LoginModal 挂载到客户端树 |

### 修改

| 文件 | 改动 |
|------|------|
| `packages/api/src/client.ts` | 新增 `comments` 方法组（listPublic / create / reply） |
| `packages/api/src/index.ts` | 导出新增的 comment 类型 |
| `apps/web/components/comments/comment-modal.tsx` | 改为 thin wrapper，移除 mock，接收 `targetId` |
| `apps/web/components/comments/comment-input.tsx` | 增加登录门控与回复上下文 |
| `apps/web/components/comments/comment-item.tsx` | 增加 `onReply` 回调 prop |
| `apps/web/components/articles/article-section.tsx` | `ActiveComment` 加 `articleId`，传给 `CommentModal` |
| `apps/web/app/layout.tsx` | 渲染 `GlobalModals` |

---

## 3. 数据类型（`packages/api/src/types/comment.ts`）

```ts
export interface CommentUserResp {
  id: number
  username: string
  nickname?: string
  avatar_url?: string
  site?: string
  mark?: string
}

export interface CommentReplyResp {
  id: number
  target_type: string
  comment_id: number
  from_user_id: number
  to_user_id: number
  parent_reply_id: number
  content: string
  from_user?: CommentUserResp
  to_user?: CommentUserResp
  created_at: string
  updated_at: string
}

export interface CommentItemResp {
  id: number
  target_type: string
  target_id: number
  user_id: number
  content: string
  user?: CommentUserResp
  replies: CommentReplyResp[]
  created_at: string
  updated_at: string
}

export interface CommentPageResp {
  total: number
  pages: number
  page: number
  page_size: number
  list: CommentItemResp[]
}

export interface CommentListReq {
  target_type: string
  target_id: number
  page?: number
  page_size?: number
}

export interface CommentCreateReq {
  target_type: string
  target_id: number
  content: string
}

export interface CommentReplyCreateReq {
  target_type: string
  parent_reply_id?: number
  content: string
}
```

---

## 4. API 代理路由

### `GET /api/comments`
转发 `target_type`, `target_id`, `page`, `page_size` 查询参数至后端 `GET /comments`。无需 token（公开接口）。

### `POST /api/comments`
转发请求 body 至后端 `POST /comments`，同时将 `access_token` cookie 拼入 `Authorization: Bearer` 请求头。后端返回 `CommentItemResp`。

### `POST /api/comments/[id]/replies`
转发请求 body 至后端 `POST /comments/{id}/replies`，同上处理 token。后端返回 `CommentReplyResp`。

---

## 5. Hooks

### `useCommentList(targetType, targetId)`

```ts
interface UseCommentListReturn {
  comments: CommentItemResp[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  addComment: (comment: CommentItemResp) => void
  addReply: (commentId: number, reply: CommentReplyResp) => void
}
```

- 首次挂载时自动拉取第 1 页（page_size=10）
- `loadMore` 拉下一页，数据 append 到现有列表末尾
- `hasMore` 由 `page < pages` 判断
- `addComment` / `addReply`：提交成功后本地追加，不重新拉全量

### `useCommentSubmit(targetType, targetId, callbacks)`

```ts
interface UseCommentSubmitCallbacks {
  onCommentCreated: (comment: CommentItemResp) => void
  onReplyCreated: (commentId: number, reply: CommentReplyResp) => void
}
```

- `submitComment(content)` — 调用 `POST /api/comments`
- `submitReply(commentId, parentReplyId, content)` — 调用 `POST /api/comments/{id}/replies`
- 管理 `isSubmitting` 状态，防止重复提交

---

## 6. 组件接口

### `CommentSection`

```ts
interface CommentSectionProps {
  targetType: 'article' | 'moment' | 'guestbook'
  targetId: number
}
```

`CommentSection` 内部：
- 用 `useCommentList` 管理列表
- 用 `useCommentSubmit` 管理提交，成功后调用 `addComment` / `addReply`
- 维护 `replyTarget: { commentId, parentReplyId?, toUser } | null` 状态，传给 `CommentInput`
- 渲染评论列表 → 「查看更多」按钮（`hasMore` 为 false 时隐藏）→ `CommentInput`

### `CommentModal`（thin wrapper）

新增 `targetId: number` prop，保留现有 `title` / `type` prop（用于弹窗自身标题头展示）。内部直接渲染：

```tsx
<CommentSection targetType="article" targetId={targetId} />
```

弹窗标题头（文章标题、类型标签、关闭按钮）保留在 `CommentModal` 自身，不下沉到 `CommentSection`。

### `CommentInput`（更新）

新增 props：
- `replyTarget?: { commentId: number; parentReplyId?: number; toUsername: string } | null`
- `onCancelReply?: () => void`
- `onSubmitSuccess: (result: CommentItemResp | CommentReplyResp) => void`
- `targetType` / `targetId`（用于提交）

未登录时：输入区域替换为「请先登录才能发表评论」提示，按钮文字改为「请先登录」，点击调用 `useLoginModal().open()`。

### `CommentItem`（更新）

新增 `onReply?: (payload: { commentId: number; parentReplyId?: number; toUsername: string }) => void` prop。点击「回复」按钮时触发，不展开内联输入框（回复输入框统一在底部 `CommentInput` 处理）。

---

## 7. 登录弹窗

`useLoginModal` Zustand store（`apps/web/store/use-login-modal.ts`）：

```ts
interface LoginModalStore {
  isOpen: boolean
  open: () => void
  close: () => void
}
```

`LoginModal`（`components/auth/login-modal.tsx`）：当前渲染一个带关闭按钮的占位弹窗，内容后续实现。

`GlobalModals`（`app/providers/global-modals.tsx`）：`'use client'` 组件，渲染 `<LoginModal />`，在 `layout.tsx` 的 `<SessionProvider>` 内部挂载（与 `SiteNavbar` 并列）。

---

## 8. `ArticleSection` 修改

`ActiveComment` 类型新增 `articleId: number`。`openComment` 函数补充 `articleId: article.id`。`CommentModal` 新增 `targetId={activeComment.articleId}` prop。

---

## 9. 测试要求

| 文件 | 测试内容 |
|------|---------|
| `use-comment-list.test.ts` | 初始加载、loadMore append、addComment、addReply、hasMore 判断 |
| `use-comment-submit.test.ts` | 成功提交触发回调、isSubmitting 防重、API 失败不调用回调 |
| `comment-section.test.tsx` | 渲染评论列表、查看更多按钮显隐、回复流程触发 |
| `comment-input.test.tsx` | 已登录正常渲染、未登录显示登录提示、回复模式显示 @用户名 |
| `comment-modal.test.tsx` | open/close 渲染、传递正确 targetId |
