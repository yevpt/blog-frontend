# Article Hero × Navbar Fusion 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在文章详情页封面顶部叠加 `backdrop-filter` 色晕层，令封面图颜色自然向上延伸至导航栏区域，消除"悬浮割裂感"，同时保证导航栏在封面完全可见期间保持透明。

**Architecture:** `SiteNavbar` 的哨兵高度改由 CSS 自定义属性 `--nav-sentinel-height`（默认 60px）控制；`ArticleHero` 新增 `backdrop-filter` 色晕覆盖层，并渲染一个 null-render Client Component `HeroSentinelSetter`，在 mount/unmount 时写入/清除该 CSS 变量，使封面可见期间 navbar 始终保持透明；封面图像素由浏览器自动采样，无需任何颜色提取。

**Tech Stack:** Next.js App Router（Server + Client Components）、Tailwind CSS、Vitest + @testing-library/react

---

## 文件结构

| 文件 | 类型 | 说明 |
|------|------|------|
| `apps/web/components/navbar/site-navbar.tsx` | 修改 | 哨兵 div：`h-[60px]` → `style={{ height: 'var(--nav-sentinel-height, 60px)' }}` |
| `apps/web/components/navbar/site-navbar.test.tsx` | 修改 | 新增：哨兵高度读取 CSS var |
| `apps/web/components/article-detail/hero-sentinel-setter.tsx` | 新建 | null-render `'use client'`，mount 时写 CSS var，unmount 时清除 |
| `apps/web/components/article-detail/hero-sentinel-setter.test.tsx` | 新建 | mount/unmount 行为测试 |
| `apps/web/components/article-detail/article-hero.tsx` | 修改 | 拆分为双层渐变 + 渲染 `HeroSentinelSetter` |
| `apps/web/components/article-detail/article-hero.test.tsx` | 修改 | 更新渐变层测试，验证有/无封面行为 |
| `apps/web/components/article-detail/index.ts` | 修改 | barrel export 加入 `HeroSentinelSetter` |

---

## Task 1：SiteNavbar 哨兵高度改为 CSS var

**Files:**
- Modify: `apps/web/components/navbar/site-navbar.tsx:77-80`
- Modify: `apps/web/components/navbar/site-navbar.test.tsx`

### 背景

`SiteNavbar` 使用 IntersectionObserver 监听一个 60px 高的哨兵 div，哨兵离开视口时触发玻璃态。当前高度硬编码为 Tailwind `h-[60px]`。改为读取 CSS 变量 `--nav-sentinel-height`（默认 60px），以便文章页将其动态设为封面高度。

- [ ] **Step 1：写失败测试**

在 `apps/web/components/navbar/site-navbar.test.tsx` 中找到最后一个 `it(...)` 之后，添加：

```typescript
it("哨兵 div 高度读取 CSS 变量 --nav-sentinel-height，未设置时回退 60px", () => {
  render(<SiteNavbar />);
  // aria-hidden 且 pointer-events-none 的第一个 div 即为哨兵
  const sentinel = document.querySelector('div[aria-hidden="true"]') as HTMLElement;
  expect(sentinel).toBeTruthy();
  expect(sentinel.style.height).toBe("var(--nav-sentinel-height, 60px)");
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
pnpm --filter web test -- components/navbar/site-navbar.test.tsx
```

期望：新增测试 FAIL（sentinel 的 style.height 为空，因为当前用 Tailwind class）。

- [ ] **Step 3：修改哨兵 div**

打开 `apps/web/components/navbar/site-navbar.tsx`，找到：

```tsx
<div
  ref={sentinelRef}
  aria-hidden
  className="pointer-events-none absolute left-0 top-0 h-[60px] w-px"
/>
```

替换为：

```tsx
<div
  ref={sentinelRef}
  aria-hidden
  className="pointer-events-none absolute left-0 top-0 w-px"
  style={{ height: "var(--nav-sentinel-height, 60px)" }}
/>
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
pnpm --filter web test -- components/navbar/site-navbar.test.tsx
```

期望：所有测试 PASS（原有行为不变，新测试通过）。

- [ ] **Step 5：Commit**

```bash
git add apps/web/components/navbar/site-navbar.tsx apps/web/components/navbar/site-navbar.test.tsx
git commit -m "feat(web): SiteNavbar 哨兵高度改为读取 CSS var --nav-sentinel-height"
```

---

## Task 2：新建 HeroSentinelSetter 客户端组件

**Files:**
- Create: `apps/web/components/article-detail/hero-sentinel-setter.tsx`
- Create: `apps/web/components/article-detail/hero-sentinel-setter.test.tsx`
- Modify: `apps/web/components/article-detail/index.ts`

### 背景

`HeroSentinelSetter` 是一个 null-render Client Component，mount 时读取窗口宽度设置 `--nav-sentinel-height`（`≥768px` → `480px`，否则 → `380px`），unmount 时清除。这让 `ArticleHero` 主体保持 Server Component。

