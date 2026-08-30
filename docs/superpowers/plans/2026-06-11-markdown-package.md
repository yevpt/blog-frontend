# Markdown 渲染封装实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `packages/markdown`（`@repo/markdown`），统一封装 markdown 渲染函数、展示组件和客户端 hook，修复评论模块渲染错误，支持 `article`/`comment` 两种样式 variant。

**Architecture:** 包含三个导出：服务端渲染函数 `markdownToHtml`（unified 管线，server-only）、展示组件 `MarkdownContent`（接收 HTML + variant）、客户端 hook `useMarkdown(content, renderFn)`（renderFn 由调用方注入，保持 hook 跨 app 通用）。文章页保持 SSR 流程（`markdownToHtml` 在 Server Component 中直接调用），评论使用 hook 客户端渲染。

**Tech Stack:** unified v11, remark-parse, remark-rehype, rehype-slug, rehype-sanitize, rehype-stringify, React 19, TailwindCSS + @tailwindcss/typography (`prose`), Vitest + @testing-library/react

---

## 文件映射

| 操作 | 路径                                                                                         |
| ---- | -------------------------------------------------------------------------------------------- |
| 新建 | `packages/markdown/package.json`                                                             |
| 新建 | `packages/markdown/tsconfig.json`                                                            |
| 新建 | `packages/markdown/vitest.config.ts`                                                         |
| 新建 | `packages/markdown/eslint.config.js`                                                         |
| 新建 | `packages/markdown/src/render.ts`                                                            |
| 新建 | `packages/markdown/src/render.test.ts`                                                       |
| 新建 | `packages/markdown/src/markdown-content.tsx`                                                 |
| 新建 | `packages/markdown/src/markdown-content.test.tsx`                                            |
| 新建 | `packages/markdown/src/use-markdown.ts`                                                      |
| 新建 | `packages/markdown/src/use-markdown.test.ts`                                                 |
| 新建 | `packages/markdown/src/index.ts`                                                             |
| 新建 | `packages/markdown/src/server.ts`                                                            |
| 修改 | `packages/styles/src/base.css`（添加 Tailwind 扫描路径）                                     |
| 修改 | `apps/web/package.json`（添加 `@repo/markdown` 依赖）                                        |
| 修改 | `apps/web/lib/markdown.ts`（改为从 `@repo/markdown/server` re-export）                       |
| 修改 | `apps/web/app/actions/markdown.ts`（改为从 `@repo/markdown/server` 导入）                    |
| 修改 | `apps/web/components/article-detail/article-content.tsx`（使用 `MarkdownContent`）           |
| 修改 | `apps/web/components/comments/comment-item.tsx`（使用 `useMarkdown` + `MarkdownContent`）    |
| 修改 | `apps/web/components/comments/comment-item.test.tsx`（更新 mock）                            |
| 修改 | `apps/web/components/comments/comment-replies.tsx`（使用 `useMarkdown` + `MarkdownContent`） |
| 修改 | `apps/web/components/comments/comment-replies.test.tsx`（更新 mock）                         |
| 删除 | `apps/web/components/comments/markdown-text.tsx`                                             |

---

## Task 1: 新建 packages/markdown 包配置

**Files:**

- Create: `packages/markdown/package.json`
- Create: `packages/markdown/tsconfig.json`
- Create: `packages/markdown/vitest.config.ts`
- Create: `packages/markdown/eslint.config.js`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@repo/markdown",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    },
    "./server": {
      "types": "./src/server.ts",
      "import": "./src/server.ts"
    }
  },
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix"
  },
  "peerDependencies": {
    "react": "*"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "unified": "^11.0.5",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
    "rehype-slug": "^6.0.0",
    "rehype-sanitize": "^6.0.0",
    "rehype-stringify": "^10.0.1"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@vitejs/plugin-react": "^6.0.2"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "extends": "@repo/typescript-config/react",
  "compilerOptions": {
    "types": ["react"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "markdown",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
  },
});
```

- [ ] **Step 3b: 创建 src/vitest.setup.ts（注册 @testing-library/jest-dom matchers）**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: 创建 eslint.config.js**

```js
import { react } from "@repo/eslint-config/react";

