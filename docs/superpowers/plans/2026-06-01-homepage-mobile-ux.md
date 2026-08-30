# Homepage Mobile UX 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复首页四处移动端体验问题：轮播图堆叠布局、Tabs 横向滚动 + 搜索图标切换、文章卡片结构调整、骨架屏加载 + 分页平滑滚动。

**Architecture:** 7 个顺序执行的任务，彼此独立，Task 5 依赖 Task 1（新图标）。每个任务：先写失败测试 → 实现 → 测试通过 → commit。

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS v4, Vitest + @testing-library/react, react-aria-components, @repo/ui, @repo/icons

---

## 文件改动一览

| 文件                                                          | 操作                   |
| ------------------------------------------------------------- | ---------------------- |
| `packages/icons/svg/arrow-up-right.svg`                       | 新增                   |
| `packages/icons/src/generated/types.ts`                       | 自动生成（build 产物） |
| `packages/icons/src/generated/sprite.ts`                      | 自动生成（build 产物） |
| `packages/ui/src/tabs.tsx`                                    | 修改                   |
| `packages/ui/src/tabs.test.tsx`                               | 更新                   |
| `apps/web/components/featured/featured-carousel.tsx`          | 修改                   |
| `apps/web/components/featured/featured-carousel-slide.tsx`    | 修改                   |
| `apps/web/components/featured/featured-carousel.test.tsx`     | 更新                   |
| `apps/web/components/articles/article-list-header.tsx`        | 修改                   |
| `apps/web/components/articles/article-list-header.test.tsx`   | 更新                   |
| `apps/web/components/articles/article-card.tsx`               | 修改                   |
| `apps/web/components/articles/article-card.test.tsx`          | 更新                   |
| `apps/web/components/articles/article-card-skeleton.tsx`      | 新增                   |
| `apps/web/components/articles/article-card-skeleton.test.tsx` | 新增                   |
| `apps/web/components/articles/article-section.tsx`            | 修改                   |
| `apps/web/components/articles/article-section.test.tsx`       | 更新                   |
| `apps/web/components/articles/index.ts`                       | 更新导出               |

---

## Task 1: 新增 arrow-up-right 图标

**Files:**

- Create: `packages/icons/svg/arrow-up-right.svg`
- Modified (generated): `packages/icons/src/generated/types.ts`

- [ ] **Step 1: 创建 SVG 文件**

创建 `packages/icons/svg/arrow-up-right.svg`，内容如下：

```xml
<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 17 17 7m0 0H7m10 0v10"/>
</svg>
```

- [ ] **Step 2: 运行 icons build，生成类型**

```bash
pnpm --filter @repo/icons build
```

Expected: 命令成功，无错误。

- [ ] **Step 3: 验证 types.ts 包含新图标**

```bash
grep "arrow-up-right" packages/icons/src/generated/types.ts
```

Expected: 输出 `  | "arrow-up-right"`

- [ ] **Step 4: 运行 icons 测试确保无破坏**

```bash
pnpm --filter @repo/icons test
```

Expected: All tests passed.

- [ ] **Step 5: Commit**

```bash
git add packages/icons/svg/arrow-up-right.svg packages/icons/src/generated/
git commit -m "feat(icons): 新增 arrow-up-right 图标"
```

---

## Task 2: TabsList underline 变体支持横向滚动

**Files:**

- Modify: `packages/ui/src/tabs.tsx`
- Modify: `packages/ui/src/tabs.test.tsx`

- [ ] **Step 1: 在 tabs.test.tsx 新增失败测试**

在 `packages/ui/src/tabs.test.tsx` 的 `describe("Tabs", ...)` 末尾追加以下两个测试（不删除现有测试）：

```tsx
it("underline variant tablist 含 overflow-x-auto 横向滚动样式", () => {
  render(
    <Tabs defaultSelectedKey="a">
      <TabsList variant="underline">
        <TabsItem id="a" variant="underline">
          A
        </TabsItem>
      </TabsList>
    </Tabs>,
  );
  const tablist = screen.getByRole("tablist");
  expect(tablist.className).toContain("overflow-x-auto");
});

it("underline variant tab 含 whitespace-nowrap 防止文字折行", () => {
  render(
    <Tabs defaultSelectedKey="a">
      <TabsList variant="underline">
        <TabsItem id="a" variant="underline">
          A
        </TabsItem>
      </TabsList>
    </Tabs>,
  );
  const tab = screen.getByRole("tab", { name: "A" });
  expect(tab.className).toContain("whitespace-nowrap");
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @repo/ui test
```

