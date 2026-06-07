# 碎语 API 对接实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页侧边栏碎语区从静态 mock 数据切换为后端真实 API（`GET /moments`）

**Architecture:** 在 `packages/api` 新增 moment 类型和 `moments.listPublic()` 方法；`apps/web/app/page.tsx` 在 `Promise.all` 中并发调用该方法；各碎语组件从 mock `Snippet` 类型迁移到 `MomentItemResp` 类型。

**Tech Stack:** TypeScript, Next.js App Router (Server Components), Vitest, @testing-library/react

---

## 文件变更清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `packages/api/src/types/moment.ts` | 对应后端 DTO 的 TypeScript 类型 |
| 修改 | `packages/api/src/client.ts` | 添加 `moments.listPublic()` 方法 |
| 修改 | `packages/api/src/client.test.ts` | 为 `moments.listPublic` 补充测试 |
| 修改 | `packages/api/src/index.ts` | 导出 moment 类型 |
| 修改 | `apps/web/components/snippets/snippets-section.test.tsx` | 改用 `MomentItemResp` 构造测试数据 |
| 修改 | `apps/web/components/snippets/snippet-card.tsx` | 接受 `MomentItemResp`，更新字段映射 |
| 修改 | `apps/web/components/snippets/snippets-section.tsx` | props 类型改为 `MomentItemResp[]` |
| 修改 | `apps/web/app/page.test.tsx` | 更新 mock 和断言以包含 moments 请求 |
| 修改 | `apps/web/app/page.tsx` | 替换 mock 导入，调用真实 API |
| 删除 | `apps/web/app/home-content.tsx` | 废弃文件 |

---

## Task 1: 新建 moment 类型文件

**Files:**
- Create: `packages/api/src/types/moment.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// packages/api/src/types/moment.ts

export interface MomentListReq {
  user_id?: number;
  role_id?: number;
  page?: number;
  page_size?: number;
}

export interface MomentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface MomentMediaResp {
  id: number;
  name: string;
  file_type: string;
  url: string;
  /** 可直接访问的图片地址 */
  access_url: string;
  size: number;
  seq: number;
}

export interface MomentItemResp {
  id: number;
  user_id: number;
  content: string;
  status: 0 | 1;
  comment_status: 0 | 1;
  read_count: number;
  is_top: boolean;
  /** Go int64 — safe as JS number for blog-scale counts */
  like_count: number;
  /** Go int64 — safe as JS number for blog-scale counts */
  comment_count: number;
  is_liked: boolean;
  user?: MomentUserResp;
  images: MomentMediaResp[];
  created_at: string;
  updated_at: string;
}

export interface MomentPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: MomentItemResp[];
}
```

- [ ] **Step 2: 验证 TypeScript 编译无报错**

```bash
cd packages/api && pnpm tsc --noEmit
```

Expected: 无错误输出

---

## Task 2: 在 API 客户端添加 moments.listPublic

**Files:**
- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/client.test.ts`

- [ ] **Step 1: 在 client.test.ts 末尾写失败测试**

在 `describe("createApiClient", ...)` 最后一个测试之后添加：

```typescript
  // ── 碎语接口（公开，无需登录）────────────────────────────────────────

  it("moments.listPublic 无参数时调用 /moments", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("moments.listPublic 带 page 和 page_size 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 3, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ page: 1, page_size: 3 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("page_size")).toBe("3");
  });

  it("moments.listPublic 带 user_id 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ user_id: 2 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments");
    expect(url.searchParams.get("user_id")).toBe("2");
  });
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd packages/api && pnpm test
```

Expected: `TypeError: client.moments is not a function` 或 `client.moments is undefined`

- [ ] **Step 3: 在 client.ts 中添加类型导入和 moments 方法**

在 `client.ts` 顶部已有的 `import type { ... }` 语句后添加：
```typescript
import type { MomentListReq, MomentPageResp } from "./types/moment";
```

在 `createApiClient` 的返回值对象中，`categories` 之后、`test` 之前添加：
```typescript
    moments: {
      /** 分页查询公开碎语，支持用户/角色过滤 */
      listPublic: (req: MomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.user_id !== undefined) params.set("user_id", String(req.user_id));
        if (req.role_id !== undefined) params.set("role_id", String(req.role_id));
        const qs = params.toString();
        return fetchPublic<MomentPageResp>(`/moments${qs ? `?${qs}` : ""}`, { method: "GET" });
      },
    },
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd packages/api && pnpm test
```

Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add packages/api/src/types/moment.ts packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): 新增 moment 类型和 moments.listPublic 方法"
```

