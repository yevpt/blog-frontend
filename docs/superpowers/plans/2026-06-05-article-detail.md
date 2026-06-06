# Article Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建文章详情页 `/articles/[id]`，含全宽 Hero、Markdown 渲染、sticky TOC、浮动操作（音乐/点赞/回顶）、内联评论区。

**Architecture:** `page.tsx` 是 Server Component，直接调用 `createServerApiClient().articles.getDetail(id)` 拉取文章数据，使用 remark/rehype 管道在服务端将 Markdown 转 HTML，并从渲染结果中提取 TOC 章节列表，再将 `contentHtml` 和 `tocItems` 作为 props 传给各客户端子组件。交互逻辑（进度条、TOC 高亮、点赞、音乐）全部在客户端组件中处理。

**Tech Stack:** Next.js 16 App Router, TailwindCSS v4 + `@tailwindcss/typography`, `unified` / `remark-parse` / `remark-rehype` / `rehype-slug` / `rehype-sanitize` / `rehype-stringify`, React 19, `@repo/api`, 现有 `CommentSection` 组件。

---

## 文件清单

| 路径 | 操作 | 说明 |
|------|------|------|
| `packages/styles/src/base.css` | 修改 | 添加 `@plugin "@tailwindcss/typography"` |
| `packages/api/src/types/article.ts` | 修改 | 追加 `ArticleDetailResp` |
| `packages/api/src/index.ts` | 修改 | 导出 `ArticleDetailResp` |
| `packages/api/src/client.ts` | 修改 | 追加 `articles.getDetail` / `articles.view` |
| `packages/api/src/client.test.ts` | 修改 | 补充上述方法的测试 |
| `apps/web/lib/markdown.ts` | 新建 | `markdownToHtml` + `extractTocFromHtml` |
| `apps/web/hooks/use-scroll-progress.ts` | 新建 | 返回 0~1 阅读进度 |
| `apps/web/hooks/use-scroll-progress.test.ts` | 新建 | |
| `apps/web/hooks/use-active-heading.ts` | 新建 | IntersectionObserver 追踪当前章节 |
| `apps/web/hooks/use-active-heading.test.ts` | 新建 | |
| `apps/web/app/api/articles/[id]/view/route.ts` | 新建 | `POST /api/articles/[id]/view` |
| `apps/web/app/api/articles/[id]/view/route.test.ts` | 新建 | |
| `apps/web/components/article-detail/article-hero.tsx` | 新建 | 全宽 Hero 封面区 |
| `apps/web/components/article-detail/article-hero.test.tsx` | 新建 | |
| `apps/web/components/article-detail/article-content.tsx` | 新建 | Markdown HTML 渲染 + 进度条 |
| `apps/web/components/article-detail/article-content.test.tsx` | 新建 | |
| `apps/web/components/article-detail/article-toc.tsx` | 新建 | 目录（`variant` prop 区分 mobile/desktop） |
| `apps/web/components/article-detail/article-toc.test.tsx` | 新建 | |
| `apps/web/components/article-detail/music-player.tsx` | 新建 | 迷你音乐播放器 |
| `apps/web/components/article-detail/music-player.test.tsx` | 新建 | |
| `apps/web/components/article-detail/article-float-actions.tsx` | 新建 | 右下角浮动操作 + 阅读上报 |
| `apps/web/components/article-detail/article-float-actions.test.tsx` | 新建 | |
| `apps/web/components/article-detail/article-comments.tsx` | 新建 | CommentSection inline wrapper |
| `apps/web/components/article-detail/article-comments.test.tsx` | 新建 | |
| `apps/web/components/article-detail/index.ts` | 新建 | barrel export |
| `apps/web/app/articles/[id]/page.tsx` | 新建 | SSR 页面入口 |
| `apps/web/app/articles/[id]/page.test.tsx` | 新建 | |

---

## Task 1: 安装依赖 + 启用 Tailwind Typography

**Files:**
- Modify: `packages/styles/src/base.css`

- [ ] **Step 1: 安装 remark/rehype 和 typography**

```bash
pnpm --filter apps/web add unified remark-parse remark-rehype rehype-slug rehype-sanitize rehype-stringify
pnpm --filter apps/web add @tailwindcss/typography
```

