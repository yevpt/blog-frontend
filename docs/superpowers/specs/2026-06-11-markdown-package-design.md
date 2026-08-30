# Markdown 渲染封装设计

**日期**：2026-06-11  
**状态**：已审批，待实现

---

## 背景与问题

评论模块（`comment-item.tsx`、`comment-replies.tsx`）使用的 `MarkdownText` 组件存在以下问题：

1. **CSS 冲突导致渲染崩溃**：同时应用 `inline`、`prose-p:inline` 与块级 prose HTML（`<p>`、`<ul>` 等），布局错乱。
2. **复用性差**：`MarkdownText` 位于 `components/comments/`，无法在 admin 等其他 app 使用。
3. **样式无法按场景配置**：文章正文与评论需要不同的字号和间距，但当前没有 variant 机制。

---

## 目标

- 新建 `packages/markdown`（`@repo/markdown`），统一封装 markdown 渲染逻辑与展示组件
- 支持 `variant` 配置，区分文章正文（大号）和评论（紧凑）两种渲染风格
- 修复评论 markdown 无法正常渲染的 bug
- 文章页 SEO（服务端渲染）行为保持不变

---

## 架构

### 数据流

```
文章页（Server Component）
  markdownToHtml(article.content)          ← 服务端，SEO 友好
  → contentHtml: string
  → <MarkdownContent variant="article" html={contentHtml} />

评论（Client Component）
  useMarkdown(comment.content)             ← 客户端 hook，调用 Server Action
  → { html, isLoading, error }
  → <MarkdownContent variant="comment" html={html} />
```

### 包结构

```
packages/markdown/
├── package.json
├── tsconfig.json
├── index.ts              # 公共导出：MarkdownContent、useMarkdown
├── server.ts             # server-only 导出：markdownToHtml
├── markdown-content.tsx  # 展示组件（Client Component）
├── use-markdown.ts       # 客户端 hook
└── render.ts             # markdownToHtml 实现（unified 管线）
```

---

## 组件 API

### `MarkdownContent`

```tsx
interface MarkdownContentProps {
  html: string; // 必填：已由 markdownToHtml 生成的 HTML 字符串
  variant?: "article" | "comment"; // 默认 "article"
  className?: string; // 追加自定义类名
}
```

#### `article` variant（保持现有文章样式）

```
prose prose-neutral max-w-none dark:prose-invert
```

#### `comment` variant（紧凑，修复 inline 冲突）

```
prose prose-sm dark:prose-invert max-w-none
prose-p:my-0.5 prose-p:leading-relaxed
prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5
prose-ul:my-1 prose-ol:my-1 prose-li:my-0
prose-blockquote:my-1 prose-pre:my-1 prose-code:text-xs
```

> **注意**：移除现有 `inline` / `prose-p:inline`，这是评论渲染崩溃的根本原因。

---

## useMarkdown hook

```ts
function useMarkdown(content: string): {
  html: string | null; // 渲染后的 HTML，初始为 null
  isLoading: boolean; // 渲染进行中
  error: string | null; // 渲染失败时的错误信息
};
```

- 内部通过 Server Action `renderMarkdown` 调用 `markdownToHtml`
- `content` 变化时自动重新渲染
- 用 `isMounted` 标志防止组件卸载后的异步竞态

---

## markdownToHtml

从 `apps/web/lib/markdown.ts` 迁移，unified 管线不变：

```
remark-parse → remark-rehype → rehype-slug → rehype-sanitize → rehype-stringify
```

sanitize 配置保留现有的 `<u>` 标签和 `id` 属性白名单。

---

## 迁移影响

| 文件                                                     | 变化                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/markdown/`                                     | **新建**                                                                             |
| `apps/web/lib/markdown.ts`                               | 保留 `extractTocFromHtml`；`markdownToHtml` 改为从 `@repo/markdown/server` re-export |
| `apps/web/app/actions/markdown.ts`                       | Server Action 改从 `@repo/markdown/server` 导入 `markdownToHtml`                     |
| `apps/web/components/comments/markdown-text.tsx`         | **删除**，调用方改用 `useMarkdown` + `<MarkdownContent variant="comment">`           |
| `apps/web/components/article-detail/article-content.tsx` | 改用 `<MarkdownContent variant="article" html={contentHtml} />`                      |

---

## 测试要求

- `render.ts`：`markdownToHtml` 单元测试（输入 markdown → 验证输出 HTML 结构）
- `use-markdown.ts`：hook 测试（初始状态、渲染完成、错误状态）
- `markdown-content.tsx`：组件测试（两个 variant 均正常渲染；html prop 变化后更新）

---

## 注释规范

所有封装代码写中文注释，说明：

- 每个 variant 的设计意图
- sanitize 白名单的来由（`<u>` 由 RichEditor 生成，`id` 由 rehype-slug 注入）
- `isMounted` 竞态保护的原因