/** @type {import("eslint").Linter.Config[]} */
export default [...react, { ignores: ["node_modules/**"] }];
```

- [ ] **Step 5: 安装依赖**

```bash
pnpm install
```

Expected: pnpm 自动链接 workspace 包，`packages/markdown/node_modules` 包含 unified 等依赖。

- [ ] **Step 6: 创建空的 src/index.ts 占位（保证后续 check-types 不报模块找不到）**

```ts
// 客户端导出（后续步骤逐步填充）
export {};
```

- [ ] **Step 7: 验证包结构**

```bash
pnpm --filter @repo/markdown check-types
```

Expected: 编译通过（0 errors）。

- [ ] **Step 8: Commit**

```bash
git add packages/markdown/
git commit -m "chore(markdown): 初始化 @repo/markdown 包结构"
```

---

## Task 2: 实现 markdownToHtml 和 extractTocFromHtml（TDD）

**Files:**

- Create: `packages/markdown/src/render.ts`
- Create: `packages/markdown/src/render.test.ts`

逻辑来源：`apps/web/lib/markdown.ts`，完整迁移，不修改管线行为。

- [ ] **Step 1: 新建测试文件 render.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { markdownToHtml, extractTocFromHtml } from "./render";

describe("markdownToHtml", () => {
  it("将 **bold** 转换为 <strong>bold</strong>", async () => {
    const html = await markdownToHtml("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("将 _italic_ 转换为 <em>italic</em>", async () => {
    const html = await markdownToHtml("_italic_");
    expect(html).toContain("<em>italic</em>");
  });

  it("为 h2 标题注入 id（rehype-slug）", async () => {
    const html = await markdownToHtml("## Hello World");
    expect(html).toContain('id="hello-world"');
  });

  it("允许 <u> 标签通过 sanitize（RichEditor 生成的下划线格式）", async () => {
    const html = await markdownToHtml("<u>underline</u>");
    expect(html).toContain("<u>underline</u>");
  });

  it("过滤危险的 <script> 标签", async () => {
    const html = await markdownToHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
  });
});

describe("extractTocFromHtml", () => {
  it("从 HTML 中提取 h2/h3 标题", () => {
    const html = '<h2 id="intro">介绍</h2><h3 id="detail">详情</h3>';
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(2);
    expect(toc[0]).toEqual({ id: "intro", text: "介绍", level: 2 });
    expect(toc[1]).toEqual({ id: "detail", text: "详情", level: 3 });
  });

  it("忽略 h1 和 h4+ 标题", () => {
    const html = '<h1 id="top">Top</h1><h4 id="low">Low</h4>';
    expect(extractTocFromHtml(html)).toHaveLength(0);
  });

  it("空 HTML 返回空数组", () => {
    expect(extractTocFromHtml("")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/markdown test
```

Expected: FAIL，`Cannot find module './render'`。

