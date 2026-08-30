# Article & Category API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页文章列表与分类 Tab 从 mock 数据切换为真实后端接口，支持分类过滤与服务端分页。

**Architecture:** 后端先将 `ArticleListItemResp.Categories[]` 改为 `Category*`（单数）；前端 `packages/api` 新增类型与方法；`apps/web` 通过 SSR 拿到首屏数据，后续翻页/切分类通过 Route Handler `/api/articles` 代理到后端。

**Tech Stack:** Go (Gin), Next.js App Router, TypeScript, React, Vitest + @testing-library/react

---

## File Map

| 状态 | 文件                                                        | 说明                            |
| ---- | ----------------------------------------------------------- | ------------------------------- |
| M    | `blog-backend/internal/dto/article.go`                      | `Categories[]` → `Category*`    |
| M    | `blog-backend/internal/service/article_mapper.go`           | 取第一个分类                    |
| M    | `blog-backend/internal/service/article_test.go`             | 更新相关测试                    |
| C    | `packages/api/src/types/article.ts`                         | TS 类型                         |
| C    | `packages/api/src/types/category.ts`                        | TS 类型                         |
| M    | `packages/api/src/client.ts`                                | 新增 articles / categories 方法 |
| M    | `packages/api/src/client.test.ts`                           | 新增方法测试                    |
| M    | `packages/api/src/index.ts`                                 | 导出新类型                      |
| C    | `apps/web/app/api/articles/route.ts`                        | Route Handler 代理              |
| M    | `apps/web/app/page.tsx`                                     | SSR 并发 fetch                  |
| M    | `apps/web/app/page.test.tsx`                                | 更新为 async 渲染               |
| M    | `apps/web/components/articles/article-card.tsx`             | 改用真实类型                    |
| C    | `apps/web/components/articles/article-card.test.tsx`        | 新建测试                        |
| M    | `apps/web/components/articles/article-list-header.tsx`      | 改用 `CategoryTabItem[]`        |
| M    | `apps/web/components/articles/article-list-header.test.tsx` | 更新测试                        |
| M    | `apps/web/components/articles/article-section.tsx`          | 全面重构                        |
| M    | `apps/web/components/articles/article-section.test.tsx`     | 全面重写                        |

---

## Task 1: 后端 — `ArticleListItemResp.Categories[]` → `Category*`

**Files:**

- Modify: `blog-backend/internal/dto/article.go`
- Modify: `blog-backend/internal/service/article_mapper.go`
- Modify: `blog-backend/internal/service/article_test.go`

- [ ] **Step 1: 更新测试，期望单个 category 字段**

在 `blog-backend/internal/service/article_test.go` 中，将 `TestArticleService_ListPublic_IncludesCategoriesInListItem` 改为：

```go
func TestArticleService_ListPublic_IncludesCategoriesInListItem(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	repo := mock.NewMockArticleRepository(ctrl)
	svc := service.NewArticleService(repo, nil)

	categoryURL := "tech"
	repo.EXPECT().
		ListPublic(repository.ArticleListFilter{Page: 1, PageSize: 10}).
		Return(&repository.ArticlePageResult{
			Total:    1,
			Page:     1,
			PageSize: 10,
			Articles: []repository.ArticleAggregate{{
				Article: model.Article{
					Base:   model.Base{ID: 1},
					Title:  "Hello",
					UserID: 1,
					Status: 1,
				},
				Categories: []model.Category{
					{Base: model.Base{ID: 3}, Name: "Tech", URL: &categoryURL},
				},
			}},
		}, nil)

	resp, err := svc.ListPublic(dto.ArticleListReq{})
	require.NoError(t, err)
	require.Len(t, resp.List, 1)
	require.NotNil(t, resp.List[0].Category)
	assert.Equal(t, uint(3), resp.List[0].Category.ID)
	assert.Equal(t, "Tech", resp.List[0].Category.Name)
	assert.Equal(t, &categoryURL, resp.List[0].Category.URL)
}
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go test ./internal/service/... -run TestArticleService_ListPublic_IncludesCategoriesInListItem -v
```