---

## Task 3: 从 packages/api 导出 moment 类型

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 在 index.ts 末尾追加导出**

```typescript
export type {
  MomentListReq,
  MomentUserResp,
  MomentMediaResp,
  MomentItemResp,
  MomentPageResp,
} from "./types/moment";
```

- [ ] **Step 2: 验证编译**

```bash
cd packages/api && pnpm tsc --noEmit
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add packages/api/src/index.ts
git commit -m "chore(api): 导出 moment 相关类型"
```

---

## Task 4: 将组件测试改用 MomentItemResp（先写失败测试）

**Files:**
- Modify: `apps/web/components/snippets/snippets-section.test.tsx`

- [ ] **Step 1: 替换 snippets-section.test.tsx 全部内容**

用以下内容完整替换该文件（原有所有测试用例保持逻辑不变，只是数据类型从 `Snippet` 换成 `MomentItemResp`）：

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SnippetsSection } from "./snippets-section";
import type { MomentItemResp } from "@repo/api";

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui（Button 组件）
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "home.snippets": "碎语",
        "snippet.expand": "展开",
        "snippet.collapse": "收起",
        "snippet.like": "喜欢",
        "snippet.comment": "评论",
        "snippet.share": "转发",
        "snippet.postNew": "发表碎语",
        "snippet.viewMore": "查看更多",
      };
      return messages[key] ?? key;
    },
  }),
}));

