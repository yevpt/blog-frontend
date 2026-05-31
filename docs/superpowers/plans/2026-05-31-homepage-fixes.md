# Homepage Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复首页 7 个已知问题：导航栏不显示、按钮无 cursor-pointer、Tab 样式、搜索框图标、轮播图点击、国际化失效、碎语移至右侧单列。

**Architecture:** `packages/ui/src/button.tsx` 新增 `brand` variant + `cursor-pointer`；`LocaleProvider` 改为静态导入 zh.json 消除首屏 key 显示；`SiteNavbar` 移除 `mounted` 动画依赖确保始终可见；`FeaturedCarouselSlide` 给不活跃幻灯片加 `pointer-events-none` 修复点击穿透；`page.tsx` 重组布局将 `SnippetsSection` 迁至 aside。

**Tech Stack:** React 18, Next.js App Router, TypeScript, TailwindCSS, Vitest + @testing-library/react, pnpm workspaces monorepo

---

## 文件结构总览

| 操作 | 文件 |
|------|------|
| Modify | `packages/ui/src/button.tsx` |
| Create | `packages/ui/src/button.test.tsx` |
| Modify | `apps/web/app/providers/locale-provider.tsx` |
| Modify | `apps/web/app/providers/locale-provider.test.tsx` |
| Modify | `apps/web/components/navbar/site-navbar.tsx` |
| Modify | `apps/web/components/navbar/site-navbar.test.tsx` |
| Modify | `apps/web/components/featured/featured-carousel-slide.tsx` |
| Modify | `apps/web/components/articles/article-list-header.tsx` |
| Modify | `apps/web/components/articles/article-section.test.tsx` |
| Modify | `apps/web/components/snippets/snippets-section.tsx` |
| Modify | `apps/web/app/page.tsx` |

---

## Task 1: 修复 Button — 加 `cursor-pointer` + 新增 `brand` variant

**背景：** Button 组件基础类缺少 `cursor-pointer`，导致所有按钮 hover 时不显示手型光标。同时需要新增 `brand` variant 供 Tab 样式使用。

**Files:**
- Modify: `packages/ui/src/button.tsx`

- [ ] **Step 1: 修改 button.tsx**

将文件内容替换为以下（完整文件）：

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        brand: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);

Button.displayName = "Button";
```

- [ ] **Step 2: 运行类型检查确认无误**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/ui exec tsc --noEmit
```

Expected: 无错误输出。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/button.tsx
git commit -m "feat(ui): Button 新增 brand variant，基础类加 cursor-pointer"
```

---

## Task 2: 创建 button.test.tsx

**背景：** `packages/ui` 规范要求每个组件旁都有 `*.test.tsx`，当前缺失。

**Files:**
- Create: `packages/ui/src/button.test.tsx`

- [ ] **Step 1: 创建测试文件**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("渲染不崩溃", () => {
    render(<Button>点击</Button>);
    expect(screen.getByRole("button", { name: "点击" })).toBeTruthy();
  });

  it("所有 variant 均包含 cursor-pointer 类", () => {
    const variants = ["default", "brand", "outline", "ghost"] as const;
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>按钮</Button>);
      expect(container.querySelector("button")?.className).toContain("cursor-pointer");
      container.remove();
    }
  });

  it("default variant 包含 shadow 类", () => {
    const { container } = render(<Button variant="default">默认</Button>);
    expect(container.querySelector("button")?.className).toContain("shadow");
  });

  it("brand variant 不含 shadow，含 bg-primary", () => {
    const { container } = render(<Button variant="brand">品牌</Button>);
    const cls = container.querySelector("button")?.className ?? "";
    expect(cls).toContain("bg-primary");
    expect(cls).not.toContain(" shadow ");
  });

  it("outline variant 包含 border 类", () => {
    const { container } = render(<Button variant="outline">边框</Button>);
    expect(container.querySelector("button")?.className).toContain("border");
  });

  it("ghost variant 包含 hover:bg-accent", () => {
    const { container } = render(<Button variant="ghost">幽灵</Button>);
    expect(container.querySelector("button")?.className).toContain("hover:bg-accent");
  });

  it("size sm 包含 h-8 类", () => {
    const { container } = render(<Button size="sm">小</Button>);
    expect(container.querySelector("button")?.className).toContain("h-8");
  });

  it("onClick 回调被触发", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点我</Button>);
    await user.click(screen.getByRole("button", { name: "点我" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("disabled 时不触发 onClick", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>禁用</Button>);
    await user.click(screen.getByRole("button", { name: "禁用" }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("className 透传，rounded-full 覆盖 rounded-md（tailwind-merge）", () => {
    const { container } = render(<Button size="sm" className="rounded-full">圆</Button>);
    const cls = container.querySelector("button")?.className ?? "";
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("rounded-md");
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

```bash
pnpm --filter @repo/ui exec vitest run
```

Expected: 所有测试 PASS。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/button.test.tsx
git commit -m "test(ui): 新增 Button 组件测试文件"
```