Expected: `Done in ...`（pnpm-lock.yaml 更新）

- [ ] **Step 2: 在 `packages/styles/src/base.css` 第二行添加 typography 插件**

找到 `@import "tailwindcss";`，在其正后方添加一行：

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 3: 类型检查确认无报错**

```bash
pnpm --filter apps/web check-types
```

Expected: 无错误输出

- [ ] **Step 4: Commit**

```bash
git add packages/styles/src/base.css apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): 安装 remark/rehype/typography 依赖"
```

---

## Task 2: packages/api — ArticleDetailResp 类型

**Files:**
- Modify: `packages/api/src/types/article.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 在 `packages/api/src/types/article.ts` 末尾追加**

```typescript
export interface ArticleDetailResp {
  id: number;
  title: string;
  cover_img_url?: string;
  content: string;
  short_content?: string;
  user_id: number;
  status: number;
  comment_status: number;
  read_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_liked?: boolean;
  is_recommended: boolean;
  music_url?: string;
  music_name?: string;
  category?: ArticleRelationResp;
  tags?: ArticleRelationResp[];
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: 在 `packages/api/src/index.ts` 添加导出**

找到现有的 article 类型导出块：
```typescript
export type {
  ArticleRelationResp,
  ArticleListReq,
  ArticleListItemResp,
  ArticleLikeResp,
  ArticlePageResp,
} from "./types/article";
```

替换为：
```typescript
export type {
  ArticleRelationResp,
  ArticleListReq,
  ArticleListItemResp,
  ArticleLikeResp,
  ArticlePageResp,
  ArticleDetailResp,
} from "./types/article";
```

- [ ] **Step 3: 类型检查**

```bash
pnpm --filter @repo/api check-types
```

Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/types/article.ts packages/api/src/index.ts
git commit -m "feat(api): 新增 ArticleDetailResp 类型"
```

---

## Task 3: packages/api — client 方法扩展（getDetail / view）

**Files:**
- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/client.test.ts`

- [ ] **Step 1: 写失败测试**

在 `packages/api/src/client.test.ts` 最后一个 `it(...)` 之后，`describe` 闭合括号之前追加：

```typescript
  it("articles.getDetail 调用正确的端点", async () => {
    const detail = {
      id: 1, title: "Test", content: "# Hello",
      user_id: 1, status: 1, comment_status: 1,
      read_count: 0, like_count: 0, comment_count: 0,
      is_recommended: false,
      created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: detail }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.articles.getDetail(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles/1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.title).toBe("Test");
  });

  it("articles.view 调用正确的端点", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: null }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.articles.view(42);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles/42/view",
      expect.objectContaining({ method: "POST" }),
    );
  });
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/api test
```

Expected: FAIL — `client.articles.getDetail is not a function`

- [ ] **Step 3: 修改 `packages/api/src/client.ts`**

① 顶部 import 改为：
```typescript
import type { ArticleDetailResp, ArticleLikeResp, ArticleListReq, ArticlePageResp } from "./types/article";
```

② 在 `articles` 对象中，`toggleLike` 方法之后追加：
```typescript
      /** 获取文章详情（公开接口，携带可选登录态以返回 is_liked） */
      getDetail: (id: number) =>
        fetchOptionalAuth<ArticleDetailResp>(`/articles/${id}`, { method: "GET" }),
      /** 上报一次文章阅读（触发即可，不等待返回值） */
      view: (id: number) =>
        fetchPublic<void>(`/articles/${id}/view`, { method: "POST" }),
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/api test
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): 新增 articles.getDetail / articles.view 方法"
```

---

## Task 4: apps/web — Markdown 工具函数

**Files:**
- Create: `apps/web/lib/markdown.ts`

- [ ] **Step 1: 创建 `apps/web/lib/markdown.ts`**

```typescript
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

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        // 允许 rehype-slug 注入的 id 属性通过 sanitize
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

/** 从 rehype-slug 渲染后的 HTML 中提取 h2/h3 标题，id 与渲染结果完全对应 */
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

- [ ] **Step 2: 类型检查**

```bash
pnpm --filter apps/web check-types
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/markdown.ts
git commit -m "feat(web): 新增 Markdown→HTML 转换工具和 TOC 提取函数"
```

---

## Task 5: Hook — useScrollProgress

**Files:**
- Create: `apps/web/hooks/use-scroll-progress.ts`
- Create: `apps/web/hooks/use-scroll-progress.test.ts`

- [ ] **Step 1: 写失败测试**

Create `apps/web/hooks/use-scroll-progress.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { useScrollProgress } from "./use-scroll-progress";

describe("useScrollProgress", () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true, value: 1000,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true, value: 200,
    });
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  });

  it("初始值为 0", () => {
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(0);
  });

  it("滚动到一半时返回约 0.5", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 400, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeCloseTo(0.5, 1);
  });

  it("值始终在 0~1 之间", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 99999, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBeLessThanOrEqual(1);
    expect(result.current).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- hooks/use-scroll-progress
```

Expected: FAIL

- [ ] **Step 3: 实现 Hook**

Create `apps/web/hooks/use-scroll-progress.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollable <= 0) { setProgress(0); return; }
      setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return progress;
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- hooks/use-scroll-progress
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-scroll-progress.ts apps/web/hooks/use-scroll-progress.test.ts
git commit -m "feat(web): 新增 useScrollProgress hook"
```

---

## Task 6: Hook — useActiveHeading

**Files:**
- Create: `apps/web/hooks/use-active-heading.ts`
- Create: `apps/web/hooks/use-active-heading.test.ts`

- [ ] **Step 1: 写失败测试**

Create `apps/web/hooks/use-active-heading.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import { useActiveHeading } from "./use-active-heading";

