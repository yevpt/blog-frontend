# Markdown 代码块增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博客所有 Markdown 渲染场景（文章 + 评论 + 留言板）添加语法高亮、ChatGPT 风格顶部工具栏（语言标签 + 复制按钮）。

**Architecture:** rehype pipeline 在服务端/同步渲染阶段注入高亮类名并输出完整工具栏 HTML；`MarkdownContent` 加 `'use client'`，`useEffect` 仅绑定复制 click handler，不修改 DOM 结构，实现零闪烁。有语言时显示顶部工具栏；无语言时不占顶部高度，复制按钮绝对定位于右上角。

**Tech Stack:** `rehype-highlight`（语法高亮）、`unist-util-visit`（HAST 遍历）、`hast`（类型）、React `useEffect`、Tailwind CSS 变量

---

## 文件结构

| 文件                                              | 变更类型 | 职责                                                      |
| ------------------------------------------------- | -------- | --------------------------------------------------------- |
| `packages/markdown/package.json`                  | 修改     | 新增 `rehype-highlight`、`unist-util-visit`、`hast` 依赖  |
| `packages/markdown/src/render.ts`                 | 修改     | 加入高亮插件 + 自定义 wrapper 插件 + 更新 sanitize schema |
| `packages/markdown/src/render.test.ts`            | 修改     | 新增代码块高亮与工具栏输出测试                            |
| `packages/markdown/src/markdown-content.tsx`      | 修改     | 加 `'use client'`、`useRef`、`useEffect` 绑复制事件       |
| `packages/markdown/src/markdown-content.test.tsx` | 修改     | 新增复制按钮行为测试                                      |
| `packages/styles/src/base.css`                    | 修改     | 工具栏布局 CSS + hljs 配色规则                            |

---

## Task 1: 安装依赖

**Files:**

- Modify: `packages/markdown/package.json`

- [ ] **Step 1: 安装 rehype-highlight 和辅助包**

```bash
pnpm add rehype-highlight --filter @repo/markdown
pnpm add -D unist-util-visit hast --filter @repo/markdown
```

- [ ] **Step 2: 确认安装成功**

```bash
cat packages/markdown/package.json | grep -E "rehype-highlight|unist-util-visit|hast"
```

预期输出包含这三个包名及版本号。

- [ ] **Step 3: Commit**

```bash
git add packages/markdown/package.json pnpm-lock.yaml
git commit -m "chore(markdown): 安装 rehype-highlight 和 unist-util-visit"
```

---

## Task 2: 添加语法高亮（TDD）

**Files:**

- Modify: `packages/markdown/src/render.ts`
- Modify: `packages/markdown/src/render.test.ts`

- [ ] **Step 1: 在 render.test.ts 末尾写两个失败测试**

打开 `packages/markdown/src/render.test.ts`，在文件末尾 `markdownToHtml` describe 块内追加：

````typescript
it("typescript 代码围栏生成语法高亮类名", async () => {
  const html = await markdownToHtml("```typescript\nconst x = 1\n```");
  expect(html).toContain("hljs-keyword");
});