Expected: 新增的 2 个测试 FAIL。

- [ ] **Step 3: 修改 tabs.tsx**

在 `packages/ui/src/tabs.tsx` 中，将 `tabListVariantClasses` 的 `underline` 值改为：

```ts
const tabListVariantClasses = {
  "button-brand-horizontal": "inline-flex flex-wrap gap-1 p-1 bg-muted rounded-full",
  underline:
    "flex gap-4 border-b border-border overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]",
} as const;
```

然后将 `tabItemBaseClasses` 的 `underline` 值改为（末尾添加 `whitespace-nowrap shrink-0`）：

```ts
const tabItemBaseClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal": [
    "group relative flex items-center cursor-default rounded-full px-4 py-1.5",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "data-[disabled]:opacity-50",
  ].join(" "),
  underline: [
    "group relative pb-3 cursor-default",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "data-[disabled]:opacity-50",
    "whitespace-nowrap shrink-0",
  ].join(" "),
};
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @repo/ui test
```

Expected: All tests passed.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tabs.tsx packages/ui/src/tabs.test.tsx
git commit -m "feat(ui): Tabs underline 变体支持横向滚动，防止 tab 文字折行"
```

---

## Task 3: ArticleListHeader 移动端搜索图标切换

**Files:**

- Modify: `apps/web/components/articles/article-list-header.tsx`
- Modify: `apps/web/components/articles/article-list-header.test.tsx`

- [ ] **Step 1: 在 article-list-header.test.tsx 新增失败测试**

在文件末尾的 `describe("ArticleListHeader", ...)` 内追加以下测试：

```tsx
it("渲染移动端搜索图标按钮", () => {
  render(
    <ArticleListHeader
      categories={mockCategories}
      currentCategoryId={0}
      onCategoryChange={vi.fn()}
      searchQuery=""
      onSearchChange={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "搜索" })).toBeTruthy();
});

it("点击搜索图标后显示关闭按钮", async () => {
  const user = userEvent.setup();
  render(
    <ArticleListHeader
      categories={mockCategories}
      currentCategoryId={0}
      onCategoryChange={vi.fn()}
      searchQuery=""
      onSearchChange={vi.fn()}
    />,
  );
  await user.click(screen.getByRole("button", { name: "搜索" }));
  expect(screen.getByRole("button", { name: "关闭搜索" })).toBeTruthy();
});

it("点击关闭搜索后立即调用 onSearchChange('')", async () => {
  const user = userEvent.setup();
  const onSearchChange = vi.fn();
  render(
    <ArticleListHeader
      categories={mockCategories}
      currentCategoryId={0}
      onCategoryChange={vi.fn()}
      searchQuery=""
      onSearchChange={onSearchChange}
    />,
  );
  await user.click(screen.getByRole("button", { name: "搜索" }));
  await user.click(screen.getByRole("button", { name: "关闭搜索" }));
  expect(onSearchChange).toHaveBeenCalledWith("");
});
```

在文件顶部导入中确保有 `userEvent`（已存在，无需改动）。

- [ ] **Step 2: 运行测试确认新测试失败**

```bash
pnpm --filter web test -- article-list-header.test.tsx
```

Expected: 3 个新测试 FAIL。

- [ ] **Step 3: 完整替换 article-list-header.tsx**

用以下内容完整替换 `apps/web/components/articles/article-list-header.tsx`：

```tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, SearchField } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useLocale } from "@repo/hooks";
import type { CategoryTabItem } from "@repo/api";

