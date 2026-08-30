# Markdown 代码块增强设计

**日期：** 2026-06-17  
**范围：** `@repo/markdown` 包（render.ts、markdown-content.tsx）+ `@repo/styles`（base.css）

---

## 目标

为博客所有 Markdown 渲染场景（文章正文 + 评论 + 留言板）的代码块添加：

1. 语法高亮（`.hljs-*` 类名配色）
2. 顶部工具栏（语言标签 + 复制按钮）
3. 无语言时：无工具栏，复制按钮绝对定位于右上角

---

## 设计决策

### 工具栏布局

**有语言时**（如 ` ```typescript `）：

```
┌──────────────────────────────────────────────┐
│ </> TypeScript                          [📋] │  ← 同色背景，无分隔线
├──────────────────────────────────────────────┤
│ const x = "hello"                            │  ← 代码区
│ function greet() { return x }               │
└──────────────────────────────────────────────┘
```

**无语言时**（纯文本代码块）：

```
┌──────────────────────────────────────┐
│ npm install react              [📋]  │  ← 复制按钮绝对定位，无顶部栏高度
│ cd my-project                        │
└──────────────────────────────────────┘
```

- 顶部栏与代码区**完全同一背景色**，无 border 分隔
- 复制成功：图标换为绿色勾（✓），2 秒后恢复剪贴板图标

---

## 架构

### 零闪烁策略

工具栏 HTML 骨架（含 SVG 图标）由 **rehype 插件在服务端/同步渲染时输出**，`useEffect` 只绑定 click handler，不修改 DOM 结构。SSR 与水合后视觉完全一致。

### 数据流

```
Markdown 字符串
  → remarkParse
  → remarkRehype
  → rehypeRaw
  → rehypeSlug
  → rehypeHighlight        ← 新增：注入 .hljs-* 类名
  → rehypeCodeWrapper      ← 新增：自定义插件，包装工具栏 HTML
  → rehypeSanitize         ← 更新：放行 button/svg 等新增标签
  → rehypeStringify
  → HTML 字符串（含工具栏 + 高亮）
      → MarkdownContent（dangerouslySetInnerHTML）
          → useEffect：绑定复制 click handler
```

---

## 详细实现

### 1. `packages/markdown/package.json`

新增依赖：

- `rehype-highlight`（wraps lowlight，提供 `.hljs-*` 类名）

### 2. `packages/markdown/src/render.ts`

**rehypeHighlight 配置：**

```typescript
.use(rehypeHighlight, { detect: false, ignoreMissing: true })
```

- `detect: false`：**不**自动猜测语言；只高亮用户在围栏上明确声明了语言的代码块（如 ` ```typescript `），避免无语言代码块被误分类影响工具栏判断逻辑
- `ignoreMissing: true`：遇到未知语言名称不报错

**rehypeCodeWrapper 插件（新建内联函数）：**

遍历所有 `pre > code` 节点，根据 code 元素的 `className` 判断是否有语言：

- **有语言**：在 `pre` 外包一层 `div.md-code-wrapper`，内含 `div.md-code-toolbar`（左侧语言标签含 SVG 图标，右侧复制按钮含 SVG 图标）
- **无语言**：仍包一层 `div.md-code-wrapper`（供 `position: relative` 定位），但不输出 toolbar div；复制按钮作为 `pre` 的兄弟节点绝对定位插入 wrapper 内

**sanitize schema 扩展：**

```typescript
tagNames: [...defaultSchema.tagNames, "u", "button", "svg", "path", "polyline", "rect"],
attributes: {
  ...defaultSchema.attributes,
  "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
  button: ["type", "ariaLabel", "className"],
  svg: ["viewBox", "fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "xmlns", "width", "height"],
  path: ["d", "fill", "stroke"],
  polyline: ["points"],
  rect: ["x", "y", "width", "height", "rx"],
  code: ["className"],
  span: ["className"],
}
```

### 3. `packages/markdown/src/markdown-content.tsx`

- 顶部加 `'use client'`
- 加 `useRef<HTMLDivElement>(null)` 绑定容器
- `useEffect([html])`：
  - 查找所有 `button.md-copy-btn`
  - 绑定 click handler：`navigator.clipboard.writeText(code.textContent)` → 切换图标为勾 → 2s 后恢复

### 4. `packages/styles/src/base.css`

新增 CSS：

**布局类：**

```css
/* 有语言：wrapper + toolbar */
.md-code-wrapper {
  position: relative;
}
.md-code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px 5px;
}
.md-code-lang {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--editor-hl-meta);
  font-family: ui-monospace, monospace;
}

/* 无语言：复制按钮绝对定位 */
.md-code-wrapper .md-copy-btn-abs {
  position: absolute;
  top: 7px;
  right: 8px;
  z-index: 1;
}

/* 复制按钮通用 */
.md-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--editor-hl-meta);
  transition: color 0.15s;
}
.md-copy-btn:hover {
  color: var(--editor-code-fg);
}
.md-copy-btn.copied {
  color: #16a34a;
}

/* prose pre：有 toolbar 时移除顶部 padding */
.md-code-wrapper:has(.md-code-toolbar) pre {
  padding-top: 4px !important;
}
```

**hljs 配色（复用现有 CSS 变量）：**

```css
.md-code-wrapper .hljs-keyword {
  color: var(--editor-hl-keyword);
}
.md-code-wrapper .hljs-string {
  color: var(--editor-hl-string);
}
/* …（与 editor 现有规则对称） */
```

---

## 测试计划

### `render.test.ts` 新增

- 有语言代码围栏 → 输出包含 `.md-code-toolbar` 和 `.md-code-lang`
- 无语言代码围栏 → 输出包含 `.md-copy-btn` 但无 `.md-code-toolbar`
- 语法高亮 → 输出包含 `.hljs-keyword` 等类名

### `markdown-content.test.tsx` 新增

- 点击 `.md-copy-btn` → `navigator.clipboard.writeText` 被调用
- 复制成功后 `.copied` 类被加到按钮

---

## 影响范围

| 组件                             | 变化                                     |
| -------------------------------- | ---------------------------------------- |
| `ArticleContent`                 | 无需改动（透传 html 给 MarkdownContent） |
| `CommentItem` / `CommentReplies` | 无需改动                                 |
| `GuestbookItem`                  | 无需改动                                 |
| `MarkdownContent`                | 加 `'use client'`、ref、useEffect        |
| `render.ts`                      | 加两个 rehype 插件、更新 sanitize        |
| `base.css`                       | 新增约 60 行 CSS                         |

现有 prose 样式（`variant="article"` / `"comment"`）保持不变，只在代码块外层追加 wrapper。

---

## 不在范围内

- 行内代码（`code` 而非 `pre > code`）不加工具栏
- 编辑器（TipTap RichEditor）代码块样式不受影响
- 代码块行号显示