it("代码围栏的 code 元素保留 language-* className", async () => {
  const html = await markdownToHtml("```typescript\nconst x = 1\n```");
  expect(html).toContain("language-typescript");
});
````

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/markdown test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|hljs|language-typescript"
```

预期：两个新测试 FAIL（输出不含 hljs-keyword）。

- [ ] **Step 3: 修改 render.ts，添加 rehype-highlight + 更新 sanitize schema**

将 `packages/markdown/src/render.ts` 完整替换为：

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import { visit } from "unist-util-visit";
import type { Root, Element, Properties } from "hast";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

// 语言显示名映射
const LANG_DISPLAY: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  css: "CSS",
  html: "HTML",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  sql: "SQL",
  yaml: "YAML",
  markdown: "Markdown",
  xml: "XML",
  graphql: "GraphQL",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  ruby: "Ruby",
  scala: "Scala",
};

function getDisplayLang(lang: string): string {
  return LANG_DISPLAY[lang.toLowerCase()] ?? lang;
}

// SVG：</>  代码图标
function codeIconSvg(): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "12",
      height: "12",
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as Properties,
    children: [
      {
        type: "element",
        tagName: "polyline",
        properties: { points: "5 3 1 8 5 13" } as Properties,
        children: [],
      },
      {
        type: "element",
        tagName: "polyline",
        properties: { points: "11 3 15 8 11 13" } as Properties,
        children: [],
      },
    ],
  };
}

// SVG：剪贴板复制图标
function copyIconSvg(): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as Properties,
    children: [
      {
        type: "element",
        tagName: "rect",
        properties: { x: "9", y: "9", width: "13", height: "13", rx: "2" } as Properties,
        children: [],
      },
      {
        type: "element",
        tagName: "path",
        properties: { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" } as Properties,
        children: [],
      },
    ],
  };
}

// 构建带工具栏的 wrapper（有语言）或仅带绝对定位复制按钮的 wrapper（无语言）
function buildWrapper(pre: Element, lang: string | null): Element {
  const wrapper: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["md-code-wrapper"] } as Properties,
    children: [],
  };

  if (lang) {
    const toolbar: Element = {
      type: "element",
      tagName: "div",
      properties: { className: ["md-code-toolbar"] } as Properties,
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["md-code-lang"] } as Properties,
          children: [codeIconSvg(), { type: "text", value: " " + getDisplayLang(lang) }],
        },
        {
          type: "element",
          tagName: "button",
          properties: {
            className: ["md-copy-btn"],
            type: "button",
            ariaLabel: "复制代码",
          } as Properties,
          children: [copyIconSvg()],
        },
      ],
    };
    wrapper.children.push(toolbar);
  } else {
    // 无语言：复制按钮绝对定位，不占顶部高度
    const copyBtn: Element = {
      type: "element",
      tagName: "button",
      properties: {
        className: ["md-copy-btn", "md-copy-btn-abs"],
        type: "button",
        ariaLabel: "复制代码",
      } as Properties,
      children: [copyIconSvg()],
    };
    wrapper.children.push(copyBtn);
  }

  wrapper.children.push(pre);
  return wrapper;
}

// rehype 插件：将每个 pre>code 包装进带工具栏的 div
function rehypeCodeWrapper() {
  return (tree: Root) => {
    type Replacement = {
      parent: Element | Root;
      index: number;
      pre: Element;
      lang: string | null;
    };
    const replacements: Replacement[] = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const codeChild = node.children.find(
        (c): c is Element => c.type === "element" && (c as Element).tagName === "code",
      );
      if (!codeChild) return;

      const classNames = (codeChild.properties?.className as string[] | undefined) ?? [];
      const langClass = classNames.find((c) => typeof c === "string" && c.startsWith("language-"));
      const lang = langClass ? langClass.replace("language-", "") : null;

      replacements.push({ parent: parent as Element | Root, index, pre: node, lang });
    });

    // 倒序替换，确保 index 不错位
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, pre, lang } = replacements[i];
      parent.children.splice(index, 1, buildWrapper(pre, lang));
    }
  };
}

/**
 * Sanitize 配置：放行 hljs 高亮类名 + 工具栏所需的 button/svg 结构。
 * button/svg 本身不是 XSS 向量；危险的 on* 属性由 defaultSchema 默认拦截。
 */
function buildSanitizeSchema() {
  return {
    ...defaultSchema,
    clobberPrefix: "",
    tagNames: [...(defaultSchema.tagNames ?? []), "u", "button", "svg", "path", "polyline", "rect"],
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
      button: ["type", "ariaLabel", "className"],
      svg: [
        "viewBox",
        "fill",
        "stroke",
        "strokeWidth",
        "strokeLinecap",
        "strokeLinejoin",
        "width",
        "height",
      ],
      path: ["d"],
      polyline: ["points"],
      rect: ["x", "y", "width", "height", "rx"],
      code: [...(defaultSchema.attributes?.["code"] ?? []), "className"],
      span: [...(defaultSchema.attributes?.["span"] ?? []), "className"],
    },
  };
}

function buildPipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeCodeWrapper)
    .use(rehypeSanitize, buildSanitizeSchema())
    .use(rehypeStringify);
}

/** 同步版 Markdown → HTML，适用于客户端 useMemo 实时渲染（无加载状态、无闪烁）。 */
export function markdownToHtmlSync(markdown: string): string {
  return String(buildPipeline().processSync(markdown));
}

/** 异步版 Markdown → HTML，供服务端/SSR 使用（如文章详情页）。 */
export async function markdownToHtml(markdown: string): Promise<string> {
  return String(await buildPipeline().process(markdown));
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

- [ ] **Step 4: 运行测试，确认高亮测试通过**

```bash
pnpm --filter @repo/markdown test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|hljs|language-typescript"
```

预期：两个新测试 PASS，其余测试全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/markdown/src/render.ts packages/markdown/src/render.test.ts packages/markdown/package.json pnpm-lock.yaml
git commit -m "feat(markdown): 添加语法高亮（rehype-highlight）"
```