describe("useActiveHeading", () => {
  it("空列表时返回 null", () => {
    const { result } = renderHook(() => useActiveHeading([]));
    expect(result.current).toBeNull();
  });

  it("有 ids 时初始值为第一个 id", () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2><h2 id="detail">Detail</h2>`;
    const { result } = renderHook(() => useActiveHeading(["intro", "detail"]));
    // jsdom 中 IntersectionObserver 不触发，初始值为第一个
    expect(result.current).toBe("intro");
  });

  it("ids 为空数组时始终返回 null", () => {
    const { result } = renderHook(() => useActiveHeading([]));
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- hooks/use-active-heading
```

Expected: FAIL

- [ ] **Step 3: 实现 Hook**

Create `apps/web/hooks/use-active-heading.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

export function useActiveHeading(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) { setActiveId(null); return; }
    setActiveId(ids[0]);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- hooks/use-active-heading
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-active-heading.ts apps/web/hooks/use-active-heading.test.ts
git commit -m "feat(web): 新增 useActiveHeading hook（TOC 实时追踪）"
```

---

## Task 7: Route Handler — POST /api/articles/[id]/view

**Files:**
- Create: `apps/web/app/api/articles/[id]/view/route.ts`
- Create: `apps/web/app/api/articles/[id]/view/route.test.ts`

- [ ] **Step 1: 写失败测试**

Create `apps/web/app/api/articles/[id]/view/route.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mockView = vi.fn();

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: { view: mockView },
  }),
}));

describe("POST /api/articles/[id]/view", () => {
  beforeEach(() => vi.clearAllMocks());

  it("上报阅读并返回 204", async () => {
    mockView.mockResolvedValueOnce(undefined);
    const req = new NextRequest("http://localhost/api/articles/5/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    expect(mockView).toHaveBeenCalledWith(5);
    expect(res.status).toBe(204);
  });

  it("非法 id 返回 400", async () => {
    const req = new NextRequest("http://localhost/api/articles/abc/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
    expect(mockView).not.toHaveBeenCalled();
  });

  it("后端异常返回 500", async () => {
    mockView.mockRejectedValueOnce(new Error("network error"));
    const req = new NextRequest("http://localhost/api/articles/5/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- "api/articles"
```

Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: 实现 Route Handler**

Create `apps/web/app/api/articles/[id]/view/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const api = await createServerApiClient();
    await api.articles.view(articleId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- "api/articles"
```

Expected: All PASS（含原有 like 路由测试）

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/api/articles/[id]/view/"
git commit -m "feat(web): 新增 POST /api/articles/[id]/view 阅读上报接口"
```

---

## Task 8: 组件 — ArticleHero

**Files:**
- Create: `apps/web/components/article-detail/article-hero.tsx`
- Create: `apps/web/components/article-detail/article-hero.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `apps/web/components/article-detail/article-hero.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { ArticleHero } from "./article-hero";
import type { ArticleDetailResp } from "@repo/api";

const base: ArticleDetailResp = {
  id: 1, title: "Rust Web 框架", content: "# Hello",
  user_id: 1, status: 1, comment_status: 1,
  read_count: 1234, like_count: 88, comment_count: 12,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z",
};

describe("ArticleHero", () => {
  it("渲染文章标题", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByRole("heading", { name: "Rust Web 框架" })).toBeInTheDocument();
  });

  it("显示阅读数和点赞数", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.getByText(/88/)).toBeInTheDocument();
  });

  it("无封面图时渲染占位背景", () => {
    const { container } = render(<ArticleHero article={base} />);
    expect((container.firstChild as HTMLElement).className).toMatch(/from-muted/);
  });

  it("有封面图时渲染 img", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("img.jpg"));
  });

  it("显示分类标签", () => {
    render(<ArticleHero article={{ ...base, category: { id: 1, name: "Technology" } }} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/article-hero
```

Expected: FAIL

- [ ] **Step 3: 实现组件**

Create `apps/web/components/article-detail/article-hero.tsx`:

```tsx
import Image from "next/image";
import type { ArticleDetailResp } from "@repo/api";

interface ArticleHeroProps {
  article: ArticleDetailResp;
}

function estimateReadingMinutes(content: string): number {
  const len = content.replace(/[^\w一-龥]/g, "").length;
  return Math.max(1, Math.ceil(len / 300));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

export function ArticleHero({ article }: ArticleHeroProps) {
  const readingMin = estimateReadingMinutes(article.content);

  return (
    <div
      className={`relative w-full h-[380px] md:h-[480px] overflow-hidden${
        !article.cover_img_url ? " bg-gradient-to-br from-muted to-muted/60" : ""
      }`}
    >
      {article.cover_img_url && (
        <Image
          src={article.cover_img_url}
          alt={article.title}
          fill
          className="object-cover object-center"
          priority
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-5">
        <div className="mx-auto max-w-[720px] pb-8">
          {article.category && (
            <span className="mb-3 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              {article.category.name}
            </span>
          )}
          <h1 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
            {article.title}
          </h1>
          <p className="mb-2 text-sm text-white/60">
            {formatDate(article.created_at)} · {readingMin} 分钟阅读
          </p>
          <div className="flex gap-4 text-sm text-white/50">
            <span>{article.read_count.toLocaleString()} 阅读</span>
            <span>{article.like_count} 点赞</span>
            <span>{article.comment_count} 评论</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/article-hero
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/article-detail/
git commit -m "feat(web): 新增 ArticleHero 组件"
```

---

## Task 9: 组件 — ArticleContent

**Files:**
- Create: `apps/web/components/article-detail/article-content.tsx`
- Create: `apps/web/components/article-detail/article-content.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `apps/web/components/article-detail/article-content.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { ArticleContent } from "./article-content";

describe("ArticleContent", () => {
  it("渲染 HTML 内容", () => {
    render(<ArticleContent contentHtml="<p>Hello <strong>World</strong></p>" />);
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("包含阅读进度条", () => {
    const { container } = render(<ArticleContent contentHtml="<p>test</p>" />);
    expect(container.querySelector("[data-testid='reading-progress']")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/article-content
```

Expected: FAIL

- [ ] **Step 3: 实现组件**

Create `apps/web/components/article-detail/article-content.tsx`:

```tsx
"use client";

import { useScrollProgress } from "@/hooks/use-scroll-progress";

interface ArticleContentProps {
  contentHtml: string;
}

export function ArticleContent({ contentHtml }: ArticleContentProps) {
  const progress = useScrollProgress();

  return (
    <>
      <div
        data-testid="reading-progress"
        className="fixed left-0 top-0 z-50 h-[2px] bg-primary transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
      <article
        className="prose prose-neutral mx-auto max-w-[720px] px-5 py-10 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/article-content
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/article-detail/article-content.tsx apps/web/components/article-detail/article-content.test.tsx
git commit -m "feat(web): 新增 ArticleContent 组件（Markdown 渲染 + 进度条）"
```

---

## Task 10: 组件 — ArticleToc

**Files:**
- Create: `apps/web/components/article-detail/article-toc.tsx`
- Create: `apps/web/components/article-detail/article-toc.test.tsx`

说明：组件接受 `variant?: "mobile" | "desktop"` prop。省略时两者都渲染（CSS 分别控制显隐）；页面中分别传入 `"mobile"` 和 `"desktop"` 以精确控制。

- [ ] **Step 1: 写失败测试**

Create `apps/web/components/article-detail/article-toc.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleToc } from "./article-toc";
import type { TocItem } from "@/lib/markdown";

const items: TocItem[] = [
  { id: "intro", text: "介绍", level: 2 },
  { id: "detail", text: "详细说明", level: 2 },
  { id: "sub", text: "子章节", level: 3 },
];

describe("ArticleToc", () => {
  it("渲染所有章节标题", () => {
    render(<ArticleToc items={items} variant="mobile" />);
    expect(screen.getByText("介绍")).toBeInTheDocument();
    expect(screen.getByText("详细说明")).toBeInTheDocument();
    expect(screen.getByText("子章节")).toBeInTheDocument();
  });

  it("少于 2 个标题时返回 null", () => {
    const { container } = render(<ArticleToc items={[items[0]]} variant="mobile" />);
    expect(container.firstChild).toBeNull();
  });

  it("点击章节触发 scrollIntoView", async () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2>`;
    const scrollIntoView = vi.fn();
    document.getElementById("intro")!.scrollIntoView = scrollIntoView;

    render(<ArticleToc items={items} variant="mobile" />);
    await userEvent.click(screen.getByText("介绍"));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("variant=desktop 渲染 nav 元素", () => {
    render(<ArticleToc items={items} variant="desktop" />);
    expect(screen.getByRole("navigation", { name: "文章目录" })).toBeInTheDocument();
  });

  it("variant=mobile 渲染 details 折叠元素", () => {
    const { container } = render(<ArticleToc items={items} variant="mobile" />);
    expect(container.querySelector("details")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/article-toc
```

Expected: FAIL

- [ ] **Step 3: 实现组件**

Create `apps/web/components/article-detail/article-toc.tsx`:

```tsx
"use client";

import { useActiveHeading } from "@/hooks/use-active-heading";
import type { TocItem } from "@/lib/markdown";

interface ArticleTocProps {
  items: TocItem[];
  variant?: "mobile" | "desktop";
}

export function ArticleToc({ items, variant }: ArticleTocProps) {
  const ids = items.map((i) => i.id);
  const activeId = useActiveHeading(ids);

  if (items.length < 2) return null;

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const list = (
    <ul className="space-y-0.5 text-sm">
      {items.map((item) => (
        <li key={item.id} style={{ paddingLeft: item.level === 3 ? "12px" : "0" }}>
          <button
            onClick={() => handleClick(item.id)}
            className={`w-full rounded px-2 py-1 text-left transition-colors hover:text-primary ${
              activeId === item.id
                ? "font-semibold text-primary"
                : "text-muted-foreground"
            }`}
          >
            {item.text}
          </button>
        </li>
      ))}
    </ul>
  );

  const showDesktop = !variant || variant === "desktop";
  const showMobile = !variant || variant === "mobile";

  return (
    <>
      {showDesktop && (
        <nav
          aria-label="文章目录"
          className="sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto rounded-lg border border-border bg-card p-4"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            目录
          </p>
          {list}
        </nav>
      )}
      {showMobile && (
        <details className="mb-6 rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
            目录
          </summary>
          <div className="px-4 pb-4 pt-2">{list}</div>
        </details>
      )}
    </>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/article-toc
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/article-detail/article-toc.tsx apps/web/components/article-detail/article-toc.test.tsx
git commit -m "feat(web): 新增 ArticleToc 组件（mobile 折叠 / desktop sticky）"
```

---

## Task 11: 组件 — MusicPlayer

**Files:**
- Create: `apps/web/components/article-detail/music-player.tsx`
- Create: `apps/web/components/article-detail/music-player.test.tsx`

- [ ] **Step 1: 检查 music 图标是否存在**

```bash
ls packages/icons/svg/ | grep -i music
```

若不存在，创建：

```bash
cat > packages/icons/svg/music.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
EOF
pnpm --filter @repo/icons build
```

- [ ] **Step 2: 写失败测试**

Create `apps/web/components/article-detail/music-player.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicPlayer } from "./music-player";

describe("MusicPlayer", () => {
  it("无 url 时不渲染任何内容", () => {
    const { container } = render(<MusicPlayer url={undefined} name={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("有 url 时渲染音乐图标按钮", () => {
    render(<MusicPlayer url="https://example.com/music.mp3" name="雨の音" />);
    expect(screen.getByRole("button", { name: /音乐播放器/ })).toBeInTheDocument();
  });

  it("点击按钮展开播放器，显示曲名", async () => {
    render(<MusicPlayer url="https://example.com/music.mp3" name="雨の音" />);
    await userEvent.click(screen.getByRole("button", { name: /音乐播放器/ }));
    expect(screen.getByText("雨の音")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/music-player
```

Expected: FAIL

- [ ] **Step 4: 实现组件**

Create `apps/web/components/article-detail/music-player.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { SvgIcon } from "@repo/icons";

interface MusicPlayerProps {
  url?: string;
  name?: string;
}

export function MusicPlayer({ url, name }: MusicPlayerProps) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (!url) return null;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { void audio.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress(audio.currentTime / audio.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.currentTime = v * audio.duration;
    setProgress(v);
  };

  return (
    <div className="relative">
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 w-56 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 truncate text-xs font-semibold text-foreground">{name ?? "背景音乐"}</p>
          <input
            type="range" min={0} max={1} step={0.01} value={progress}
            onChange={handleSeek}
            className="mb-2 w-full accent-primary"
          />
          <button
            onClick={togglePlay}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-primary/10 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            {playing ? "暂停" : "播放"}
          </button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef} src={url} loop
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
          />
        </div>
      )}
      <button
        aria-label={open ? "关闭音乐播放器" : "音乐播放器"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted"
      >
        <SvgIcon name="music" className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/music-player
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/article-detail/music-player.tsx apps/web/components/article-detail/music-player.test.tsx
# 如果新建了图标：
git add packages/icons/svg/music.svg packages/icons/src/
git commit -m "feat(web): 新增 MusicPlayer 组件"
```

---

## Task 12: 组件 — ArticleFloatActions（含阅读上报）

**Files:**
- Create: `apps/web/components/article-detail/article-float-actions.tsx`
- Create: `apps/web/components/article-detail/article-float-actions.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `apps/web/components/article-detail/article-float-actions.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatActions } from "./article-float-actions";

const mockOpenLoginModal = vi.fn();
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: null }),
}));
vi.mock("./music-player", () => ({
  MusicPlayer: () => <div data-testid="music-player" />,
}));

const defaultProps = {
  articleId: 1,
  initialLikeCount: 10,
  initialIsLiked: false,
  musicUrl: undefined,
  musicName: undefined,
};

describe("ArticleFloatActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染点赞和回顶按钮", () => {
    render(<ArticleFloatActions {...defaultProps} />);
    expect(screen.getByRole("button", { name: /点赞/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /回到顶部/ })).toBeInTheDocument();
  });

  it("未登录点赞时触发登录 Modal", async () => {
    render(<ArticleFloatActions {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(mockOpenLoginModal).toHaveBeenCalled();
  });

  it("渲染 MusicPlayer 子组件", () => {
    render(<ArticleFloatActions {...defaultProps} musicUrl="https://x.com/a.mp3" />);
    expect(screen.getByTestId("music-player")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/article-float-actions
```

Expected: FAIL

- [ ] **Step 3: 实现组件**

Create `apps/web/components/article-detail/article-float-actions.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import type { ArticleLikeResp } from "@repo/api";
import { MusicPlayer } from "./music-player";

interface ArticleFloatActionsProps {
  articleId: number;
  initialLikeCount: number;
  initialIsLiked: boolean;
  musicUrl?: string;
  musicName?: string;
}

export function ArticleFloatActions({
  articleId,
  initialLikeCount,
  initialIsLiked,
  musicUrl,
  musicName,
}: ArticleFloatActionsProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 进入页面后上报一次阅读（fire-and-forget）
  useEffect(() => {
    void fetch(`/api/articles/${articleId}/view`, { method: "POST" });
  }, [articleId]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLike = useCallback(async () => {
    if (!userId) { openLoginModal(); return; }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/like`, { method: "POST" });
      if (res.status === 401) { openLoginModal(); return; }
      if (!res.ok) throw new Error("failed");
      const data: ArticleLikeResp = await res.json();
      setIsLiked(data.is_liked);
      setLikeCount(data.like_count);
    } catch {
      addToast("点赞失败，请稍后重试", "error");
    } finally {
      setIsLiking(false);
    }
  }, [articleId, isLiking, openLoginModal, userId]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      <MusicPlayer url={musicUrl} name={musicName} />

      <button
        aria-label={isLiked ? "取消点赞" : "点赞"}
        onClick={handleLike}
        disabled={isLiking}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors ${
          isLiked
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "border border-border bg-card text-muted-foreground hover:bg-muted"
        }`}
      >
        <span aria-hidden className="text-base">{isLiked ? "♥" : "♡"}</span>
      </button>

      <button
        aria-label="回到顶部"
        onClick={scrollToTop}
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-md transition-opacity hover:bg-muted ${
          showScrollTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span aria-hidden className="text-sm font-bold">↑</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/article-float-actions
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/article-detail/article-float-actions.tsx apps/web/components/article-detail/article-float-actions.test.tsx
git commit -m "feat(web): 新增 ArticleFloatActions 组件（点赞/音乐/回顶/阅读上报）"
```

---

## Task 13: 组件 — ArticleComments + Barrel Export

**Files:**
- Create: `apps/web/components/article-detail/article-comments.tsx`
- Create: `apps/web/components/article-detail/article-comments.test.tsx`
- Create: `apps/web/components/article-detail/index.ts`

- [ ] **Step 1: 写失败测试**

Create `apps/web/components/article-detail/article-comments.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { ArticleComments } from "./article-comments";

vi.mock("@/components/comments", () => ({
  CommentSection: ({ targetId, targetType }: { targetId: number; targetType: string }) => (
    <div
      data-testid="comment-section"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    />
  ),
}));

describe("ArticleComments", () => {
  it("渲染评论标题和计数", () => {
    render(<ArticleComments articleId={42} commentCount={7} />);
    expect(screen.getByText(/评论/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it("向 CommentSection 传入正确的 targetId 和 targetType", () => {
    render(<ArticleComments articleId={42} commentCount={7} />);
    const section = screen.getByTestId("comment-section");
    expect(section).toHaveAttribute("data-target-id", "42");
    expect(section).toHaveAttribute("data-target-type", "article");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- components/article-detail/article-comments
```

Expected: FAIL

- [ ] **Step 3: 实现 ArticleComments**

Create `apps/web/components/article-detail/article-comments.tsx`:

```tsx
"use client";

import { CommentSection } from "@/components/comments";

interface ArticleCommentsProps {
  articleId: number;
  commentCount: number;
}

export function ArticleComments({ articleId, commentCount }: ArticleCommentsProps) {
  return (
    <section className="mx-auto max-w-[720px] border-t border-border px-5 pb-20 pt-10">
      <h2 className="mb-6 text-lg font-bold text-foreground">
        评论{" "}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
      </h2>
      <div className="flex flex-col">
        <CommentSection targetType="article" targetId={articleId} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 创建 barrel export**

Create `apps/web/components/article-detail/index.ts`:

```typescript
export { ArticleHero } from "./article-hero";
export { ArticleContent } from "./article-content";
export { ArticleToc } from "./article-toc";
export { ArticleFloatActions } from "./article-float-actions";
export { ArticleComments } from "./article-comments";
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- components/article-detail/article-comments
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/article-detail/article-comments.tsx apps/web/components/article-detail/article-comments.test.tsx apps/web/components/article-detail/index.ts
git commit -m "feat(web): 新增 ArticleComments wrapper 和 barrel export"
```

---

## Task 14: 页面 — app/articles/[id]/page.tsx

**Files:**
- Create: `apps/web/app/articles/[id]/page.tsx`
- Create: `apps/web/app/articles/[id]/page.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `apps/web/app/articles/[id]/page.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import ArticleDetailPage from "./page";
import type { ArticleDetailResp } from "@repo/api";

const mockArticle: ArticleDetailResp = {
  id: 1, title: "Rust Web 框架实战",
  content: "## 介绍\n\n正文。\n\n## 实现\n\n代码。",
  user_id: 1, status: 1, comment_status: 1,
  read_count: 100, like_count: 20, comment_count: 5,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z",
};

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: { getDetail: async () => mockArticle },
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

vi.mock("@/components/article-detail", () => ({
  ArticleHero: ({ article }: { article: ArticleDetailResp }) => <h1>{article.title}</h1>,
  ArticleContent: ({ contentHtml }: { contentHtml: string }) => (
    <div data-testid="content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
  ),
  ArticleToc: () => <nav aria-label="文章目录" />,
  ArticleFloatActions: () => <div data-testid="float-actions" />,
  ArticleComments: () => <section data-testid="comments" />,
}));

describe("ArticleDetailPage", () => {
  it("渲染文章标题", async () => {
    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);
    expect(screen.getByText("Rust Web 框架实战")).toBeInTheDocument();
  });

  it("渲染正文和评论区", async () => {
    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByTestId("comments")).toBeInTheDocument();
  });

  it("渲染浮动操作区", async () => {
    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);
    expect(screen.getByTestId("float-actions")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test -- "app/articles"
```

Expected: FAIL

- [ ] **Step 3: 实现页面**

Create `apps/web/app/articles/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { markdownToHtml, extractTocFromHtml } from "@/lib/markdown";
import {
  ArticleHero,
  ArticleContent,
  ArticleToc,
  ArticleFloatActions,
  ArticleComments,
} from "@/components/article-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const api = await createServerApiClient();
    const article = await api.articles.getDetail(Number(id));
    return {
      title: `${article.title} | Yevpt's Blog`,
      description: article.short_content ?? article.title,
    };
  } catch {
    return { title: "文章 | Yevpt's Blog" };
  }
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) notFound();

  const api = await createServerApiClient();
  let article;
  try {
    article = await api.articles.getDetail(articleId);
  } catch {
    notFound();
  }

  const contentHtml = await markdownToHtml(article.content);
  const tocItems = extractTocFromHtml(contentHtml);

  return (
    <>
      <ArticleHero article={article} />

      <div className="mx-auto max-w-[1100px] px-5 py-8">
        {/* 正文 + 右侧 sticky TOC 双列（mobile 单列，xl+ 双列） */}
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_200px]">
          <div className="min-w-0">
            {/* mobile 折叠手风琴（xl 以上自行隐藏）*/}
            <ArticleToc items={tocItems} variant="mobile" />
            <ArticleContent contentHtml={contentHtml} />
            <ArticleComments articleId={article.id} commentCount={article.comment_count} />
          </div>
          {/* desktop sticky TOC（mobile 自行隐藏）*/}
          <aside className="hidden xl:block">
            <ArticleToc items={tocItems} variant="desktop" />
          </aside>
        </div>
      </div>

      <ArticleFloatActions
        articleId={article.id}
        initialLikeCount={article.like_count}
        initialIsLiked={article.is_liked ?? false}
        musicUrl={article.music_url}
        musicName={article.music_name}
      />
    </>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test -- "app/articles"
```

Expected: PASS

- [ ] **Step 5: 全量测试**

```bash
pnpm --filter apps/web test
```

Expected: All PASS（无回归）

- [ ] **Step 6: 全量类型检查**

```bash
pnpm -r check-types
```

Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/articles/"
git commit -m "feat(web): 实现文章详情页 /articles/[id]"
```