期望：编译错误，`resp.List[0].Category` 字段不存在。

- [ ] **Step 3: 修改 DTO — 替换字段**

在 `blog-backend/internal/dto/article.go` 中，将 `ArticleListItemResp` 的分类字段从：

```go
// Categories 文章分类列表。
Categories []ArticleRelationResp `json:"categories"`
```

改为：

```go
// Category 文章所属分类（每篇文章归属一个分类）。
Category *ArticleRelationResp `json:"category,omitempty"`
```

- [ ] **Step 4: 修改 Mapper — 取第一个分类**

在 `blog-backend/internal/service/article_mapper.go` 中，将 `articleListItemToDTO` 改为：

```go
func articleListItemToDTO(aggregate *repository.ArticleAggregate) dto.ArticleListItemResp {
	article := aggregate.Article
	var category *dto.ArticleRelationResp
	if len(aggregate.Categories) > 0 {
		c := aggregate.Categories[0]
		category = &dto.ArticleRelationResp{
			ID:          c.ID,
			Name:        c.Name,
			URL:         c.URL,
			Icon:        c.Icon,
			Description: c.Description,
			CoverImgUrl: c.CoverImgUrl,
		}
	}
	return dto.ArticleListItemResp{
		ID:            article.ID,
		Title:         article.Title,
		CoverImgUrl:   article.CoverImgUrl,
		ShortContent:  article.ShortContent,
		UserID:        article.UserID,
		Status:        article.Status,
		CommentStatus: article.CommentStatus,
		ReadCount:     article.ReadCount,
		LikeCount:     aggregate.LikeCount,
		CommentCount:  aggregate.CommentCount,
		IsRecommended: aggregate.Recommend != nil,
		Category:      category,
		CreatedAt:     article.CreatedAt,
		UpdatedAt:     article.UpdatedAt,
	}
}
```

- [ ] **Step 5: 运行全量测试，确认通过**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go test ./internal/...
```

期望：全部 PASS。

- [ ] **Step 6: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
git add internal/dto/article.go internal/service/article_mapper.go internal/service/article_test.go
git commit -m "refactor(api): 文章列表项 Categories[] 改为 Category* 单分类字段"
```

---

## Task 2: `packages/api` — TypeScript 类型定义

**Files:**

- Create: `packages/api/src/types/article.ts`
- Create: `packages/api/src/types/category.ts`

- [ ] **Step 1: 创建文章类型文件**

新建 `packages/api/src/types/article.ts`：

```typescript
export interface ArticleRelationResp {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
}

export interface ArticleListReq {
  page?: number;
  page_size?: number;
  recommend?: boolean;
  category_id?: number;
  tag_id?: number;
}

export interface ArticleListItemResp {
  id: number;
  title: string;
  cover_img_url?: string;
  short_content?: string;
  user_id: number;
  status: number;
  comment_status: number;
  read_count: number;
  like_count: number;
  comment_count: number;
  is_recommended: boolean;
  category?: ArticleRelationResp;
  created_at: string;
  updated_at: string;
}

export interface ArticlePageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: ArticleListItemResp[];
}
```

- [ ] **Step 2: 创建分类类型文件**

新建 `packages/api/src/types/category.ts`：

```typescript
export interface CategoryTabItem {
  id: number;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  cover_img_url?: string;
  seq: number;
  article_count: number;
}

export interface CategoryTabsResp {
  list: CategoryTabItem[];
}
```

- [ ] **Step 3: Commit（仅类型文件）**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add packages/api/src/types/article.ts packages/api/src/types/category.ts
git commit -m "feat(api): 新增文章与分类 TypeScript 类型定义"
```

---

## Task 3: `packages/api` — 客户端方法 + 导出 + 测试

**Files:**

- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/client.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 写失败测试**

在 `packages/api/src/client.test.ts` 中，在 `describe("createApiClient", ...)` 块末尾追加：

```typescript
// ── 文章与分类接口（公开，无需登录）────────────────────────────────