---

## Task 3: 添加代码块工具栏 wrapper 插件测试（TDD）

**Files:**

- Modify: `packages/markdown/src/render.test.ts`

- [ ] **Step 1: 在 render.test.ts 末尾追加工具栏相关测试**

````typescript
describe("rehypeCodeWrapper", () => {
  it("有语言的代码围栏输出 md-code-wrapper 和 md-code-toolbar", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("md-code-wrapper");
    expect(html).toContain("md-code-toolbar");
    expect(html).toContain("md-code-lang");
    expect(html).toContain("TypeScript");
  });

  it("有语言的代码围栏包含复制按钮（md-copy-btn）", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("md-copy-btn");
    expect(html).not.toContain("md-copy-btn-abs");
  });

  it("无语言代码围栏不输出 md-code-toolbar", async () => {
    const html = await markdownToHtml("```\nnpm install react\n```");
    expect(html).toContain("md-code-wrapper");
    expect(html).not.toContain("md-code-toolbar");
  });

  it("无语言代码围栏输出绝对定位复制按钮（md-copy-btn-abs）", async () => {
    const html = await markdownToHtml("```\nnpm install react\n```");
    expect(html).toContain("md-copy-btn-abs");
  });

  it("未知语言使用原始语言字符串作为显示名", async () => {
    const html = await markdownToHtml("```foobar\ncode\n```");
    expect(html).toContain("foobar");
  });

  it("pre 元素仍在 md-code-wrapper 内", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    // wrapper 在 pre 之前出现
    expect(html.indexOf("md-code-wrapper")).toBeLessThan(html.indexOf("<pre"));
  });
});
````

- [ ] **Step 2: 运行测试，确认新测试全部通过（Task 2 已实现 wrapper）**

```bash
pnpm --filter @repo/markdown test -- --reporter=verbose 2>&1 | tail -20
```

预期：所有测试 PASS。若有失败，说明 Task 2 的实现存在问题，回头检查 render.ts。

- [ ] **Step 3: Commit**

```bash
git add packages/markdown/src/render.test.ts
git commit -m "test(markdown): 补充代码块工具栏输出测试"
```

---

## Task 4: 添加 CSS 样式

**Files:**

- Modify: `packages/styles/src/base.css`

- [ ] **Step 1: 在 base.css 的「RichEditor 代码块样式」区块之后添加以下 CSS**

找到注释 `/* -------------------------------------------------------------------------- */` + `/* 全局动画` 这一行，在它之前插入：