---

## Task 3: 修复国际化 — LocaleProvider 同步加载 zh.json

**背景：** `LocaleProvider` 当前 `messages` 初始为 `null`，`t(key)` 在异步 JSON 加载完成前返回 key 本身（即 `"article.searchPlaceholder"`、`"sidebar.joinQQ"` 等原始 key 名显示在界面上）。修复方案：静态导入 `zh.json` 作为初始 messages，zh 语言用户首屏立即看到正确文字；en 仍走动态导入（少量用户且不影响 SSR 水合）。

**Files:**
- Modify: `apps/web/app/providers/locale-provider.tsx`

- [ ] **Step 1: 修改 locale-provider.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import zhMessages from "../../messages/zh.json";
import {
  LocaleContext,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "@repo/hooks/locale";

type Messages = Record<string, unknown>;

/** 从 localStorage 读取已持久化的 locale，默认 'zh' */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("locale");
  if (stored === "zh" || stored === "en") return stored;
  return "zh";
}

/** 动态加载对应语言的 messages JSON（locale 切换时调用） */
async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") {
    const mod = await import("../../messages/en.json");
    return mod.default as Messages;
  }
  const mod = await import("../../messages/zh.json");
  return mod.default as Messages;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // zh.json 静态导入作为初始值，zh 用户首屏无闪烁；en 用户初始为空对象，等待动态加载
  const [messages, setMessages] = useState<Messages>(() => {
    const initialLocale = getInitialLocale();
    return initialLocale === "zh" ? (zhMessages as Messages) : {};
  });

  // locale 变化时重新加载对应 messages
  useEffect(() => {
    let cancelled = false;
    loadMessages(locale).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("locale", newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      return getNestedValue(messages, key) ?? key;
    },
    [messages],
  );

  const value: LocaleContextValue = { locale, setLocale, t };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @repo/web exec tsc --noEmit
```

Expected: 无错误（JSON 模块导入需要 `resolveJsonModule: true`，已在 tsconfig 中配置）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/providers/locale-provider.tsx
git commit -m "fix(web): LocaleProvider 静态导入 zh.json 修复首屏国际化 key 显示问题"
```

---

## Task 4: 更新 locale-provider.test.tsx

**背景：** Task 3 修改后，原有测试 "messages 未加载完成时 t() 降级返回 key 本身" 的前提变化（zh 首屏同步可用），该测试会失败，需要更新为反映新行为的用例。

**Files:**
- Modify: `apps/web/app/providers/locale-provider.test.tsx`

- [ ] **Step 1: 定位并替换 "messages 未加载完成时" 测试**

找到以下代码块（文件末尾 ~line 156-167）：

```tsx
  it("messages 未加载完成时 t() 降级返回 key 本身", () => {
    // 同步渲染后 messages 尚未加载完成，t() 应返回 key
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    // 刚渲染、messages 为 null，应降级返回 key
    expect(screen.getByTestId("nav-home").textContent).toBe("nav.home");
  });
```

替换为：

```tsx
  it("默认 zh locale 时，t() 同步返回中文值（无需等待异步加载）", () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );
    // zh.json 静态导入，首屏即可用
    expect(screen.getByTestId("nav-home").textContent).toBe("首页");
  });
```

- [ ] **Step 2: 运行测试确认全部通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/providers/locale-provider.test.tsx
```

Expected: 所有测试 PASS（包括更新后的用例）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/providers/locale-provider.test.tsx
git commit -m "test(web): 更新 LocaleProvider 测试，反映 zh 同步加载新行为"
```

---

## Task 5: 修复导航栏不显示 — 移除 `mounted` 动画依赖

**背景：** `SiteNavbar` 用 `mounted` state 实现入场动画：初始值 `false` 使 navbar 带 `-translate-y-full opacity-0`，`useEffect` 触发后才变可见。若 hydration 过程出现任何 React 错误（如国际化 hydration mismatch），`useEffect` 不执行，navbar 永久隐藏。修复：移除 `mounted` 依赖，navbar 始终可见；滚动收缩效果保留。

**Files:**
- Modify: `apps/web/components/navbar/site-navbar.tsx`

- [ ] **Step 1: 修改 site-navbar.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileDrawer } from "./navbar-mobile-drawer";