it("articles.listPublic 无参数时调用 /articles", async () => {
  vi.mocked(global.fetch).mockResolvedValue(
    mockResponse({
      code: 0,
      message: "ok",
      data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
    }),
  );
  const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

  await client.articles.listPublic();

  expect(global.fetch).toHaveBeenCalledWith(
    "http://api/articles",
    expect.objectContaining({ method: "GET" }),
  );
});

it("articles.listPublic 带 category_id 和 page 时构造正确 query string", async () => {
  vi.mocked(global.fetch).mockResolvedValue(
    mockResponse({
      code: 0,
      message: "ok",
      data: { total: 0, pages: 0, page: 2, page_size: 10, list: [] },
    }),
  );
  const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

  await client.articles.listPublic({ page: 2, category_id: 3 });

  const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
  const url = new URL(calledUrl);
  expect(url.pathname).toBe("/articles");
  expect(url.searchParams.get("page")).toBe("2");
  expect(url.searchParams.get("category_id")).toBe("3");
});

it("categories.listTabs 调用 /categories", async () => {
  vi.mocked(global.fetch).mockResolvedValue(
    mockResponse({ code: 0, message: "ok", data: { list: [] } }),
  );
  const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

  await client.categories.listTabs();

  expect(global.fetch).toHaveBeenCalledWith(
    "http://api/categories",
    expect.objectContaining({ method: "GET" }),
  );
});
```

- [ ] **Step 2: 运行测试，确认新测试失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/api run test
```

期望：3 个新测试 FAIL（`client.articles` / `client.categories` 未定义）。

- [ ] **Step 3: 修改 `client.ts` — 新增导入与方法**

在 `packages/api/src/client.ts` 顶部导入中追加：

```typescript
import type { ArticleListReq, ArticlePageResp } from "./types/article";
import type { CategoryTabsResp } from "./types/category";
```

在 `createApiClient` 的 `return` 对象中，**替换整个 return 语句**：

```typescript
return {
  auth: {
    sendCode: (req: SendCodeReq) =>
      fetchPublic<void>("/auth/send-code", { method: "POST", body: JSON.stringify(req) }),
    register: (req: RegisterReq) =>
      fetchPublic<UserResp>("/auth/register", { method: "POST", body: JSON.stringify(req) }),
    login: (req: LoginReq) =>
      fetchPublic<LoginResp>("/auth/login", { method: "POST", body: JSON.stringify(req) }),
    refresh: (req: RefreshReq) =>
      fetchPublic<TokenResp>("/auth/refresh", { method: "POST", body: JSON.stringify(req) }),
  },
  articles: {
    listPublic: (req: ArticleListReq = {}) => {
      const params = new URLSearchParams();
      if (req.page !== undefined) params.set("page", String(req.page));
      if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
      if (req.recommend !== undefined) params.set("recommend", String(req.recommend));
      if (req.category_id !== undefined) params.set("category_id", String(req.category_id));
      if (req.tag_id !== undefined) params.set("tag_id", String(req.tag_id));
      const qs = params.toString();
      return fetchPublic<ArticlePageResp>(`/articles${qs ? `?${qs}` : ""}`, { method: "GET" });
    },
  },
  categories: {
    listTabs: () => fetchPublic<CategoryTabsResp>("/categories", { method: "GET" }),
  },
  test: {
    authed: () => fetchAuthed<string>("/test/authed", { method: "GET" }),
  },
};
```

- [ ] **Step 4: 修改 `index.ts` — 导出新类型**

在 `packages/api/src/index.ts` 末尾追加：

```typescript
export type {
  ArticleRelationResp,
  ArticleListReq,
  ArticleListItemResp,
  ArticlePageResp,
} from "./types/article";
export type { CategoryTabItem, CategoryTabsResp } from "./types/category";
```