// 生成测试用 MomentItemResp 数据
function makeMoment(id: number, content: string, overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id,
    user_id: 1,
    content,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 10,
    comment_count: 3,
    is_liked: false,
    user: {
      id: 1,
      username: `author${id}`,
      nickname: `作者${id}`,
      mark: "博主",
      avatar_url: `https://example.com/avatar${id}.jpg`,
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

// 短内容（< 120 字符）
const SHORT_CONTENT = "这是一条短碎语，不超过120字符的限制。";

// 长内容（> 120 字符），确保触发截断（JS 字符串 length 按 UTF-16 单元计算，中文每字1单元）
const LONG_CONTENT =
  "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
  "这部分内容在默认状态下应该被隐藏，只有点击展开按钮后才能看到全部内容。" +
  "这里是更多的补充内容，确保文本足够长。继续增加内容直到超过一百二十个字符为止，包括这段额外的说明文字。";

const mockMoments: MomentItemResp[] = [makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)];

describe("SnippetsSection", () => {
  it("渲染不崩溃，显示碎语内容", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    // 区块标题
    expect(screen.getByText("碎语")).toBeTruthy();
    // 短内容完整显示
    expect(screen.getByText(SHORT_CONTENT)).toBeTruthy();
  });

  it("长内容默认截断，显示展开按钮", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const expandBtns = screen.getAllByText("展开");
    expect(expandBtns.length).toBeGreaterThan(0);
    const truncated = LONG_CONTENT.slice(0, 120) + "...";
    expect(screen.getByText(truncated)).toBeTruthy();
    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
  });

  it("点击展开后显示全部内容", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
    expect(screen.getByText("收起")).toBeTruthy();
  });

  it("点击收起后重新截断", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    const collapseBtn = screen.getByText("收起");
    await act(async () => {
      await user.click(collapseBtn);
    });

    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
    expect(screen.getAllByText("展开").length).toBeGreaterThan(0);
  });

  it("发表碎语和查看更多按钮存在", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("短内容不显示展开按钮", () => {
    render(<SnippetsSection snippets={[makeMoment(99, SHORT_CONTENT)]} />);
    expect(screen.queryByText("展开")).toBeNull();
  });

  it("显示作者名和徽章", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("作者1")).toBeTruthy();
    expect(screen.getAllByText("博主").length).toBe(mockMoments.length);
  });

  it("显示点赞和评论统计数字", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const likeLabels = screen.getAllByText("10 喜欢");
    const commentLabels = screen.getAllByText("3 评论");
    expect(likeLabels).toHaveLength(mockMoments.length);
    expect(commentLabels).toHaveLength(mockMoments.length);
  });

  it("碎语之间使用紧凑分隔线和合理内边距", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const cards = screen.getAllByTestId("snippet-card");
    expect(cards[0].className).toContain("border-b");
    expect(cards[0].className).toContain("py-3");
  });

  it("喜欢按钮点击后变为激活状态（liked）", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={[makeMoment(1, SHORT_CONTENT)]} />);

    const likeBtn = screen.getByLabelText("喜欢");
    expect(likeBtn.className).not.toContain("text-red-500");

    await act(async () => {
      await user.click(likeBtn);
    });

    expect(likeBtn.className).toContain("text-red-500");
  });

  it("snippets 为空时仍渲染区块标题和操作按钮", () => {
    render(<SnippetsSection snippets={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText("查看更多")).toBeTruthy();
  });

  it("最多只显示 3 条碎语", () => {
    const manyMoments = Array.from({ length: 6 }, (_, i) =>
      makeMoment(i + 1, `${SHORT_CONTENT} #${i + 1}`),
    );
    render(<SnippetsSection snippets={manyMoments} />);

    expect(screen.getByText(`${SHORT_CONTENT} #1`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #2`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #3`)).toBeTruthy();
    expect(screen.queryByText(`${SHORT_CONTENT} #4`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #5`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #6`)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd apps/web && pnpm test components/snippets/snippets-section.test.tsx
```

Expected: 类型错误或运行时错误（组件期望 `Snippet` 但收到 `MomentItemResp`）

---

## Task 5: 更新 snippet-card.tsx 使用 MomentItemResp

**Files:**
- Modify: `apps/web/components/snippets/snippet-card.tsx`

- [ ] **Step 1: 替换 snippet-card.tsx 全部内容**

```typescript
import type { MomentItemResp } from "@repo/api";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";
import { SnippetActions } from "./snippet-actions";

interface SnippetCardProps {
  snippet: MomentItemResp;
}

// 单条碎语，无边框，通过间距分隔（与 ArticleCard 一致）
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";

  return (
    <article
      data-testid="snippet-card"
      className="border-b border-border py-3 last:border-b-0 last:pb-0"
    >
      <div className="flex items-center gap-2">
        <img
          src={authorAvatar}
          alt={authorName}
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold text-foreground">
              {authorName}
            </span>
            {authorBadge && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                {authorBadge}
              </span>
            )}
            <time className="ml-auto shrink-0 text-[10px] text-(--fg3)">{relativeTime}</time>
          </div>
        </div>
      </div>

      <div className="pl-[27px]">
        <SnippetContent content={snippet.content} />
      </div>

      <div className="mt-1.5 flex items-center justify-between pl-[27px]">
        <div className="flex gap-3 text-[11px] text-(--fg3)">
          <span>{snippet.like_count} 喜欢</span>
          <span>{snippet.comment_count} 评论</span>
        </div>
        <SnippetActions />
      </div>
    </article>
  );
}
```

---

## Task 6: 更新 snippets-section.tsx 使用 MomentItemResp，运行测试

**Files:**
- Modify: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: 替换 snippets-section.tsx 全部内容**

```typescript
"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { MomentItemResp } from "@repo/api";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: MomentItemResp[];
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：标题 + 卡片网格 + 操作按钮
// 因为使用了 useLocale 需要标记 'use client'
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();
  const visibleSnippets = snippets.slice(0, MAX_SNIPPETS);

  return (
    <section className="rounded-[14px] border border-border bg-card p-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-(--fg3)">
        {t("home.snippets")}
      </h3>

      <div className="flex flex-col">
        {visibleSnippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("snippet.postNew")}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("snippet.viewMore")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 运行组件测试，确认全部通过**

```bash
cd apps/web && pnpm test components/snippets/snippets-section.test.tsx
```

Expected: 所有测试 PASS

- [ ] **Step 3: 提交**

```bash
git add \
  apps/web/components/snippets/snippets-section.tsx \
  apps/web/components/snippets/snippet-card.tsx \
  apps/web/components/snippets/snippets-section.test.tsx
git commit -m "refactor(web): 碎语组件 props 类型从 Snippet 迁移到 MomentItemResp"
```

---

## Task 7: 更新 page.test.tsx 以包含 moments mock（先写失败测试）

**Files:**
- Modify: `apps/web/app/page.test.tsx`

- [ ] **Step 1: 更新 page.test.tsx**

做以下三处修改：

**修改 1**：在 `homePageMockState` 的 `vi.hoisted` 中添加 `listMomentsPublic`：

将：
```typescript
const homePageMockState = vi.hoisted(() => {
  const listPublic = vi.fn();
  const listTabs = vi.fn();
  const featuredCarousel = vi.fn();

  return {
    listPublic,
    listTabs,
    featuredCarousel,
  };
});
```

替换为：
```typescript
const homePageMockState = vi.hoisted(() => {
  const listPublic = vi.fn();
  const listTabs = vi.fn();
  const featuredCarousel = vi.fn();
  const listMomentsPublic = vi.fn();

  return {
    listPublic,
    listTabs,
    featuredCarousel,
    listMomentsPublic,
  };
});
```

**修改 2**：在 `createServerApiClient` mock 中添加 `moments`：

将：
```typescript
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      listPublic: homePageMockState.listPublic,
    },
    categories: {
      listTabs: homePageMockState.listTabs,
    },
  }),
}));
```

替换为：
```typescript
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      listPublic: homePageMockState.listPublic,
    },
    categories: {
      listTabs: homePageMockState.listTabs,
    },
    moments: {
      listPublic: homePageMockState.listMomentsPublic,
    },
  }),
}));
```

**修改 3**：在 `beforeEach` 的 reset 和默认值块中添加 moments mock 初始化：

在 `homePageMockState.listTabs.mockReset()` 之后追加：
```typescript
    homePageMockState.listMomentsPublic.mockReset();
```

在 `homePageMockState.listTabs.mockResolvedValue({ list: [] });` 之后追加：
```typescript
    homePageMockState.listMomentsPublic.mockResolvedValue({
      total: 0,
      pages: 0,
      page: 1,
      page_size: 3,
      list: [],
    });
```

**修改 4**：将 `"同时请求分类、最新文章和推荐文章"` 测试替换为包含碎语请求的版本：

将：
```typescript
  it("同时请求分类、最新文章和推荐文章", async () => {
    render(await Page());

    expect(homePageMockState.listTabs).toHaveBeenCalledOnce();
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({ page: 1 });
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 5,
      recommend: true,
    });
  });
```

替换为：
```typescript
  it("同时请求分类、最新文章、推荐文章和碎语", async () => {
    render(await Page());

    expect(homePageMockState.listTabs).toHaveBeenCalledOnce();
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({ page: 1 });
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 5,
      recommend: true,
    });
    expect(homePageMockState.listMomentsPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 3,
    });
  });
```

- [ ] **Step 2: 运行页面测试，确认失败**

```bash
cd apps/web && pnpm test app/page.test.tsx
```

Expected: `TypeError: api.moments is undefined` 或类似错误（`page.tsx` 尚未调用 moments API）

---

## Task 8: 更新 page.tsx 调用真实 moments API

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: 替换 page.tsx 全部内容**

```typescript
import type { Metadata } from "next";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import type { ArticleListItemResp, ArticlePageResp, CategoryTabsResp, MomentPageResp } from "@repo/api";
import type { FeaturedPost } from "./_mock/types";
import { createServerApiClient } from "@/lib/server-api";
import { FeaturedCarousel } from "@/components/featured";
import { ArticleSection } from "@/components/articles";
import { SnippetsSection } from "@/components/snippets";
import { RecentVisitors, TagsCloud } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

const EMPTY_PAGE: ArticlePageResp = { total: 0, pages: 0, page: 1, page_size: 10, list: [] };
const EMPTY_RECOMMENDED_PAGE: ArticlePageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 5,
  list: [],
};
const EMPTY_CATEGORIES: CategoryTabsResp = { list: [] };
const EMPTY_MOMENTS: MomentPageResp = { total: 0, pages: 0, page: 1, page_size: 3, list: [] };

function toFeaturedPost(article: ArticleListItemResp): FeaturedPost | null {
  if (!article.cover_img_url) return null;

  return {
    id: String(article.id),
    title: article.title,
    excerpt: article.short_content ?? "",
    coverImage: article.cover_img_url,
    category: article.category?.name ?? "未分类",
    date: article.created_at,
    href: `/articles/${article.id}`,
  };
}

export default async function Home() {
  const api = await createServerApiClient();
  const [categoriesResp, initialPage, recommendedPage, momentsPage] = await Promise.all([
    api.categories.listTabs().catch(() => EMPTY_CATEGORIES),
    api.articles.listPublic({ page: 1 }).catch(() => EMPTY_PAGE),
    api.articles
      .listPublic({ page: 1, page_size: 5, recommend: true })
      .catch(() => EMPTY_RECOMMENDED_PAGE),
    api.moments.listPublic({ page: 1, page_size: 3 }).catch(() => EMPTY_MOMENTS),
  ]);
  const recommendedPosts = recommendedPage.list
    .map(toFeaturedPost)
    .filter((post): post is FeaturedPost => post !== null);

  return (
    <>
      <FeaturedCarousel posts={recommendedPosts} />

      <div data-testid="home-page-body" className="mx-auto max-w-[1120px] px-5 py-9 pb-20">
        <ArticleSection
          initialPage={initialPage}
          categories={categoriesResp.list}
          sidebar={
            <>
              <SnippetsSection snippets={momentsPage.list} />
              <RecentVisitors visitors={visitors} />
              <TagsCloud tags={tags} />
            </>
          }
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: 运行页面测试，确认全部通过**

```bash
cd apps/web && pnpm test app/page.test.tsx
```

Expected: 所有测试 PASS

- [ ] **Step 3: 运行全量测试，确认无回归**

```bash
pnpm test
```

Expected: 所有测试 PASS

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add apps/web/app/page.tsx apps/web/app/page.test.tsx
git commit -m "feat(web): 碎语区接入真实 API，替换 mock 数据"
```

---

## Task 9: 删除废弃文件 home-content.tsx

**Files:**
- Delete: `apps/web/app/home-content.tsx`

- [ ] **Step 1: 确认该文件未被任何模块引用**

```bash
grep -r "home-content" /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/apps/web --include="*.tsx" --include="*.ts"
```

Expected: 无输出（未被引用）

- [ ] **Step 2: 删除文件**

```bash
rm apps/web/app/home-content.tsx
```

- [ ] **Step 3: 运行全量测试，确认无回归**

```bash
pnpm test
```

Expected: 所有测试 PASS

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore(web): 删除废弃的 home-content.tsx"
```