export function SiteNavbar() {
  // 滚动缩小效果：scrollY > 10 时切换到紧凑样式
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-[padding,background-color,backdrop-filter,border-color] duration-300 ease-out",
        scrolled ? "py-2 backdrop-blur-md bg-background/80 border-b border-border" : "py-4",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <NavbarLogo />
          <NavbarLinks />
          <div className="flex items-center gap-1">
            <NavbarActions />
            <NavbarMobileDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 更新 site-navbar.test.tsx — 新增可见性断言**

在 `apps/web/components/navbar/site-navbar.test.tsx` 的 `describe("SiteNavbar", () => {` 块内，在第一个 `it` 之后插入以下测试：

```tsx
  it("初始渲染时 header 无 -translate-y-full 和 opacity-0（始终可见）", () => {
    render(<SiteNavbar />);
    const header = document.querySelector("header");
    expect(header?.className).not.toContain("-translate-y-full");
    expect(header?.className).not.toContain("opacity-0");
  });
```

- [ ] **Step 3: 运行测试确认通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/navbar/site-navbar.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/navbar/site-navbar.tsx apps/web/components/navbar/site-navbar.test.tsx
git commit -m "fix(web): 移除 SiteNavbar mounted 动画依赖，确保导航栏始终可见"
```

---

## Task 6: 修复轮播图指示器点击 — 不活跃幻灯片加 `pointer-events-none`

**背景：** 轮播图容器内，所有幻灯片均 `absolute inset-0`（铺满容器）。不活跃幻灯片 `opacity-0` 仍响应指针事件，可能拦截底部指示器按钮的点击。修复：不活跃幻灯片加 `pointer-events-none`，活跃幻灯片显式 `pointer-events-auto`。

**Files:**
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`

- [ ] **Step 1: 修改 featured-carousel-slide.tsx**

找到以下代码（第 14-17 行）：

```tsx
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
```

替换为：

```tsx
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
```

- [ ] **Step 2: 运行轮播图测试确认通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/featured/featured-carousel.test.tsx
```

Expected: 所有测试 PASS（包括点击指示器切换幻灯片的测试）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/featured/featured-carousel-slide.tsx
git commit -m "fix(web): 不活跃轮播幻灯片加 pointer-events-none，修复指示器点击穿透"
```

---

## Task 7: 文章分类 Tab 改用 Button brand/ghost variant

**背景：** `ArticleListHeader` 中的分类 Tab 当前使用原始 `<button>` 自定义样式，不符合 "Button brand horizontal 风格" 要求。改为使用 `@repo/ui` 的 `Button` 组件：活跃 Tab 用 `brand` variant，非活跃用 `ghost`，均加 `rounded-full` 实现 pill 形状。

**Files:**
- Modify: `apps/web/components/articles/article-list-header.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 修改 article-list-header.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useLocale } from "@repo/hooks";

interface ArticleListHeaderProps {
  categories: string[];
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// 分类 Tabs + 搜索框，搜索框有 300ms 防抖和 focus 展开效果
export function ArticleListHeader({
  categories,
  currentCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();
  // localQuery 即时响应输入，防抖 300ms 后才触发 onSearchChange
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // 当外部 searchQuery 重置时同步本地状态（如 category 切换时）
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // 防抖：localQuery 变化后 300ms 才通知外层
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 左侧分类 Tabs：活跃用 brand variant，非活跃用 ghost */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((category) => {
          const isActive = category === currentCategory;
          return (
            <Button
              key={category}
              onClick={() => onCategoryChange(category)}
              variant={isActive ? "brand" : "ghost"}
              size="sm"
              className="rounded-full"
              aria-pressed={isActive}
            >
              {category}
            </Button>
          );
        })}
      </div>

      {/* 右侧搜索框：focus 时从 w-48 展开到 w-64 */}
      <div className="relative flex items-center">
        <span className="absolute left-3 pointer-events-none text-muted-foreground">
          <SvgIcon name="search" size={16} />
        </span>
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder={t("article.searchPlaceholder")}
          className="w-48 focus:w-64 transition-all duration-300 rounded-full border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 article-section.test.tsx 中的 @repo/ui mock**

在 `apps/web/components/articles/article-section.test.tsx` 中，找到：

```tsx
// Mock @repo/ui Pagination
vi.mock("@repo/ui", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
    className,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
  }) => (
    <nav aria-label="分页导航" className={className}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="上一页"
      >
        上一页
      </button>
      <span data-testid="pagination-info">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="下一页"
      >
        下一页
      </button>
    </nav>
  ),
}));
```

替换为（新增 Button mock）：

```tsx
// Mock @repo/ui — Pagination + Button
vi.mock("@repo/ui", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
    className,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
  }) => (
    <nav aria-label="分页导航" className={className}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="上一页"
      >
        上一页
      </button>
      <span data-testid="pagination-info">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="下一页"
      >
        下一页
      </button>
    </nav>
  ),
  Button: ({
    children,
    variant,
    size,
    className,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} data-size={size} className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
```

注意：需要在文件顶部确认已有 `import React from "react"`，若无则新增。

- [ ] **Step 3: 运行 ArticleSection 测试确认通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/articles/article-section.test.tsx
```

Expected: 所有测试 PASS（`getByRole("button", { name: "工具" })` 仍有效，因为 Button mock 渲染 `<button>`）。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/articles/article-list-header.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "feat(web): 文章分类 Tab 改用 Button brand/ghost variant，pill 形状"
```

---

## Task 8: 碎语模块移至右侧栏，改单列显示

**背景：** 用户要求将 `SnippetsSection` 从主内容区迁移到右侧 `aside`，且每行只显示一个碎语卡片（grid 从 `md:grid-cols-2` 改为始终 `grid-cols-1`）。

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: 修改 snippets-section.tsx — 改单列 grid**

找到以下代码（第 22 行附近）：

```tsx
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
```

替换为：

```tsx
      <div className="grid grid-cols-1 gap-4 mt-4">
```

- [ ] **Step 2: 修改 page.tsx — 将 SnippetsSection 迁至 aside**

将文件完整内容替换为：

```tsx
import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { articles } from "./_mock/articles";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 全宽推荐轮播 */}
      <FeaturedCarousel posts={featuredPosts} />

      {/* 双栏区域：主内容 + 右侧栏 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* 主内容区 */}
        <div className="min-w-0">
          <ArticleSection articles={articles} />
        </div>

        {/* 右侧栏（移动端排在后面，PC 端固定在右侧）*/}
        {/* lg:top-20 对应 80px 固定导航栏高度 */}
        <aside className="lg:sticky lg:top-20">
          <RecentVisitors visitors={visitors} />
          <TagsCloud tags={tags} />
          <div className="mt-4">
            <SnippetsSection snippets={snippets} />
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 运行页面测试确认通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/page.test.tsx
```

Expected: 所有测试 PASS（`SnippetsSection` 仍在 DOM 中，只是位置变到 aside，testid 仍可查到）。

- [ ] **Step 4: 运行 SnippetsSection 测试确认通过**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/snippets/snippets-section.test.tsx
```