- [ ] **Step 5: 运行测试，确认全部通过**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/api run test
```

期望：全部 PASS（原 7 个 + 新增 3 个 = 10 个）。

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts packages/api/src/index.ts
git commit -m "feat(api): 新增 articles.listPublic 与 categories.listTabs 方法"
```

---

## Task 4: Route Handler — `GET /api/articles`

**Files:**

- Create: `apps/web/app/api/articles/route.ts`

- [ ] **Step 1: 创建 Route Handler**

新建 `apps/web/app/api/articles/route.ts`：

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";
import type { ArticleListReq } from "@repo/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const req: ArticleListReq = {};
    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const categoryId = searchParams.get("category_id");
    if (page) req.page = Number(page);
    if (pageSize) req.page_size = Number(pageSize);
    if (categoryId) req.category_id = Number(categoryId);

    const api = await createServerApiClient();
    const data = await api.articles.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/apps/web
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 3: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add apps/web/app/api/articles/route.ts
git commit -m "feat(web): 新增 /api/articles Route Handler 代理后端文章分页接口"
```

---

## Task 5: `ArticleCard` — 改用真实类型 + 新建测试

**Files:**

- Modify: `apps/web/components/articles/article-card.tsx`
- Create: `apps/web/components/articles/article-card.test.tsx`

- [ ] **Step 1: 写失败测试**

新建 `apps/web/components/articles/article-card.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCard } from "./article-card";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
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
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const baseArticle: ArticleListItemResp = {
  id: 1,
  title: "测试文章标题",
  cover_img_url: "https://example.com/cover.jpg",
  short_content: "这是文章摘要",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 100,
  like_count: 20,
  comment_count: 5,
  is_recommended: false,
  category: { id: 1, name: "编程" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ArticleCard", () => {
  it("渲染不崩溃，显示标题", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("测试文章标题")).toBeTruthy();
  });

  it("显示文章摘要", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("这是文章摘要")).toBeTruthy();
  });

  it("显示分类名称", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("编程")).toBeTruthy();
  });

  it("有封面图时渲染 img", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByAltText("测试文章标题")).toBeTruthy();
  });

  it("无封面图时不渲染 img", () => {
    render(<ArticleCard article={{ ...baseArticle, cover_img_url: undefined }} />);
    expect(screen.queryByAltText("测试文章标题")).toBeNull();
  });

  it("无分类时不渲染分类标签", () => {
    render(<ArticleCard article={{ ...baseArticle, category: undefined }} />);
    expect(screen.queryByText("编程")).toBeNull();
  });

  it("标题链接指向 /articles/{id}", () => {
    render(<ArticleCard article={baseArticle} />);
    const link = screen.getByRole("link", { name: "测试文章标题" });
    expect(link.getAttribute("href")).toBe("/articles/1");
  });

  it("显示阅读量统计", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("100")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test -- article-card.test
```

期望：FAIL（`ArticleCard` 仍使用旧类型 `Article`）。

- [ ] **Step 3: 重写 `article-card.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
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
      {article.cover_img_url && (
        <Link href={href} className="block overflow-hidden rounded-xl group">
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

      {article.category && (
        <div className="mt-3">
          <span className="inline-block bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
            {article.category.name}
          </span>
        </div>
      )}

      <h3 className="mt-2 font-semibold text-base md:text-lg line-clamp-2">
        <Link href={href} className="hover:text-muted-foreground transition-colors duration-200">
          {article.title}
        </Link>
      </h3>

      {article.short_content && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{article.short_content}</p>
      )}

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

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter web run test -- article-card.test
```

期望：全部 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add apps/web/components/articles/article-card.tsx apps/web/components/articles/article-card.test.tsx
git commit -m "refactor(web): ArticleCard 改用真实 ArticleListItemResp 类型"
```

---

## Task 6: `ArticleListHeader` — 接收 `CategoryTabItem[]`

**Files:**

- Modify: `apps/web/components/articles/article-list-header.tsx`
- Modify: `apps/web/components/articles/article-list-header.test.tsx`

- [ ] **Step 1: 更新测试**

将 `article-list-header.test.tsx` 完整替换为：

```tsx
import { describe, it, expect, vi, afterEach, act } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        "article.searchPlaceholder": "搜索文章...",
      };
      return messages[key] ?? key;
    },
  }),
}));

const mockCategories: CategoryTabItem[] = [
  { id: 0, name: "全部", seq: -1, article_count: 0 },
  { id: 1, name: "编程", seq: 0, article_count: 5 },
];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ArticleListHeader", () => {
  it("渲染分类 Tab 和搜索框", () => {
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByPlaceholderText("搜索文章...")).toBeTruthy();
  });

  it("搜索框输入后防抖 300ms 触发 onSearchChange", () => {
    vi.useFakeTimers();
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

    fireEvent.change(screen.getByPlaceholderText("搜索文章..."), {
      target: { value: "React" },
    });
    expect(onSearchChange).not.toHaveBeenCalledWith("React");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith("React");
  });

  it("点击分类 Tab 后调用 onCategoryChange 传入对应 id", async () => {
    const onCategoryChange = vi.fn();
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={onCategoryChange}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );

    // mock 中 TabsItem 渲染为 <button data-tab-id="1">编程</button>
    // Tabs onClick 事件委托调用 onSelectionChange("1")
    // ArticleListHeader 将其转为 Number("1") = 1 传给 onCategoryChange
    fireEvent.click(screen.getByText("编程"));

    expect(onCategoryChange).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test -- article-list-header.test
```

期望：FAIL（props 类型不匹配）。

- [ ] **Step 3: 更新 `article-list-header.tsx`**

将文件完整替换为：

```tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, SearchField } from "@repo/ui";
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

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Tabs
        selectedKey={String(currentCategoryId)}
        onSelectionChange={(key) => onCategoryChange(Number(key))}
      >
        <TabsList variant="button-brand-horizontal">
          {categories.map((category) => (
            <TabsItem key={category.id} id={String(category.id)} variant="button-brand-horizontal">
              {category.name}
            </TabsItem>
          ))}
        </TabsList>
      </Tabs>

      <SearchField
        placeholder={t("article.searchPlaceholder")}
        value={localQuery}
        onChange={setLocalQuery}
        size="sm"
        inputClassName="w-48 focus:w-64 transition-all duration-300"
      />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter web run test -- article-list-header.test
```

期望：全部 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add apps/web/components/articles/article-list-header.tsx apps/web/components/articles/article-list-header.test.tsx
git commit -m "refactor(web): ArticleListHeader 改用 CategoryTabItem[] 与数字 id"
```

---

## Task 7: `ArticleSection` — 重构为真实 API

**Files:**

- Modify: `apps/web/components/articles/article-section.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 写新测试**

将 `article-section.test.tsx` 完整替换为：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleSection } from "./article-section";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [k: string]: unknown;
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
  Tabs: ({
    children,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => {
    const handleSelect = (e: { target: EventTarget | null }) => {
      const btn = (e.target as HTMLElement).closest("button[data-tab-id]");
      if (btn && onSelectionChange) {
        onSelectionChange(btn.getAttribute("data-tab-id") ?? "");
      }
    };
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    return (
      <div onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    <button data-tab-id={id}>{children}</button>
  ),
  SearchField: ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    size?: string;
    inputClassName?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = { "article.searchPlaceholder": "搜索文章..." };
      return messages[key] ?? key;
    },
  }),
}));