interface ArticleListHeaderProps {
  categories: CategoryTabItem[];
  currentCategoryId: number;
  onCategoryChange: (id: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ArticleListHeader({
  categories,
  currentCategoryId,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setLocalQuery("");
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* 移动端展开搜索态：整行替换为搜索框 + 关闭按钮 */}
      {isSearchOpen && (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          <SearchField
            placeholder={t("article.searchPlaceholder")}
            value={localQuery}
            onChange={setLocalQuery}
            size="sm"
            className="flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCloseSearch}
            aria-label="关闭搜索"
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SvgIcon name="close" size={18} />
          </button>
        </div>
      )}

      {/* 正常态：Tabs + 桌面搜索框 + 移动搜索图标 */}
      <div
        className={`flex flex-1 items-center gap-2 min-w-0 ${isSearchOpen ? "hidden md:flex" : ""}`}
      >
        <Tabs
          selectedKey={String(currentCategoryId)}
          onSelectionChange={(key) => {
            const id = Number(key);
            if (!Number.isNaN(id)) onCategoryChange(id);
          }}
          className="flex-1 min-w-0"
        >
          <TabsList variant="underline">
            {categories.map((category) => (
              <TabsItem key={category.id} id={String(category.id)} variant="underline">
                {category.name}
              </TabsItem>
            ))}
          </TabsList>
        </Tabs>

        {/* 桌面端：展开式搜索框 */}
        <div className="hidden md:block shrink-0">
          <SearchField
            placeholder={t("article.searchPlaceholder")}
            value={localQuery}
            onChange={setLocalQuery}
            size="sm"
            className="w-48 focus-within:w-64 transition-all duration-300"
          />
        </div>

        {/* 移动端：搜索图标按钮（点击展开）*/}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="搜索"
          className="md:hidden shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SvgIcon name="search" size={18} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter web test -- article-list-header.test.tsx
```

Expected: All tests passed（含原有 3 个 + 新增 3 个，共 6 个）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/articles/article-list-header.tsx \
        apps/web/components/articles/article-list-header.test.tsx
git commit -m "feat(web): ArticleListHeader 移动端搜索改为图标切换，Tabs 横向滚动"
```

---

## Task 4: FeaturedCarousel 移动端堆叠布局

**Files:**

- Modify: `apps/web/components/featured/featured-carousel.tsx`
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`
- Modify: `apps/web/components/featured/featured-carousel.test.tsx`

- [ ] **Step 1: 更新 featured-carousel.test.tsx 中受影响的测试**

新结构会在移动端额外渲染当前幻灯片的标题（除桌面端覆盖层外），导致部分 `getByText` 因找到多个元素而报错。用以下内容完整替换 `apps/web/components/featured/featured-carousel.test.tsx`：

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FeaturedCarousel } from "./featured-carousel";
import type { FeaturedPost } from "../../app/_mock/types";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    className?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// @repo/ui Button mock: href → <a>, no href → <button>
vi.mock("@repo/ui", () => ({
  Button: ({
    href,
    children,
    tabIndex,
    className,
  }: {
    href?: string;
    children: ReactNode;
    tabIndex?: number;
    className?: string;
    variant?: string;
    size?: string;
  }) =>
    href ? (
      <a href={href} tabIndex={tabIndex} className={className}>
        {children}
      </a>
    ) : (
      <button type="button" tabIndex={tabIndex} className={className}>
        {children}
      </button>
    ),
}));

const mockPosts: FeaturedPost[] = [
  {
    id: "1",
    title: "第一篇文章标题",
    excerpt: "第一篇文章摘要内容",
    coverImage: "https://example.com/image1.jpg",
    category: "编程",
    href: "/articles/first",
  },
  {
    id: "2",
    title: "第二篇文章标题",
    excerpt: "第二篇文章摘要内容",
    coverImage: "https://example.com/image2.jpg",
    category: "工具",
    href: "/articles/second",
  },
  {
    id: "3",
    title: "第三篇文章标题",
    excerpt: "第三篇文章摘要内容",
    coverImage: "https://example.com/image3.jpg",
    category: "文学",
    href: "/articles/third",
  },
];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("FeaturedCarousel", () => {
  it("渲染不崩溃，DOM 中存在第一张幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 移动端区域 + 桌面端覆盖层都渲染当前幻灯片标题，至少出现一次
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
  });

  it("DOM 中存在所有幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 当前幻灯片（index 0）：移动端 + 桌面端各一处
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
    // 非激活幻灯片：仅桌面端覆盖层（opacity-0 但在 DOM 中）
    expect(screen.getByText("第二篇文章标题")).toBeTruthy();
    expect(screen.getByText("第三篇文章标题")).toBeTruthy();
  });

  it("渲染正确数量的指示器按钮", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const indicators = screen.getAllByTestId("icon-droplet-filled");
    expect(indicators).toHaveLength(mockPosts.length);
  });

  it("指示器按钮具有正确的 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 2 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 3 张，共 3 张")).toBeTruthy();
  });

  it("轮播容器具有正确的 region aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByRole("region", { name: "推荐文章" })).toBeTruthy();
  });

  it("阅读全文链接包含正确 href，不嵌套 button", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 激活幻灯片：移动端文字区 + 桌面端覆盖层各有一个"阅读全文"链接
    const links = screen.getAllByRole("link", { name: "阅读全文" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.some((l) => l.getAttribute("href") === "/articles/first")).toBe(true);
    links.forEach((l) => expect(l.querySelector("button")).toBeNull());
  });

  it("posts 为空时不渲染", () => {
    const { container } = render(<FeaturedCarousel posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("初始状态：第一个指示器为 current", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 2 张，共 3 张")).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("第 3 张，共 3 张")).not.toHaveAttribute("aria-current");
  });

  it("点击第二个指示器切换到第二张幻灯片", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);
    await act(async () => {
      await user.click(screen.getByLabelText("第 2 张，共 3 张"));
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 1 张，共 3 张")).not.toHaveAttribute("aria-current");
  });

  it("切换到第二张后，移动端文字区显示第二篇标题", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);
    await act(async () => {
      await user.click(screen.getByLabelText("第 2 张，共 3 张"));
    });
    // 移动端文字区直接读 activePost，检查能找到多个第二篇标题（移动端+桌面端重叠）
    expect(screen.getAllByText("第二篇文章标题").length).toBeGreaterThan(0);
  });
});

describe("FeaturedCarousel 自动轮播（fake timers）", () => {
  it("自动轮播：4 秒后切换到第二张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：8 秒后切换到第三张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByLabelText("第 3 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：12 秒后循环回到第一张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停时暂停自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      fireEvent.mouseEnter(screen.getByRole("region", { name: "推荐文章" }));
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停结束后恢复自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    const carousel = screen.getByRole("region", { name: "推荐文章" });
    act(() => {
      fireEvent.mouseEnter(carousel);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    act(() => {
      fireEvent.mouseLeave(carousel);
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });
});
```

- [ ] **Step 2: 运行测试，确认更新后的测试通过（当前实现尚未改，新增的测试会失败）**

```bash
pnpm --filter web test -- featured-carousel.test.tsx
```

Expected: "切换到第二张后，移动端文字区显示第二篇标题" FAIL（移动端区域尚不存在）。其余测试 PASS。

- [ ] **Step 3: 完整替换 featured-carousel-slide.tsx**

用以下内容完整替换 `apps/web/components/featured/featured-carousel-slide.tsx`：

```tsx
import Image from "next/image";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  isActive: boolean;
  /** 首屏 LCP 候选：首张幻灯片始终 eager 预加载 */
  isLcpCandidate?: boolean;
}

export function FeaturedCarouselSlide({
  post,
  isActive,
  isLcpCandidate = false,
}: FeaturedCarouselSlideProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isActive}
    >
      <div className="relative w-full h-full">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover"
          priority={isLcpCandidate}
          loading={isLcpCandidate ? "eager" : "lazy"}
        />

        {/* 桌面端：渐变遮罩 + 文字覆盖层 */}
        <div className="hidden md:block absolute inset-0 bg-linear-t from-black/80 via-black/30 to-transparent" />
        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <span className="inline-block mb-3 px-3 py-1 text-xs font-medium text-white bg-white/20 rounded-full backdrop-blur-sm">
            {post.category}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-sm lg:text-base text-white/80 mb-4 line-clamp-2">{post.excerpt}</p>
          <Button
            href={post.href}
            tabIndex={isActive ? 0 : -1}
            variant="outline"
            size="sm"
            className="border-white/60 text-white bg-transparent hover:bg-white/20 hover:text-white hover:border-white"
          >
            阅读全文
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 完整替换 featured-carousel.tsx**

用以下内容完整替换 `apps/web/components/featured/featured-carousel.tsx`：

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";
import { FeaturedCarouselIndicators } from "./featured-carousel-indicators";

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isHovered) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 4000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovered, posts.length]);

  if (posts.length === 0) return null;

  const activePost = posts[currentIndex];

  return (
    <div
      role="region"
      aria-label="推荐文章"
      className="overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片区：固定 16:9，各幻灯片在此叠层切换 */}
      <div className="relative aspect-video w-full">
        {posts.map((post, index) => (
          <FeaturedCarouselSlide
            key={post.id}
            post={post}
            isActive={index === currentIndex}
            isLcpCandidate={index === 0}
          />
        ))}
        <div className="absolute bottom-4 left-0 right-0 z-10">
          <FeaturedCarouselIndicators
            count={posts.length}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
        </div>
      </div>

      {/* 移动端文字区：图片下方，直接读当前幻灯片数据，无淡入淡出 */}
      <div className="md:hidden p-4 bg-card">
        <span className="inline-block mb-2 px-3 py-1 text-xs font-medium text-secondary-foreground bg-secondary rounded-full">
          {activePost.category}
        </span>
        <h2 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{activePost.title}</h2>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{activePost.excerpt}</p>
        <Button href={activePost.href} variant="outline" size="sm">
          阅读全文
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 运行测试确认全部通过**

```bash
pnpm --filter web test -- featured-carousel.test.tsx
```

Expected: All tests passed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/featured/featured-carousel.tsx \
        apps/web/components/featured/featured-carousel-slide.tsx \
        apps/web/components/featured/featured-carousel.test.tsx
git commit -m "feat(web): 轮播图移动端堆叠布局，文字显示在图片下方"
```

---

## Task 5: ArticleCard 结构调整（分类下移 + 外链图标）

**依赖：Task 1 已完成（arrow-up-right 图标可用）**

**Files:**

- Modify: `apps/web/components/articles/article-card.tsx`
- Modify: `apps/web/components/articles/article-card.test.tsx`

- [ ] **Step 1: 在 article-card.test.tsx 追加失败测试**

在 `describe("ArticleCard", ...)` 末尾追加：

```tsx
it("外链图标按钮指向相同文章路径", () => {
  render(<ArticleCard article={baseArticle} />);
  const iconLink = screen.getByRole("link", { name: "阅读文章" });
  expect(iconLink.getAttribute("href")).toBe("/articles/1");
});

it("分类标签在 DOM 中位于标题之后", () => {
  render(<ArticleCard article={baseArticle} />);
  const title = screen.getByText("测试文章标题");
  const category = screen.getByText("编程");
  // DOCUMENT_POSITION_FOLLOWING (4): category 在 title 之后
  expect(title.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("显示 arrow-up-right 图标", () => {
  render(<ArticleCard article={baseArticle} />);
  expect(screen.getByTestId("icon-arrow-up-right")).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认新测试失败**

```bash
pnpm --filter web test -- article-card.test.tsx
```

Expected: 3 个新测试 FAIL。

- [ ] **Step 3: 完整替换 article-card.tsx**

用以下内容完整替换 `apps/web/components/articles/article-card.tsx`：

```tsx
import Image from "next/image";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCardStats } from "./article-card-stats";

interface ArticleCardProps {
  article: ArticleListItemResp;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.created_at));