Expected: 所有测试 PASS（grid 列数变化不影响内容渲染测试）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/snippets/snippets-section.tsx
git commit -m "feat(web): 碎语模块迁至右侧栏，改单列 grid 显示"
```

---

## Task 9: 全量测试 & 验证

- [ ] **Step 1: 运行全量测试套件**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm test
```

Expected: 所有包测试 PASS，无 TypeScript 错误。

- [ ] **Step 2: 启动开发服务器目视验证**

```bash
pnpm --filter @repo/web dev
```

打开 `http://localhost:3000` 验证以下各项：

| 检查项 | 预期结果 |
|--------|---------|
| 导航栏 | 页面加载后立即可见，无闪烁 |
| 按钮 hover | 所有按钮显示手型光标（cursor-pointer） |
| 文章分类 Tab | 活跃 Tab 为品牌主色 pill，非活跃为 ghost 样式 |
| 搜索框 | 左侧有搜索图标（搜索镜头），placeholder 显示"搜索文章..." |
| 轮播图 | 点击底部水滴指示器可正常切换幻灯片 |
| 国际化 | 页面加载后所有文字正常显示（无 key 名如 "sidebar.joinQQ"） |
| 右侧栏 | 碎语模块在右侧栏，每行一条，最近来访和标签云也在右侧 |

- [ ] **Step 3: 最终 Commit（如有遗留改动）**

```bash
git status
# 若有未提交改动：
git add <files>
git commit -m "fix(web): 首页修复收尾"
```

---

## 已知注意事项

### 搜索图标（Issue #4）
代码 `article-list-header.tsx:67` 已有 `<SvgIcon name="search" size={16} />` 且 `search.svg` 已构建进 sprite。图标不显示的根因大概率是国际化 bug 导致整体 UI 渲染异常。Task 3 修复 i18n 后，搜索图标应自动恢复正常。若仍不显示，检查 `SvgSprite` 是否在 `layout.tsx` 的 body 中正确注入（当前已注入，位于 main 之前）。

### Button `brand` vs `default` 的区别
- `default`：`bg-primary text-primary-foreground shadow hover:bg-primary/90`（有阴影，用于主 CTA 按钮）
- `brand`：`bg-primary text-primary-foreground hover:bg-primary/90`（无阴影，用于 Tab 等嵌入式强调元素）