function makeArticle(id: number, title: string) {
  return {
    id,
    title,
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 10,
    like_count: 2,
    comment_count: 1,
    is_recommended: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makePageResp(overrides: Partial<ArticlePageResp> = {}): ArticlePageResp {
  return {
    total: 2,
    pages: 1,
    page: 1,
    page_size: 10,
    list: [makeArticle(1, "文章一"), makeArticle(2, "文章二")],
    ...overrides,
  };
}

const mockCategories: CategoryTabItem[] = [
  { id: 1, name: "编程", seq: 0, article_count: 10 },
  { id: 2, name: "工具", seq: 1, article_count: 5 },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ArticleSection", () => {
  it("渲染初始数据，不触发 fetch", () => {
    render(<ArticleSection initialPage={makePageResp()} categories={mockCategories} />);
    expect(screen.getByText("文章一")).toBeTruthy();
    expect(screen.getByText("文章二")).toBeTruthy();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("pages <= 1 时不显示分页", () => {
    render(<ArticleSection initialPage={makePageResp({ pages: 1 })} categories={mockCategories} />);
    expect(screen.queryByRole("navigation", { name: "分页导航" })).toBeNull();
  });

  it("pages > 1 时显示分页", () => {
    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );
    expect(screen.getByRole("navigation", { name: "分页导航" })).toBeTruthy();
  });

  it("点击分类 Tab 后以 category_id 参数 fetch 第一页", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makePageResp({ list: [makeArticle(3, "编程文章")] }),
    } as Response);

    render(<ArticleSection initialPage={makePageResp()} categories={mockCategories} />);

    const tab = screen.getByRole("button", { name: "编程" });
    await act(async () => {
      await user.click(tab);
    });

    await waitFor(() => {
      const call = vi.mocked(fetch).mock.calls[0][0] as string;
      const url = new URL(call, "http://localhost");
      expect(url.pathname).toBe("/api/articles");
      expect(url.searchParams.get("category_id")).toBe("1");
      expect(url.searchParams.get("page")).toBe("1");
    });

    await waitFor(() => {
      expect(screen.getByText("编程文章")).toBeTruthy();
    });
  });

  it("点击下一页后以正确 page 参数 fetch", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makePageResp({ page: 2, list: [makeArticle(11, "第二页文章")] }),
    } as Response);

    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: "下一页" });
    await act(async () => {
      await user.click(nextBtn);
    });

    await waitFor(() => {
      const call = vi.mocked(fetch).mock.calls[0][0] as string;
      const url = new URL(call, "http://localhost");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("category_id")).toBeNull();
    });

    await waitFor(() => {
      expect(screen.getByText("第二页文章")).toBeTruthy();
    });
  });

  it("切换分类后页码重置为 1", async () => {
    const user = userEvent.setup();
    // 第一次 fetch：翻到第 2 页
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePageResp({ page: 2, pages: 3, list: [makeArticle(5, "第二页")] }),
      } as Response)
      // 第二次 fetch：切换分类，应请求 page=1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePageResp({ list: [makeArticle(6, "编程第一页")] }),
      } as Response);

    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    // 翻到第 2 页
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "下一页" }));
    });
    await waitFor(() => expect(screen.getByText("第二页")).toBeTruthy());

    // 切换分类
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "编程" }));
    });

    await waitFor(() => {
      const secondCall = vi.mocked(fetch).mock.calls[1][0] as string;
      const url = new URL(secondCall, "http://localhost");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("category_id")).toBe("1");
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test -- article-section.test
```

期望：FAIL（`ArticleSection` 仍接收旧 `articles: Article[]` prop）。

- [ ] **Step 3: 重写 `article-section.tsx`**

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { Pagination } from "@repo/ui";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";

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
  const [searchQuery, setSearchQuery] = useState("");

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const fetchPage = useCallback(async (categoryId: number, page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (categoryId !== ALL_CATEGORY_ID) params.set("category_id", String(categoryId));
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: ArticlePageResp = await res.json();
      setPageData(data);
    } catch {
      // 保留已有数据，不显示错误
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback(
    (id: number) => {
      setCurrentCategoryId(id);
      setCurrentPage(1);
      void fetchPage(id, 1);
    },
    [fetchPage],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      void fetchPage(currentCategoryId, page);
    },
    [currentCategoryId, fetchPage],
  );

  return (
    <section>
      <ArticleListHeader
        categories={allCategories}
        currentCategoryId={currentCategoryId}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 transition-opacity duration-200 ${
          isLoading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {pageData.list.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

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

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter web run test -- article-section.test
```

期望：全部 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add apps/web/components/articles/article-section.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "refactor(web): ArticleSection 接入真实分页 API，替换 mock 数据"
```

---

## Task 8: `page.tsx` — SSR 接入真实数据

**Files:**

- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/page.test.tsx`

- [ ] **Step 1: 更新 `page.test.tsx`**

将 `page.test.tsx` 完整替换为：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./page";

vi.mock("../components/featured", () => ({
  FeaturedCarousel: () => <div data-testid="featured-carousel">FeaturedCarousel</div>,
}));
vi.mock("../components/articles", () => ({
  ArticleSection: () => <div data-testid="article-section">ArticleSection</div>,
}));
vi.mock("../components/snippets", () => ({
  SnippetsSection: () => <div data-testid="snippets-section">SnippetsSection</div>,
}));
vi.mock("../components/sidebar", () => ({
  RecentVisitors: () => <div data-testid="recent-visitors">RecentVisitors</div>,
  TagsCloud: () => <div data-testid="tags-cloud">TagsCloud</div>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

// vi.mock 工厂会被提升（hoisted），mock 数据必须内联定义，不能引用外部变量
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      listPublic: async () => ({ total: 0, pages: 0, page: 1, page_size: 10, list: [] }),
    },
    categories: {
      listTabs: async () => ({ list: [] }),
    },
  }),
}));