  const href = `/articles/${article.id}`;

  return (
    <article>
      {/* 封面图：hover 时内部图片放大 */}
      {article.cover_img_url && (
        <Link
          href={href}
          className="block overflow-hidden rounded-xl group"
          aria-hidden
          tabIndex={-1}
        >
          <div className="relative aspect-video">
            <Image
              src={article.cover_img_url}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </Link>
      )}

      {/* 标题行：左侧标题 + 右侧外链图标，与标题第一行垂直对齐 */}
      <div className="mt-3 flex items-start gap-2">
        <h3 className="flex-1 font-semibold text-base md:text-lg line-clamp-2">
          <Link href={href} className="hover:text-muted-foreground transition-colors duration-200">
            {article.title}
          </Link>
        </h3>
        <Link
          href={href}
          aria-label="阅读文章"
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <SvgIcon name="arrow-up-right" size={20} />
        </Link>
      </div>

      {/* 分类标签（移至标题下方）*/}
      {article.category && (
        <div className="mt-2">
          <span className="inline-block bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
            {article.category.name}
          </span>
        </div>
      )}

      {/* 文章摘要 */}
      {article.short_content && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{article.short_content}</p>
      )}

      {/* 底部：发布日期 + 统计数据 */}
      <div className="mt-3 flex justify-between items-center">
        <time dateTime={article.created_at} className="text-xs text-muted-foreground">
          {formattedDate}
        </time>
        <ArticleCardStats
          views={article.read_count}
          likes={article.like_count}
          comments={article.comment_count}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter web test -- article-card.test.tsx
```

Expected: All tests passed（含原有 8 个 + 新增 3 个，共 11 个）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/articles/article-card.tsx \
        apps/web/components/articles/article-card.test.tsx
git commit -m "feat(web): 文章卡片分类标签移至标题下方，新增外链图标按钮"
```

---

## Task 6: 新建 ArticleCardSkeleton 组件

**Files:**

- Create: `apps/web/components/articles/article-card-skeleton.tsx`
- Create: `apps/web/components/articles/article-card-skeleton.test.tsx`
- Modify: `apps/web/components/articles/index.ts`

- [ ] **Step 1: 创建测试文件**

创建 `apps/web/components/articles/article-card-skeleton.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ArticleCardSkeleton } from "./article-card-skeleton";

describe("ArticleCardSkeleton", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("根元素包含 animate-pulse 动画类", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect((container.firstChild as HTMLElement).classList.contains("animate-pulse")).toBe(true);
  });

  it("包含模拟封面图的占位块（aspect-video 比例）", () => {
    const { container } = render(<ArticleCardSkeleton />);
    const coverPlaceholder = container.querySelector(".aspect-video");
    expect(coverPlaceholder).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web test -- article-card-skeleton.test.tsx
```

Expected: 3 个测试 FAIL（文件不存在）。

- [ ] **Step 3: 创建 article-card-skeleton.tsx**

创建 `apps/web/components/articles/article-card-skeleton.tsx`：

```tsx
export function ArticleCardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 封面图占位 */}
      <div className="aspect-video rounded-xl bg-muted" />

      {/* 标题行占位（对应标题 + 右侧图标）*/}
      <div className="mt-3 flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className="shrink-0 mt-0.5 size-5 rounded bg-muted" />
      </div>

      {/* 分类标签占位 */}
      <div className="mt-2 h-5 w-16 rounded-full bg-muted" />

      {/* 摘要占位（三行）*/}
      <div className="mt-1 space-y-1.5">
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
      </div>

      {/* 底部统计占位 */}
      <div className="mt-3 flex justify-between items-center">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter web test -- article-card-skeleton.test.tsx
```

Expected: All 3 tests passed.

- [ ] **Step 5: 更新 index.ts 导出**

在 `apps/web/components/articles/index.ts` 末尾追加：

```ts
export { ArticleCardSkeleton } from "./article-card-skeleton";
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/articles/article-card-skeleton.tsx \
        apps/web/components/articles/article-card-skeleton.test.tsx \
        apps/web/components/articles/index.ts
git commit -m "feat(web): 新增 ArticleCardSkeleton 骨架屏组件"
```

---

## Task 7: ArticleSection 骨架屏加载 + 分页平滑滚动

**Files:**

- Modify: `apps/web/components/articles/article-section.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 在 article-section.test.tsx 追加失败测试**

在文件顶部的 `beforeEach` 内添加 `scrollIntoView` mock，并在 `describe("ArticleSection", ...)` 末尾追加以下测试。

首先，将现有的 `beforeEach` 替换为：

```tsx
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
```

然后在 `describe("ArticleSection", ...)` 末尾追加：

```tsx
it("翻页后调用 scrollIntoView 平滑滚动到文章区顶部", async () => {
  const scrollIntoView = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => makePageResp({ page: 2, list: [makeArticle(11, "第二页文章")] }),
  } as Response);