- [ ] **Step 1：写失败测试**

新建 `apps/web/components/article-detail/hero-sentinel-setter.test.tsx`：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { HeroSentinelSetter } from "./hero-sentinel-setter";

describe("HeroSentinelSetter", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--nav-sentinel-height");
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--nav-sentinel-height");
  });

  it("mount 时在宽屏下设置 --nav-sentinel-height 为 desktopH", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
    render(<HeroSentinelSetter mobileH={380} desktopH={480} />);
    expect(
      document.documentElement.style.getPropertyValue("--nav-sentinel-height"),
    ).toBe("480px");
  });

  it("mount 时在窄屏下设置 --nav-sentinel-height 为 mobileH", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    render(<HeroSentinelSetter mobileH={380} desktopH={480} />);
    expect(
      document.documentElement.style.getPropertyValue("--nav-sentinel-height"),
    ).toBe("380px");
  });

  it("unmount 时清除 --nav-sentinel-height", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
    const { unmount } = render(<HeroSentinelSetter mobileH={380} desktopH={480} />);
    unmount();
    expect(
      document.documentElement.style.getPropertyValue("--nav-sentinel-height"),
    ).toBe("");
  });

  it("不渲染任何 DOM 元素", () => {
    const { container } = render(<HeroSentinelSetter mobileH={380} desktopH={480} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
pnpm --filter web test -- components/article-detail/hero-sentinel-setter.test.tsx
```

期望：FAIL（文件不存在）。

- [ ] **Step 3：创建 HeroSentinelSetter**

新建 `apps/web/components/article-detail/hero-sentinel-setter.tsx`：

```tsx
"use client";

import { useEffect } from "react";

interface HeroSentinelSetterProps {
  mobileH: number;
  desktopH: number;
}

export function HeroSentinelSetter({ mobileH, desktopH }: HeroSentinelSetterProps) {
  useEffect(() => {
    const h = window.innerWidth >= 768 ? desktopH : mobileH;
    document.documentElement.style.setProperty("--nav-sentinel-height", `${h}px`);
    return () => {
      document.documentElement.style.removeProperty("--nav-sentinel-height");
    };
  }, [mobileH, desktopH]);
  return null;
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
pnpm --filter web test -- components/article-detail/hero-sentinel-setter.test.tsx
```

期望：4 个测试全部 PASS。

- [ ] **Step 5：更新 barrel export**

打开 `apps/web/components/article-detail/index.ts`，在末尾添加一行：

```typescript
export { HeroSentinelSetter } from "./hero-sentinel-setter";
```

- [ ] **Step 6：Commit**

```bash
git add apps/web/components/article-detail/hero-sentinel-setter.tsx \
        apps/web/components/article-detail/hero-sentinel-setter.test.tsx \
        apps/web/components/article-detail/index.ts
git commit -m "feat(web): 新增 HeroSentinelSetter，动态设置导航哨兵高度"
```

---

## Task 3：ArticleHero 双层渐变重构 + 集成 HeroSentinelSetter

**Files:**
- Modify: `apps/web/components/article-detail/article-hero.tsx`
- Modify: `apps/web/components/article-detail/article-hero.test.tsx`

### 背景

将当前单层渐变遮罩拆为两层：
1. **顶部色晕层**（新增）：有封面图时，用 `backdrop-filter: blur(24px) saturate(200%)` + `mask-image` 渐变，令封面顶部像素柔和向上延伸；无封面图时用降级半透明遮罩。
2. **底部压暗层**（保留）：保持现有 `linear-gradient(to top, rgba(0,0,0,0.82)...)` 不变，确保标题可读。

同时在 JSX 末尾渲染 `<HeroSentinelSetter mobileH={380} desktopH={480} />`，使封面可见期间导航保持透明。

- [ ] **Step 1：更新测试，先运行确认当前状态**

打开 `apps/web/components/article-detail/article-hero.test.tsx`，**替换** 现有 `"无封面图时渲染占位背景"` 和 `"有封面图时渲染 img"` 两个测试，并**新增**三个测试。完整 describe 块替换为：

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleHero } from "./article-hero";
import type { ArticleDetailResp } from "@repo/api";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    _fill?: boolean;
    className?: string;
    _priority?: boolean;
  }) => <img src={src} alt={alt} className={className} />,
}));

// HeroSentinelSetter 是 Client Component，在测试中 mock 掉，避免 window.innerWidth 副作用
vi.mock("./hero-sentinel-setter", () => ({
  HeroSentinelSetter: () => null,
}));

const base: ArticleDetailResp = {
  id: 1,
  title: "Rust Web 框架",
  content: "# Hello",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 1234,
  like_count: 88,
  comment_count: 12,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
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

  it("无封面图时容器有占位背景渐变类名", () => {
    const { container } = render(<ArticleHero article={base} />);
    expect((container.firstChild as HTMLElement).className).toMatch(/from-muted/);
  });

  it("无封面图时渲染顶部降级遮罩（不含 backdropFilter）", () => {
    const { container } = render(<ArticleHero article={base} />);
    const overlays = container.querySelectorAll<HTMLElement>("div[style]");
    const hasBackdrop = Array.from(overlays).some(
      (el) => el.style.backdropFilter || el.style.webkitBackdropFilter,
    );
    expect(hasBackdrop).toBe(false);
    // 顶部降级遮罩应包含 rgba(0,0,0,0.45)
    const hasFallback = Array.from(overlays).some((el) =>
      el.style.background?.includes("rgba(0,0,0,0.45)"),
    );
    expect(hasFallback).toBe(true);
  });

  it("有封面图时渲染 img", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("img.jpg"));
  });

  it("有封面图时渲染 backdrop-filter 色晕层", () => {
    const { container } = render(
      <ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />,
    );
    const overlays = container.querySelectorAll<HTMLElement>("div[style]");
    const hasBackdrop = Array.from(overlays).some(
      (el) =>
        el.style.backdropFilter?.includes("blur") ||
        el.style.webkitBackdropFilter?.includes("blur"),
    );
    expect(hasBackdrop).toBe(true);
  });

  it("底部压暗层始终渲染（保证标题可读）", () => {
    const { container } = render(<ArticleHero article={base} />);
    const overlays = container.querySelectorAll<HTMLElement>("div[style]");
    const hasDarkGradient = Array.from(overlays).some((el) =>
      el.style.background?.includes("rgba(0,0,0,0.82)"),
    );
    expect(hasDarkGradient).toBe(true);
  });

  it("显示分类标签", () => {
    render(<ArticleHero article={{ ...base, category: { id: 1, name: "Technology" } }} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2：运行新测试，确认预期失败**

```bash
pnpm --filter web test -- components/article-detail/article-hero.test.tsx
```

期望：`"有封面图时渲染 backdrop-filter 色晕层"` 和 `"无封面图时渲染顶部降级遮罩"` 两个新测试 FAIL，其余通过。

- [ ] **Step 3：重构 ArticleHero**

用以下内容完整替换 `apps/web/components/article-detail/article-hero.tsx`：

```tsx
import Image from "next/image";
import type { ArticleDetailResp } from "@repo/api";
import { HeroSentinelSetter } from "./hero-sentinel-setter";

interface ArticleHeroProps {
  article: ArticleDetailResp;
}

function estimateReadingMinutes(content: string): number {
  const len = content.replace(/[^\w一-龥]/g, "").length;
  return Math.max(1, Math.ceil(len / 300));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

      {/* 顶部色晕层：有封面图时用 backdrop-filter 采样像素；无封面图时用降级遮罩 */}
      {article.cover_img_url ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backdropFilter: "blur(24px) saturate(200%)",
            WebkitBackdropFilter: "blur(24px) saturate(200%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 52%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 52%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 45%)",
          }}
        />
      )}

      {/* 底部压暗层：始终渲染，保证标题区域可读 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.10) 45%, transparent 60%)",
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

      <HeroSentinelSetter mobileH={380} desktopH={480} />
    </div>
  );
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
pnpm --filter web test -- components/article-detail/article-hero.test.tsx
```

期望：所有测试 PASS。

- [ ] **Step 5：运行全量测试，确认无回归**

```bash
pnpm --filter web test
```

期望：所有测试 PASS（包括 `site-navbar.test.tsx` 和新组件测试）。

- [ ] **Step 6：Commit**

```bash
git add apps/web/components/article-detail/article-hero.tsx \
        apps/web/components/article-detail/article-hero.test.tsx
git commit -m "feat(web): ArticleHero 新增 backdrop-filter 色晕层融合导航与封面"
```

---

## Task 4：视觉验证

**Files:** 无代码改动

- [ ] **Step 1：启动 dev server**

```bash
pnpm --filter web dev
```

- [ ] **Step 2：打开一篇有封面图的文章**

访问 `http://localhost:3000/articles/<有封面图的 id>`，在页面顶部检查：
1. 封面图顶部应有柔和色晕（图片主色模糊混入导航区域）
2. 导航栏文字在封面可见期间清晰可读
3. 向下滚动约 380-480px 后，导航进入玻璃态

- [ ] **Step 3：测试无封面图文章**

访问一篇无封面图的文章，确认：
1. 顶部出现 `rgba(0,0,0,0.45)` 降级遮罩（导航可读）
2. 底部压暗层正常，标题可读

- [ ] **Step 4：测试 dark mode**

切换 dark mode，确认封面与导航融合效果一致，导航进入玻璃态后样式正常。