```css
/* -------------------------------------------------------------------------- */
/* Markdown 渲染代码块增强                                                      */
/* -------------------------------------------------------------------------- */

/*
  代码块外层 wrapper：relative 定位供无语言时复制按钮绝对定位。
  background 显式设置以覆盖不同 prose variant 的默认值，确保顶部工具栏与代码区视觉一致。
*/
.md-code-wrapper {
  position: relative;
}

.md-code-wrapper pre {
  background-color: var(--editor-code-bg) !important;
  color: var(--editor-code-fg) !important;
  margin-top: 0 !important;
}

/* 工具栏：与代码区完全同色，无分隔线 */
.md-code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px 5px;
  background-color: var(--editor-code-bg);
  border-radius: 0.5rem 0.5rem 0 0;
}

/* 有工具栏时 pre 取消顶部圆角 */
.md-code-wrapper:has(.md-code-toolbar) pre {
  border-radius: 0 0 0.5rem 0.5rem !important;
  padding-top: 4px !important;
}

/* 语言标签：</> 图标 + 语言名 */
.md-code-lang {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--editor-hl-meta);
  font-family: ui-monospace, monospace;
  letter-spacing: 0.01em;
  user-select: none;
}

/* 复制按钮：通用样式 */
.md-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--editor-hl-meta);
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s;
  line-height: 0;
}

.md-copy-btn:hover {
  color: var(--editor-code-fg);
}

/* 无语言时：绝对定位于 pre 右上角 */
.md-copy-btn-abs {
  position: absolute;
  top: 7px;
  right: 8px;
  z-index: 1;
}

/* ── 语法高亮色（复用 editor 现有 CSS 变量）── */
.md-code-wrapper .hljs-keyword,
.md-code-wrapper .hljs-selector-tag,
.md-code-wrapper .hljs-literal,
.md-code-wrapper .hljs-doctag {
  color: var(--editor-hl-keyword);
}

.md-code-wrapper .hljs-string,
.md-code-wrapper .hljs-regexp,
.md-code-wrapper .hljs-template-string,
.md-code-wrapper .hljs-template-tag {
  color: var(--editor-hl-string);
}

.md-code-wrapper .hljs-comment,
.md-code-wrapper .hljs-quote {
  color: var(--editor-hl-comment);
  font-style: italic;
}

.md-code-wrapper .hljs-number,
.md-code-wrapper .hljs-operator {
  color: var(--editor-hl-number);
}

.md-code-wrapper .hljs-title,
.md-code-wrapper .hljs-title.class_,
.md-code-wrapper .hljs-title.function_ {
  color: var(--editor-hl-title);
  font-weight: 600;
}

.md-code-wrapper .hljs-built_in,
.md-code-wrapper .hljs-type {
  color: var(--editor-hl-builtin);
}

.md-code-wrapper .hljs-attr,
.md-code-wrapper .hljs-attribute,
.md-code-wrapper .hljs-selector-attr,
.md-code-wrapper .hljs-selector-class,
.md-code-wrapper .hljs-selector-id {
  color: var(--editor-hl-attr);
}

.md-code-wrapper .hljs-meta,
.md-code-wrapper .hljs-meta .hljs-string {
  color: var(--editor-hl-meta);
}

.md-code-wrapper .hljs-variable,
.md-code-wrapper .hljs-params {
  color: var(--editor-code-fg);
}

.md-code-wrapper .hljs-addition {
  color: var(--editor-hl-string);
  background-color: color-mix(in srgb, var(--editor-hl-string) 12%, transparent);
}

.md-code-wrapper .hljs-deletion {
  color: var(--editor-hl-number);
  background-color: color-mix(in srgb, var(--editor-hl-number) 12%, transparent);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/styles/src/base.css
git commit -m "style: 添加 Markdown 代码块工具栏与语法高亮 CSS"
```

---

## Task 5: 更新 MarkdownContent 绑定复制事件（TDD）

**Files:**

- Modify: `packages/markdown/src/markdown-content.tsx`
- Modify: `packages/markdown/src/markdown-content.test.tsx`

- [ ] **Step 1: 在 markdown-content.test.tsx 末尾追加复制按钮测试**