  const user = userEvent.setup();
  render(
    <ArticleSection
      initialPage={makePageResp({ total: 25, pages: 3 })}
      categories={mockCategories}
    />,
  );

  await act(async () => {
    await user.click(screen.getByRole("button", { name: "下一页" }));
  });

  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});

it("加载中显示骨架屏，加载完成后显示文章", async () => {
  let resolveResponse!: (val: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise<Response>((r) => {
        resolveResponse = r;
      }),
  );

  render(
    <ArticleSection
      initialPage={makePageResp({ total: 25, pages: 3 })}
      categories={mockCategories}
    />,
  );

  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
  });

  // 加载中：原文章文字消失（骨架屏无文字内容）
  await waitFor(() => {
    expect(screen.queryByText("文章一")).toBeNull();
    expect(screen.queryByText("文章二")).toBeNull();
  });

  // 解决 fetch，文章出现
  await act(async () => {
    resolveResponse({
      ok: true,
      json: async () => makePageResp({ page: 2, list: [makeArticle(11, "骨架屏测试文章")] }),
    } as Response);
  });

  await waitFor(() => {
    expect(screen.getByText("骨架屏测试文章")).toBeTruthy();
  });
});
```

在文件顶部确保 `fireEvent` 已从 `@testing-library/react` 导入（当前已导入，确认即可）。

- [ ] **Step 2: 运行测试确认新测试失败**

```bash
pnpm --filter web test -- article-section.test.tsx
```

Expected: 2 个新测试 FAIL。

- [ ] **Step 3: 完整替换 article-section.tsx**

用以下内容完整替换 `apps/web/components/articles/article-section.tsx`：

```tsx
"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Pagination } from "@repo/ui";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";
import { ArticleCardSkeleton } from "./article-card-skeleton";

