# 留言板页面设计规格

日期：2026-06-11

## 1. 背景与目标

新增 `/guestbook` 路由，为博客提供访客留言板功能。后端接口已全部就绪（`/guestbook` CRUD + replies + like），`@repo/api` 类型和 Next.js API proxy routes 均已存在，无需新增。

## 2. 页面整体布局

### 路由与文件结构

```
apps/web/app/guestbook/
  page.tsx            # Server Component，导出 metadata
  page.test.tsx

apps/web/components/guestbook/
  guestbook-page.tsx          # 'use client'，主编排组件
  guestbook-list.tsx          # 留言列表卡片（含分页）
  guestbook-item.tsx          # 单条留言，布局对齐 CommentItem
  guestbook-replies.tsx       # 回复子列表，布局对齐 CommentReplies
  guestbook-input-bar.tsx     # 固定底部输入栏
  index.ts

apps/web/hooks/
  use-guestbook-list.ts       # 分页列表状态
  use-guestbook-list.test.ts
  use-guestbook-submit.ts     # 提交留言/回复
  use-guestbook-submit.test.ts
  use-guestbook-like.ts       # 点赞切换
  use-guestbook-like.test.ts
```

### 页面容器

对齐碎语页 (`/snippets`) 的容器规格：
```
max-width: 680px（原碎语为 960px，留言板更窄以聚焦阅读）
margin: 0 auto
padding: 40px 20px 110px（底部留出固定输入栏高度）
```

### 页面顶部 header

完全对齐 `SnippetsPageHeader` 的两行式样式：

```tsx
<p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
  来过的人
</p>
<h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
  留下你的痕迹
</h1>
```

不重复显示"留言板"或"Guestbook"字样（导航栏已有）。

## 3. 留言列表卡片（`guestbook-list.tsx`）

### 卡片容器

```
bg-white border border-border rounded-2xl overflow-hidden
```

### 卡片内部结构

```
┌─────────────────────────────────────┐
│  [留言条目列表，px-[18px]]            │
│  ...                                │
├─────────────────────────────────────┤
│  128 条留言  [‹][1][2][3]…[13][›]   │
└─────────────────────────────────────┘
```

**分页行视觉居中方案**（关键约束）：留言数文字不得导致分页偏移。使用三列 Grid：

```tsx
<div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-border px-[18px] py-3">
  <span className="text-[11px] text-(--fg3)">128 条留言</span>
  <Pagination ... />
  <span /> {/* 右侧占位，保证分页视觉居中 */}
</div>
```

### 单条留言（`guestbook-item.tsx`）

**精确对齐 `CommentItem` 布局**，数据来自 `GuestbookItemResp`：

| 属性 | 规格 |
|------|------|
| 外层 flex gap | `gap-2.5`（10px） |
| 头像 | `UserAvatar size="md"`（28px），降级显示用户名首字母 |
| 用户名 | `text-xs font-bold` |
| 身份标签（`mark` 字段） | `text-[10px] text-primary bg-primary/10 rounded-full px-2` |
| 个人站点（`site` 字段） | `text-[11px] text-(--fg3)` 链接，可选显示 |
| 时间 | `text-[11px] text-(--fg3)` |
| 正文 | `text-[12px] text-(--fg1) pr-7.5`，相对定位父容器 |
| 点赞按钮 | `absolute top-0 right-1.75`，INS 风格竖排（图标 + 数字），`SvgIcon name="heart"/"heart-fill"` |
| 回复按钮 | `mt-1.5 text-[11px] font-medium text-(--fg3)` |

### 回复子列表（`guestbook-replies.tsx`）

对齐 `CommentReplies`，调用 `/api/guestbook/comments/{id}/replies`（已有 proxy route）：

| 属性 | 规格 |
|------|------|
| 展开触发 | `——展开 N 条回复`（带短横线），`text-xs text-(--fg2)` |
| 回复头像 | `UserAvatar size="sm"`（22px） |
| 回复正文 | `text-[13px] leading-[1.65] text-(--fg2)`，`@mention` 用 `text-primary` |
| 点赞 | 同 CommentReplies，14px 心形图标 |
| 每页 5 条，"查看更多" / "收起" |

## 4. 固定底部输入栏（`guestbook-input-bar.tsx`）