- [ ] **Step 3: 创建 render.ts**

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * 将 Markdown 字符串转换为安全的 HTML 字符串。
 *
 * 管线：remark-parse → remark-rehype → rehype-slug → rehype-sanitize → rehype-stringify
 *
 * sanitize 白名单扩展说明：
 *  - <u>：RichEditor 以 <u>text</u> 形式存储下划线，defaultSchema 不含 <u>，需显式添加
 *  - id 属性：rehype-slug 为标题注入 id，sanitize 默认会剥离，需放行
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      tagNames: [...(defaultSchema.tagNames ?? []), "u"],
      attributes: {
        ...defaultSchema.attributes,
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

/**
 * 从已渲染的 HTML 中提取 h2/h3 目录项。
 * 依赖 rehype-slug 注入的 id 属性，因此必须在 markdownToHtml 之后调用。
 */
export function extractTocFromHtml(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const id = match[2];
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    if (id && text) items.push({ id, level, text });
  }
  return items;
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/markdown test
```

Expected: 所有 render 相关测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/markdown/src/render.ts packages/markdown/src/render.test.ts
git commit -m "feat(markdown): 实现 markdownToHtml 和 extractTocFromHtml"
```

---

## Task 3: 实现 MarkdownContent 展示组件（TDD）

**Files:**

- Create: `packages/markdown/src/markdown-content.tsx`
- Create: `packages/markdown/src/markdown-content.test.tsx`

- [ ] **Step 1: 新建测试文件 markdown-content.test.tsx**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("渲染 html prop 的内容", () => {
    render(<MarkdownContent html="<p>hello world</p>" />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("article variant（默认）包含 prose 和 prose-neutral 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="article" />);
    expect(container.firstChild).toHaveClass("prose", "prose-neutral");
  });

  it("comment variant 包含 prose 和 prose-sm 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).toHaveClass("prose", "prose-sm");
  });

  it("comment variant 不包含 inline 类（修复旧 MarkdownText 的布局崩溃问题）", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).not.toHaveClass("inline");
  });

  it("未传 variant 时默认使用 article 样式", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" />);
    expect(container.firstChild).toHaveClass("prose-neutral");
  });

  it("className prop 追加到根元素", () => {
    const { container } = render(
      <MarkdownContent html="<p>test</p>" className="my-custom-class" />,
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("html 为空字符串时不崩溃", () => {
    expect(() => render(<MarkdownContent html="" />)).not.toThrow();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/markdown test
```

Expected: FAIL，`Cannot find module './markdown-content'`。

- [ ] **Step 3: 创建 markdown-content.tsx**

```tsx
import clsx from "clsx";

export interface MarkdownContentProps {
  /** 已由 markdownToHtml 渲染好的 HTML 字符串 */
  html: string;
  /**
   * 渲染风格：
   *  - article（默认）：文章正文，全尺寸 prose，保持与现有 ArticleContent 一致的样式
   *  - comment：评论紧凑模式，prose-sm + 收紧间距；
   *             注意：不使用 inline 类 —— 旧 MarkdownText 误用 inline 导致块级元素布局崩溃
   */
  variant?: "article" | "comment";
  /** 追加到根元素的自定义类名 */
  className?: string;
}

const VARIANT_CLASSES: Record<"article" | "comment", string> = {
  // 文章正文：全尺寸 prose，颜色 neutral，深色模式反色
  article: "prose prose-neutral max-w-none dark:prose-invert",
  // 评论：prose-sm 缩小字号；段落、标题、列表、代码均收紧间距
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-1 prose-pre:my-1 prose-code:text-xs",
  ].join(" "),
};

export function MarkdownContent({ html, variant = "article", className }: MarkdownContentProps) {
  return (
    <div
      className={clsx(VARIANT_CLASSES[variant], className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/markdown test
```

Expected: 所有 MarkdownContent 测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/markdown/src/markdown-content.tsx packages/markdown/src/markdown-content.test.tsx
git commit -m "feat(markdown): 实现 MarkdownContent 展示组件，支持 article/comment variant"
```

---

## Task 4: 实现 useMarkdown hook（TDD）

**Files:**

- Create: `packages/markdown/src/use-markdown.ts`
- Create: `packages/markdown/src/use-markdown.test.ts`

`renderFn` 由调用方（通常是 Next.js Server Action）注入，hook 本身不感知具体渲染实现，保持跨 app 通用。

- [ ] **Step 1: 新建测试文件 use-markdown.test.ts**

```ts
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMarkdown } from "./use-markdown";

describe("useMarkdown", () => {
  it("初始状态：html 为 null，isLoading 为 true，error 为 null", () => {
    const renderFn = vi.fn().mockResolvedValue("<p>hello</p>");
    const { result } = renderHook(() => useMarkdown("hello", renderFn));
    expect(result.current.html).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("渲染完成后 html 有值，isLoading 变为 false", async () => {
    const renderFn = vi.fn().mockResolvedValue("<p>hello</p>");
    const { result } = renderHook(() => useMarkdown("hello", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.html).toBe("<p>hello</p>");
    expect(result.current.error).toBeNull();
  });

  it("content 变化时重新调用 renderFn", async () => {
    const renderFn = vi.fn().mockResolvedValue("<p>content</p>");
    const { result, rerender } = renderHook(
      ({ content }: { content: string }) => useMarkdown(content, renderFn),
      { initialProps: { content: "hello" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ content: "world" });
    await waitFor(() => expect(renderFn).toHaveBeenCalledWith("world"));
  });

  it("renderFn 抛出异常时 error 有值，html 保持 null", async () => {
    const renderFn = vi.fn().mockRejectedValue(new Error("parse error"));
    const { result } = renderHook(() => useMarkdown("bad", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("parse error");
    expect(result.current.html).toBeNull();
  });

  it("content 为空字符串时正常调用 renderFn", async () => {
    const renderFn = vi.fn().mockResolvedValue("");
    const { result } = renderHook(() => useMarkdown("", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(renderFn).toHaveBeenCalledWith("");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/markdown test
```

Expected: FAIL，`Cannot find module './use-markdown'`。

- [ ] **Step 3: 创建 use-markdown.ts**

```ts
"use client";

import { useState, useEffect } from "react";

/**
 * 异步 markdown 渲染 hook。
 *
 * 接受 renderFn 而不是直接导入 Server Action，使 hook 与具体渲染实现解耦，
 * 各 app（web/admin）可注入自己的 renderMarkdown Server Action。
 *
 * @param content  原始 Markdown 字符串
 * @param renderFn 将 Markdown 转换为 HTML 的异步函数（通常是 Server Action）
 */
export function useMarkdown(
  content: string,
  renderFn: (content: string) => Promise<string>,
): { html: string | null; isLoading: boolean; error: string | null } {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // isMounted 防止组件卸载后异步回调更新已销毁组件的状态（竞态保护）
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    renderFn(content)
      .then((result) => {
        if (isMounted) {
          setHtml(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [content, renderFn]);

  return { html, isLoading, error };
}
```

- [ ] **Step 4: 运行全部测试，确认通过**

```bash
pnpm --filter @repo/markdown test
```

Expected: 所有测试 PASS（render、MarkdownContent、useMarkdown 共 14 个）。

- [ ] **Step 5: Commit**

```bash
git add packages/markdown/src/use-markdown.ts packages/markdown/src/use-markdown.test.ts
git commit -m "feat(markdown): 实现 useMarkdown hook，renderFn 由调用方注入"
```

---

## Task 5: 包导出入口 + Tailwind 扫描配置

**Files:**

- Modify: `packages/markdown/src/index.ts`
- Create: `packages/markdown/src/server.ts`
- Modify: `packages/styles/src/base.css`

- [ ] **Step 1: 更新 src/index.ts（客户端导出）**

```ts
// 客户端可用的导出：展示组件 + 渲染 hook
export { MarkdownContent } from "./markdown-content";
export type { MarkdownContentProps } from "./markdown-content";
export { useMarkdown } from "./use-markdown";
```

- [ ] **Step 2: 创建 src/server.ts（服务端专用导出）**

```ts
// 服务端专用导出，包含 Node.js 依赖（unified/remark/rehype）
// 不可在浏览器环境中直接 import，应通过 Server Component 或 Server Action 调用
export { markdownToHtml, extractTocFromHtml } from "./render";
export type { TocItem } from "./render";
```

- [ ] **Step 3: 在 Tailwind 扫描配置中添加 packages/markdown 路径**

修改 `packages/styles/src/base.css`，在 `@source "../../editor/src";` 后追加一行：

```css
@source "../../markdown/src";
```

完整扫描块：

```css
@source "../../ui/src";
@source "../../hooks/src";
@source "../../editor/src";
@source "../../markdown/src";
```

- [ ] **Step 4: 验证包类型检查通过**

```bash
pnpm --filter @repo/markdown check-types
```

Expected: 0 errors。

- [ ] **Step 5: Commit**

```bash
git add packages/markdown/src/index.ts packages/markdown/src/server.ts packages/styles/src/base.css
git commit -m "feat(markdown): 配置包导出入口，添加 Tailwind 扫描路径"
```

---

## Task 6: 迁移 apps/web（lib、actions、article-content）

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/lib/markdown.ts`
- Modify: `apps/web/app/actions/markdown.ts`
- Modify: `apps/web/components/article-detail/article-content.tsx`

- [ ] **Step 1: 在 apps/web/package.json 中添加 @repo/markdown 依赖**

在 `dependencies` 中追加：

```json
"@repo/markdown": "workspace:*"
```

运行 `pnpm install` 链接依赖：

```bash
pnpm install
```

- [ ] **Step 2: 更新 apps/web/lib/markdown.ts 为 re-export**

当前文件包含 `markdownToHtml`、`extractTocFromHtml`、`TocItem` 的实现，迁移后改为从 `@repo/markdown/server` 透传，避免修改其所有调用方：

```ts
// markdownToHtml 和 extractTocFromHtml 已迁移至 @repo/markdown
// 此文件保留为兼容层，供 apps/web 内部调用方过渡使用
export { markdownToHtml, extractTocFromHtml, type TocItem } from "@repo/markdown/server";
```

- [ ] **Step 3: 更新 apps/web/app/actions/markdown.ts**

```ts
"use server";

import { markdownToHtml } from "@repo/markdown/server";

export async function renderMarkdown(content: string): Promise<string> {
  return await markdownToHtml(content);
}
```

- [ ] **Step 4: 更新 article-content.tsx 使用 MarkdownContent**

当前文件：`apps/web/components/article-detail/article-content.tsx`

```tsx
"use client";

import { useRef } from "react";
import { MarkdownContent } from "@repo/markdown";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

interface ArticleContentProps {
  contentHtml: string;
}

export function ArticleContent({ contentHtml }: ArticleContentProps) {
  const articleRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(articleRef);

  return (
    <>
      <div
        data-testid="reading-progress"
        className="fixed left-0 top-0 z-50 h-[2px] bg-primary transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
      {/* 外层 article 保持语义标签和定位样式，prose 样式由 MarkdownContent 管理 */}
      <article ref={articleRef} className="mx-auto max-w-[720px] pb-10 px-2 md:px-0 pt-8">
        <MarkdownContent html={contentHtml} variant="article" />
      </article>
    </>
  );
}
```

- [ ] **Step 5: 验证类型检查和测试**

```bash
pnpm --filter web check-types
pnpm --filter web test --run
```

Expected: 0 type errors；原有 article-content 相关测试 PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/lib/markdown.ts apps/web/app/actions/markdown.ts apps/web/components/article-detail/article-content.tsx
git commit -m "feat(markdown): 迁移 apps/web 使用 @repo/markdown"
```

---

## Task 7: 更新评论组件，删除旧 MarkdownText

**Files:**

- Modify: `apps/web/components/comments/comment-item.tsx`
- Modify: `apps/web/components/comments/comment-item.test.tsx`
- Modify: `apps/web/components/comments/comment-replies.tsx`
- Modify: `apps/web/components/comments/comment-replies.test.tsx`（如有 MarkdownText mock）
- Delete: `apps/web/components/comments/markdown-text.tsx`

- [ ] **Step 1: 更新 comment-item.tsx**

替换 `MarkdownText` 导入和用法：

```tsx
"use client";

import { useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useMarkdown, MarkdownContent } from "@repo/markdown";
import { renderMarkdown } from "@/app/actions/markdown";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import { CommentReplies } from "./comment-replies";

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

type TargetType = "article" | "moment";

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (commentId: number) => void;
  pendingReply?: CommentReplyResp | null;
}

/** 评论正文：使用 useMarkdown hook 异步渲染 Markdown，加载期间展示纯文本 */
function CommentBody({ content }: { content: string }) {
  const { html, isLoading } = useMarkdown(content, renderMarkdown);
  if (isLoading || !html) {
    return <span>{content}</span>;
  }
  return <MarkdownContent html={html} variant="comment" />;
}

export function CommentItem({
  comment,
  targetType,
  onReply,
  onLike,
  pendingReply,
}: CommentItemProps) {
  const displayName = getDisplayName(comment.user);
  const time = formatRelativeTime(new Date(comment.created_at));

  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [onReply, comment.id, displayName]);

  return (
    <div className="comment-item" data-comment-id={comment.id}>
      <div className="flex gap-2.5">
        <UserAvatar src={comment.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>

          <div className="flex gap-2 relative">
            <div className="min-w-0 pr-7.5 flex-1 text-[12px] text-(--fg1)">
              <CommentBody content={comment.content} />
            </div>
            <Button
              variant="text"
              type="button"
              onClick={handleLike}
              aria-label={comment.is_liked ? "取消点赞" : "点赞"}
              className={cn(
                "absolute top-0 right-1.75 flex shrink-0 flex-col items-center gap-0.5 self-start pt-0.5",
                comment.is_liked
                  ? "text-red-500 hover:text-red-500"
                  : "text-black/54 dark:text-(--fg3)",
              )}
            >
              <SvgIcon
                className="animate-[heartbeat_3s_ease-in-out_infinite]"
                name={comment.is_liked ? "heart-fill" : "heart"}
                size={16}
              />
              {comment.like_count > 0 && (
                <span
                  className={`text-[10px] font-medium ${comment.is_liked ? "text-red-500" : "text-(--fg3)"}`}
                >
                  {comment.like_count}
                </span>
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="text"
            onPress={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors"
          >
            回复
          </Button>

          <CommentReplies
            commentId={comment.id}
            targetType={targetType}
            replyCount={comment.reply_count}
            pendingReply={pendingReply}
            onReply={onReply ?? (() => undefined)}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 comment-item.test.tsx**

打开 `apps/web/components/comments/comment-item.test.tsx`，将所有对 `MarkdownText` 的 mock 替换为对 `@repo/markdown` 的 mock：

```ts
// 文件顶部添加 mock（如原测试有 vi.mock("./markdown-text") 则替换）
vi.mock("@repo/markdown", () => ({
  useMarkdown: () => ({ html: "<p>mocked</p>", isLoading: false, error: null }),
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));
```

确保已有测试（渲染不崩溃、用户信息展示、点赞/回复按钮）仍然通过。

- [ ] **Step 3: 更新 comment-replies.tsx 中的 ReplyItem**

在 `ReplyItem` 函数内，替换 `MarkdownText` 为 `useMarkdown` + `MarkdownContent`：

在文件顶部导入部分，替换：

```ts
// 删除：
import { MarkdownText } from "./markdown-text";
// 新增：
import { useMarkdown, MarkdownContent } from "@repo/markdown";
import { renderMarkdown } from "@/app/actions/markdown";
```

在 `ReplyItem` 函数内，新增一个内部组件处理 Markdown 渲染（与 comment-item.tsx 保持一致的模式）：

在 `ReplyItem` 函数定义前添加：

```tsx
/** 回复正文：异步渲染 Markdown，加载期间展示纯文本 */
function ReplyBody({ content }: { content: string }) {
  const { html, isLoading } = useMarkdown(content, renderMarkdown);
  if (isLoading || !html) {
    return <span>{content}</span>;
  }
  return <MarkdownContent html={html} variant="comment" />;
}
```

将 `ReplyItem` JSX 中的：

```tsx
<MarkdownText content={reply.content} />
```

替换为：

```tsx
<ReplyBody content={reply.content} />
```

- [ ] **Step 4: 删除旧 markdown-text.tsx**

```bash
rm apps/web/components/comments/markdown-text.tsx
```

- [ ] **Step 5: 运行全量测试**

```bash
pnpm test:run
```

Expected: 所有测试通过，0 failures。如有测试引用了已删除的 `MarkdownText`，根据 Step 2 的 mock 模式逐一修复。

- [ ] **Step 6: 全量类型检查**

```bash
pnpm check-types
```

Expected: 0 type errors。

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/comments/
git commit -m "feat(markdown): 更新评论组件使用 useMarkdown + MarkdownContent，删除旧 MarkdownText"
```