先确认文件顶部现有 import，将其更新为：

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";
```

然后在文件最后一个 `});` 之后追加：

```typescript
describe("复制按钮", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it("点击 .md-copy-btn 调用 navigator.clipboard.writeText", async () => {
    const html = `<div class="md-code-wrapper"><button class="md-copy-btn" type="button" aria-label="复制代码"><svg></svg></button><pre><code>const x = 1</code></pre></div>`;
    const { container } = render(<MarkdownContent html={html} />);

    const btn = container.querySelector(".md-copy-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const x = 1");
  });

  it("点击复制按钮后按钮颜色变绿，2 秒后恢复", async () => {
    vi.useFakeTimers();
    const html = `<div class="md-code-wrapper"><button class="md-copy-btn" type="button" aria-label="复制代码"><svg></svg></button><pre><code>hello</code></pre></div>`;
    const { container } = render(<MarkdownContent html={html} />);

    const btn = container.querySelector(".md-copy-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(btn.style.color).toBe("rgb(22, 163, 74)");

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(btn.style.color).toBe("");

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: 运行测试，确认新测试失败**

```bash
pnpm --filter @repo/markdown test -- --reporter=verbose 2>&1 | grep -E "复制|FAIL|PASS" | head -20
```

预期：复制按钮相关两个测试 FAIL。

- [ ] **Step 3: 将 markdown-content.tsx 完整替换**

```typescript
"use client";

import { useRef, useEffect } from "react";
import clsx from "clsx";

export interface MarkdownContentProps {
  /** 已由 markdownToHtml 渲染好的 HTML 字符串 */
  html: string;
  /**
   * 渲染风格：
   *  - article（默认）：文章正文，全尺寸 prose，保持与现有 ArticleContent 一致的样式
   *  - comment：评论紧凑模式，prose-sm + 收紧间距
   */
  variant?: "article" | "comment";
  /** 追加到根元素的自定义类名 */
  className?: string;
}

const VARIANT_CLASSES: Record<"article" | "comment", string> = {
  article: "prose prose-neutral max-w-none dark:prose-invert",
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-1 prose-pre:my-1 prose-code:text-xs",
    "prose-img:max-w-[240px] prose-img:rounded-md",
    "prose-pre:bg-[var(--editor-code-bg)] prose-pre:text-[var(--editor-code-fg)]",
    "prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded-lg",
    "prose-code:text-[var(--editor-code-fg)]",
  ].join(" "),
};

// 复制成功后显示的勾图标（绿色），2 秒后恢复
const CHECKMARK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export function MarkdownContent({ html, variant = "article", className }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll<HTMLButtonElement>(".md-copy-btn");
    const cleanups: Array<() => void> = [];

    buttons.forEach((btn) => {
      const wrapper = btn.closest(".md-code-wrapper");
      if (!wrapper) return;
      const code = wrapper.querySelector("pre > code");
      if (!code) return;

      const originalHTML = btn.innerHTML;

      const handleClick = () => {
        const text = code.textContent ?? "";
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = CHECKMARK_SVG;
          btn.style.color = "rgb(22, 163, 74)";
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = "";
          }, 2000);
        });
      };

      btn.addEventListener("click", handleClick);
      cleanups.push(() => btn.removeEventListener("click", handleClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={clsx(VARIANT_CLASSES[variant], className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 4: 运行全部测试，确认全部通过**

```bash
pnpm --filter @repo/markdown test -- --reporter=verbose 2>&1 | tail -30
```

预期：所有测试 PASS，无 FAIL。

- [ ] **Step 5: 运行全项目类型检查**

```bash
pnpm -r --if-present check-types 2>&1 | tail -10
```

预期：无类型错误。

- [ ] **Step 6: Commit**

```bash
git add packages/markdown/src/markdown-content.tsx packages/markdown/src/markdown-content.test.tsx
git commit -m "feat(markdown): MarkdownContent 绑定代码块复制事件"
```

---

## Task 6: 验证整体效果

**Files:** 无代码修改，仅验证

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm --filter web dev
```

- [ ] **Step 2: 在浏览器访问任一带代码块的文章页或评论页**

检查以下项：

- [ ] 语法高亮颜色正确（关键字紫色、字符串绿色等）
- [ ] 有语言时：顶部显示 `</>` 图标 + 语言名，右侧剪贴板图标
- [ ] 无语言时：无顶部栏，剪贴板图标绝对定位于右上角
- [ ] 顶部工具栏与代码区背景色完全一致（无分隔线）
- [ ] 浅色 / 深色模式均正常
- [ ] 点击复制图标后变为绿色勾，2 秒后恢复

- [ ] **Step 3: 运行全项目 lint**

```bash
pnpm -r --if-present lint 2>&1 | tail -10
```

预期：无错误。