### 形态与定位

```
position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%)
width: calc(100% - 48px); max-width: 640px（收起）→ 680px（展开）
```

### 收起态（pill）

```
border-radius: 9999px; height: 50px
背景：rgba(255,255,255,0.97) + backdrop-filter: blur(20px)
border: 1.5px solid rgba(0,0,0,0.09)
box-shadow: 0 2px 12px rgba(0,0,0,0.07)
内容：[用户头像 28px] [占位文本"说点什么…"] [↑ 圆形按钮]
```

### 展开态（卡片）

```
border-radius: 14px; height: 根据内容自适应（约 200px）
box-shadow: 0 6px 28px rgba(124,58,237,0.13)
border-color: rgba(124,58,237,0.25)
内容：直接复用 RichCommentInput 组件（含 CodeDialog / ImageDialog / LinkDialog）
```

### 动效规格（关键约束）

**目标**：pill → 卡片过渡丝滑，首次打开无卡顿。

实现要点：

1. **预挂载编辑器**：`RichCommentInput`（Tiptap）在组件 mount 时即挂载，用 `visibility: hidden; pointer-events: none` 隐藏，展开时切换为可见。不在首次点击时才 mount，避免 Tiptap 初始化导致的卡顿帧。

2. **单容器 CSS 过渡**：
   ```css
   .bar-card {
     will-change: height, border-radius;
     transition:
       height        .35s cubic-bezier(.4, 0, .2, 1),
       border-radius .3s  cubic-bezier(.4, 0, .2, 1),
       box-shadow    .3s  ease,
       max-width     .35s cubic-bezier(.4, 0, .2, 1);
   }
   ```
   不切换两个独立 DOM 层，只改 CSS 属性。

3. **状态机打开流程**：
   ```
   idle → 用户点击
         → rAF 帧1：设置 open 状态（触发 CSS 过渡）
         → 展开层 opacity 延迟 120ms 淡入（等卡片先撑开）
   ```

4. **收起流程**：
   ```
   open → 取消/点遮罩
        → 展开层 opacity 立即降为 0
        → rAF 帧1：移除 open 类（触发收起过渡）
        → transition 结束后清空内容
   ```

5. **遮罩**：`position: fixed; inset: 0; background: rgba(0,0,0,0.18)`，`pointer-events` 配合开关状态。

### 未登录状态

收起态显示"请先登录后留言"pill（对齐 `CommentInput` 的未登录样式），点击触发登录弹窗。

## 5. 数据层

### Hooks

| Hook | 职责 |
|------|------|
| `use-guestbook-list` | 分页列表，`loadMore`、`addItem`、`updateLike` |
| `use-guestbook-submit` | 调用 `POST /api/guestbook`，返回新条目 |
| `use-guestbook-like` | 调用 `POST /api/guestbook/{id}/like`，乐观更新 |

对齐 `useCommentList` / `useCommentSubmit` / `useCommentLike` 的命名和接口风格。

### Server Component 数据获取

`page.tsx` 通过 `createServerApiClient` 预取第一页数据（`page=1, page_size=10`），作为 `initialPage` prop 传入，避免客户端首屏加载闪烁。

## 6. SEO

```tsx
export const metadata: Metadata = {
  title: "留言板 | Yevpt's Blog",
  description: "欢迎留下你的足迹，或只是打个招呼",
};
```

## 7. 测试要求

每个新增文件均需对应测试：
- `page.test.tsx`：渲染不崩溃 + 核心内容存在
- `guestbook-item.test.tsx`：props 渲染、点赞交互
- `guestbook-list.test.tsx`：列表渲染、分页交互
- `guestbook-input-bar.test.tsx`：收起/展开状态切换
- `use-guestbook-list.test.ts`：初始状态、分页、更新点赞
- `use-guestbook-submit.test.ts`：提交成功/失败
- `use-guestbook-like.test.ts`：切换点赞

## 8. 响应式

| 断点 | 行为 |
|------|------|
| `base`（移动端） | 单列，底部输入栏 `width: calc(100% - 32px)` |
| `md`（768px+） | 同桌面端布局，无侧边栏 |

底部输入栏在移动端展开时占满屏幕宽度（`max-width: 100%`，取消 `24px` 边距），展开高度根据内容自适应。