describe("Home page", () => {
  it("渲染不崩溃", async () => {
    const element = await Page();
    expect(() => render(element)).not.toThrow();
  });

  it("包含推荐文章轮播区域", async () => {
    render(await Page());
    expect(screen.getByTestId("featured-carousel")).toBeInTheDocument();
  });

  it("包含文章列表区域", async () => {
    render(await Page());
    expect(screen.getByTestId("article-section")).toBeInTheDocument();
  });

  it("包含碎语区域", async () => {
    render(await Page());
    expect(screen.getByTestId("snippets-section")).toBeInTheDocument();
  });

  it("包含最近来访模块", async () => {
    render(await Page());
    expect(screen.getByTestId("recent-visitors")).toBeInTheDocument();
  });

  it("包含标签云模块", async () => {
    render(await Page());
    expect(screen.getByTestId("tags-cloud")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test -- app/page.test
```

期望：FAIL（`Page` 不是 async 函数 / 仍使用 mock 数据）。

- [ ] **Step 3: 更新 `page.tsx`**

将 `apps/web/app/page.tsx` 完整替换为：

```tsx
import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import { createServerApiClient } from "../lib/server-api";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

export default async function Home() {
  const api = await createServerApiClient();
  const [categoriesResp, initialPage] = await Promise.all([
    api.categories.listTabs(),
    api.articles.listPublic({ page: 1 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 全宽推荐轮播 */}
      <FeaturedCarousel posts={featuredPosts} />

      {/* 双栏区域：主内容 + 右侧栏 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* 主内容区 */}
        <div className="min-w-0">
          <ArticleSection initialPage={initialPage} categories={categoriesResp.list} />
        </div>

        {/* 右侧栏（移动端排在后面，PC 端固定在右侧）*/}
        <aside className="lg:sticky lg:top-20">
          <SnippetsSection snippets={snippets} />
          <div className="mt-4">
            <RecentVisitors visitors={visitors} />
          </div>
          <TagsCloud tags={tags} />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter web run test -- app/page.test
```

期望：全部 PASS。

- [ ] **Step 5: 全量测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test
pnpm --filter @repo/api run test
```

期望：全部 PASS，无类型错误。

- [ ] **Step 6: TypeScript 检查**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/apps/web
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 7: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add apps/web/app/page.tsx apps/web/app/page.test.tsx
git commit -m "feat(web): 首页改用 SSR 并发拉取分类与文章列表真实数据"
```