const ALL_CATEGORY_ID = 0;

const ALL_CATEGORY: CategoryTabItem = {
  id: ALL_CATEGORY_ID,
  name: "全部",
  seq: -1,
  article_count: 0,
};

interface ArticleSectionProps {
  initialPage: ArticlePageResp;
  categories: CategoryTabItem[];
}

export function ArticleSection({ initialPage, categories }: ArticleSectionProps) {
  const [currentCategoryId, setCurrentCategoryId] = useState(ALL_CATEGORY_ID);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const abortRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const fetchPage = useCallback(async (categoryId: number, page: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (categoryId !== ALL_CATEGORY_ID) params.set("category_id", String(categoryId));
      const res = await fetch(`/api/articles?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("fetch failed");
      const data: ArticlePageResp = await res.json();
      setPageData(data);
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setFetchError(true);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback(
    (id: number) => {
      setFetchError(false);
      setCurrentCategoryId(id);
      setCurrentPage(1);
      void fetchPage(id, 1);
    },
    [fetchPage],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFetchError(false);
      setCurrentPage(page);
      void fetchPage(currentCategoryId, page);
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [currentCategoryId, fetchPage],
  );

  const skeletonCount = pageData.list.length || 6;

  return (
    <section ref={sectionRef}>
      <ArticleListHeader
        categories={allCategories}
        currentCategoryId={currentCategoryId}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, i) => <ArticleCardSkeleton key={i} />)
          : pageData.list.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>

      {fetchError && (
        <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}

      {pageData.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageData.pages}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}
    </section>
  );
}
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter web test -- article-section.test.tsx
```

Expected: All tests passed（含原有 5 个 + 新增 2 个，共 7 个）。

- [ ] **Step 5: 运行全量测试确认无回归**

```bash
pnpm --filter web test
```

Expected: All tests passed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/articles/article-section.tsx \
        apps/web/components/articles/article-section.test.tsx
git commit -m "feat(web): 文章列表翻页骨架屏加载 + 平滑滚动到顶部"
```

---

## 自查：规范覆盖

| 需求                     | 对应 Task       |
| ------------------------ | --------------- |
| 轮播图移动端文字在图下方 | Task 4          |
| 移动端搜索变图标         | Task 3          |
| Tabs 横向滚动，不换行    | Task 2 + Task 3 |
| 文章分类在标题下方       | Task 5          |
| 标题右侧外链图标         | Task 1 + Task 5 |
| 分页平滑滚动到列表顶部   | Task 7          |
| 分页骨架屏加载           | Task 6 + Task 7 |
| 所有改动对应测试更新     | 每个 Task 均含  |
