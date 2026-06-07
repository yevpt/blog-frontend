# 碎语模块 UI 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页侧边栏碎语模块从简单的 border-bottom 分隔布局升级为现代卡片堆叠风格，支持图片展示，复用文章卡片的点赞/评论按钮样式。

**Architecture:** 保持现有组件结构（SnippetsSection → SnippetCard → SnippetContent），重新设计 SnippetCard 的内部布局（双行 header + 图片网格 + ArticleCardStats 风格操作区），重新设计 SnippetsSection 的容器样式（渐变图标 header + shuffle 按钮 + 渐变 CTA 按钮）。新增 shuffle 图标到 icons 包。删除 SnippetActions 组件。

**Tech Stack:** React, Tailwind CSS v4, Next.js, @repo/ui (Button), @repo/icons (SvgIcon), @repo/hooks (useLocale), Vitest + Testing Library

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/icons/src/generated/types.ts` | 新增 `"shuffle"` 到 IconName 联合类型 |
| Modify | `packages/icons/src/generated/sprite.ts` | 新增 shuffle SVG symbol |
| Rewrite | `apps/web/components/snippets/snippet-card.tsx` | 卡片堆叠布局：双行 header + 图片网格 + ArticleCardStats 风格按钮 |
| Modify | `apps/web/components/snippets/snippets-section.tsx` | 新 section header（渐变图标 + shuffle 按钮）+ 新底部 CTA |
| Modify | `apps/web/components/snippets/snippet-content.tsx` | 微调间距适配新卡片 |
| Delete | `apps/web/components/snippets/snippet-actions.tsx` | 被 ArticleCardStats 风格替代 |
| Modify | `apps/web/components/snippets/index.ts` | 移除 SnippetActions 导出（如有） |
| Modify | `apps/web/app/snippets/page.tsx` | 独立页面适配新卡片样式 |
| Rewrite | `apps/web/components/snippets/snippet-card.test.tsx` | 适配新卡片结构 |
| Rewrite | `apps/web/components/snippets/snippets-section.test.tsx` | 适配新 section 结构 |

---

### Task 1: 新增 shuffle 图标

**Files:**
- Modify: `packages/icons/src/generated/types.ts`
- Modify: `packages/icons/src/generated/sprite.ts`

- [ ] **Step 1: 更新 IconName 类型**

在 `packages/icons/src/generated/types.ts` 的联合类型中添加 `"shuffle"`：

```ts
// 此文件由 scripts/build.mjs 自动生成，请勿手动修改
export type IconName =
  | "arrow-back"
  | "arrow-forward"
  | "arrow-up-right"
  | "arrow-up"
  | "at"
  | "baidu"
  | "bell"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "code-block"
  | "dots-vertical"
  | "droplet-filled"
  | "eye-off"
  | "eye"
  | "gitee"
  | "github"
  | "google"
  | "heart-fill"
  | "heart"
  | "help-circle"
  | "home"
  | "image"
  | "info-circle"
  | "link"
  | "log-out"
  | "logo-frequencii-dark"
  | "logo-frequencii-light"
  | "menu"
  | "message-circle"
  | "monitor"
  | "moon"
  | "music"
  | "plus"
  | "qq"
  | "search"
  | "share"
  | "shuffle"
  | "sun"
  | "tag"
  | "user"
  | "wechat"
  | "weibo";
```

- [ ] **Step 2: 在 sprite.ts 中添加 shuffle symbol**

在 `packages/icons/src/generated/sprite.ts` 的 `SPRITE_CONTENT` 字符串中，`icon-share` symbol 之后、`icon-sun` symbol 之前，插入：

```
<symbol id="icon-shuffle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n    <polyline points="16 3 21 3 21 8"/>\n    <line x1="4" y1="20" x2="21" y2="3"/>\n    <polyline points="21 16 21 21 16 21"/>\n    <line x1="15" y1="15" x2="21" y2="21"/>\n    <line x1="4" y1="4" x2="9" y2="9"/>\n  </symbol>
```

即在 `</symbol>` (icon-share 的结束) 和 `<symbol id="icon-sun"` 之间插入上述字符串。注意保持与现有 symbol 相同的格式（`\n` 换行 + 缩进）。

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx tsc --noEmit -p packages/icons/tsconfig.json 2>&1 | head -20`
Expected: 无错误输出

- [ ] **Step 4: Commit**

```bash
git add packages/icons/src/generated/types.ts packages/icons/src/generated/sprite.ts
git commit -m "feat(icons): 添加 shuffle 图标"
```

---

### Task 2: 重写 SnippetCard

**Files:**
- Rewrite: `apps/web/components/snippets/snippet-card.tsx`
- Delete: `apps/web/components/snippets/snippet-actions.tsx`

- [ ] **Step 1: 删除 snippet-actions.tsx**

```bash
git rm apps/web/components/snippets/snippet-actions.tsx
```

- [ ] **Step 2: 重写 snippet-card.tsx**

完整替换 `apps/web/components/snippets/snippet-card.tsx`：

```tsx
import type { MomentItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";

interface SnippetCardProps {
  snippet: MomentItemResp;
}

/**
 * 格式化数字：>= 1000 时显示带 k 后缀的简写，否则直接显示。
 * 与 ArticleCardStats 保持一致。
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(count);
}

// 单条碎语卡片：独立圆角卡片，双行 header + 图片网格 + ArticleCardStats 风格操作区
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";

  const images = snippet.images ?? [];
  const visibleImages = images.slice(0, 2);
  const hiddenCount = Math.max(0, images.length - 2);

  return (
    <article
      data-testid="snippet-card"
      className="rounded-[14px] border border-border/60 bg-[#fafafa] p-3.5 transition-[border-color,box-shadow] hover:border-primary/15 hover:shadow-[0_2px_8px_rgba(124,58,237,0.06)] dark:bg-[#1f1f23] dark:hover:border-primary/20"
    >
      {/* Header: 双行布局 */}
      <div className="mb-2.5 flex items-center gap-2.5">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-9 w-9 shrink-0 rounded-full object-cover shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.2)]">
            {authorName.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{authorName}</span>
            {authorBadge && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary dark:bg-primary/15">
                {authorBadge}
              </span>
            )}
            <time className="ml-auto shrink-0 text-[11px] text-(--fg3)">{relativeTime}</time>
          </div>
        </div>
      </div>

      {/* 正文 */}
      <SnippetContent content={snippet.content} />

      {/* 图片网格 */}
      {visibleImages.length > 0 && (
        <div
          className={`mt-2.5 grid gap-1 overflow-hidden rounded-[10px] ${
            visibleImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {visibleImages.map((img) => (
            <img
              key={img.id}
              src={img.access_url}
              alt={img.name}
              className="h-[90px] w-full object-cover"
            />
          ))}
          {hiddenCount > 0 && (
            <div className="flex items-center justify-center bg-muted text-xs text-(--fg3)">
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      {/* 操作区：复用 ArticleCardStats 样式 */}
      <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-border/40 pt-2 text-xs text-(--fg3)">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="喜欢"
          aria-pressed={snippet.is_liked}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary ${
            snippet.is_liked ? "text-red-500 hover:text-red-500" : "text-black/54 dark:text-(--fg3)"
          }`}
        >
          <span className="inline-flex animate-[heartbeat_3s_ease-in-out_infinite]">
            <SvgIcon name={snippet.is_liked ? "heart-fill" : "heart"} size={18} />
          </span>
          <span>{formatCount(snippet.like_count)}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="评论"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-black/54 transition-colors hover:bg-primary/10 hover:text-primary dark:text-(--fg3)"
        >
          <SvgIcon name="message-circle" size={18} />
          <span>{formatCount(snippet.comment_count)}</span>
        </Button>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: 微调 snippet-content.tsx 间距**

在 `apps/web/components/snippets/snippet-content.tsx` 中，将外层 `div` 的 `className` 从 `"mt-1"` 改为 `"mt-0.5"`，适配新卡片的内边距：

```tsx
// 原文:
<div className="mt-1">
// 改为:
<div className="mt-0.5">
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30`
Expected: 无错误（可能有 test 文件的类型错误，Task 4 会修复）

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(snippets): 重写 SnippetCard 为卡片堆叠布局"
```

---

### Task 3: 重写 SnippetsSection

**Files:**
- Rewrite: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: 重写 snippets-section.tsx**

完整替换 `apps/web/components/snippets/snippets-section.tsx`：

```tsx
"use client";

import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { MomentItemResp } from "@repo/api";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: MomentItemResp[];
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：渐变图标 header + 卡片堆叠 + 渐变 CTA 按钮
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();
  const visibleSnippets = snippets.slice(0, MAX_SNIPPETS);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary/80 text-[13px] text-primary-foreground">
            ✦
          </div>
          <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">
            {t("home.snippets")}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="随机换一批"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] border border-border p-0 text-(--fg3) transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <SvgIcon name="shuffle" size={16} />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        {visibleSnippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="flex gap-2 border-t border-border/40 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-xs font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.25)] hover:opacity-90 border-none"
        >
          {t("snippet.postNew")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 flex-1 rounded-xl border border-border/60 text-xs font-medium text-(--fg2) hover:border-primary/30 hover:text-primary"
        >
          {t("snippet.viewMore")} →
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30`
Expected: 无错误（test 文件可能有错误，Task 4 修复）

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(snippets): 重写 SnippetsSection 容器布局"
```

---

### Task 4: 更新测试

**Files:**
- Rewrite: `apps/web/components/snippets/snippet-card.test.tsx`
- Rewrite: `apps/web/components/snippets/snippets-section.test.tsx`

- [ ] **Step 1: 重写 snippet-card.test.tsx**

完整替换 `apps/web/components/snippets/snippet-card.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SnippetCard } from "./snippet-card";
import type { MomentItemResp } from "@repo/api";

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui Button
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
    onPress,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "这是测试内容",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 5,
    comment_count: 2,
    is_liked: false,
    user: {
      id: 1,
      username: "testuser",
      nickname: "测试用户",
      mark: "博主",
      avatar_url: "https://example.com/avatar.jpg",
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

describe("SnippetCard", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<SnippetCard snippet={makeMoment()} />)).not.toThrow();
  });

  it("显示 nickname 作为作者名（优先于 username）", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("测试用户")).toBeTruthy();
    expect(screen.queryByText("testuser")).toBeNull();
  });

  it("没有 nickname 时显示 username", () => {
    render(<SnippetCard snippet={makeMoment({ user: { id: 1, username: "testuser" } })} />);
    expect(screen.getByText("testuser")).toBeTruthy();
  });

  it('没有 user 时显示"匿名"', () => {
    render(<SnippetCard snippet={makeMoment({ user: undefined })} />);
    expect(screen.getByText("匿名")).toBeTruthy();
  });

  it("有 avatar_url 时渲染 img 标签", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
  });

  it("没有 avatar_url 时渲染首字母 fallback", () => {
    render(
      <SnippetCard
        snippet={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("测")).toBeTruthy();
  });

  it("显示 mark 作为徽章", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("博主")).toBeTruthy();
  });

  it("没有 mark 时不显示徽章", () => {
    render(
      <SnippetCard
        snippet={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByText("博主")).toBeNull();
  });

  it("显示点赞和评论数字（ArticleCardStats 风格）", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("渲染正确的 data-testid", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByTestId("snippet-card")).toBeTruthy();
  });

  it("有图片时渲染图片网格", () => {
    const snippet = makeMoment({
      images: [
        { id: 1, name: "photo1", file_type: "image/jpeg", url: "/1.jpg", access_url: "/1.jpg", size: 1000, seq: 1 },
        { id: 2, name: "photo2", file_type: "image/jpeg", url: "/2.jpg", access_url: "/2.jpg", size: 2000, seq: 2 },
      ],
    });
    render(<SnippetCard snippet={snippet} />);
    const images = screen.getAllByRole("img").filter((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    expect(images.length).toBe(2);
  });

  it("无图片时不渲染图片网格", () => {
    render(<SnippetCard snippet={makeMoment({ images: [] })} />);
    // 只有头像可能是 img，不应有图片网格中的 img
    const allImgs = screen.queryAllByRole("img");
    // 头像 img 最多 1 个
    expect(allImgs.length).toBeLessThanOrEqual(1);
  });

  it("已点赞时显示 heart-fill 图标", () => {
    render(<SnippetCard snippet={makeMoment({ is_liked: true })} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("未点赞时显示 heart 图标", () => {
    render(<SnippetCard snippet={makeMoment({ is_liked: false })} />);
    expect(screen.getByTestId("icon-heart")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 重写 snippets-section.test.tsx**

完整替换 `apps/web/components/snippets/snippets-section.test.tsx`：

```tsx
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
    onPress,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} onClick={onPress} {...props}>
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

function makeMoment(
  id: number,
  content: string,
  overrides: Partial<MomentItemResp> = {},
): MomentItemResp {
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

const SHORT_CONTENT = "这是一条短碎语，不超过120字符的限制。";

const LONG_CONTENT =
  "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
  "这部分内容在默认状态下应该被隐藏，只有点击展开按钮后才能看到全部内容。" +
  "这里是更多的补充内容，确保文本足够长。继续增加内容直到超过一百二十个字符为止，包括这段额外的说明文字。";

const mockMoments: MomentItemResp[] = [makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)];

describe("SnippetsSection", () => {
  it("渲染不崩溃，显示碎语内容", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("碎语")).toBeTruthy();
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
    expect(screen.getByText((content) => content.includes("查看更多"))).toBeTruthy();
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
    const likeLabels = screen.getAllByText("10");
    const commentLabels = screen.getAllByText("3");
    expect(likeLabels).toHaveLength(mockMoments.length);
    expect(commentLabels).toHaveLength(mockMoments.length);
  });

  it("渲染 shuffle 图标按钮", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByTestId("icon-shuffle")).toBeTruthy();
  });

  it("渲染渐变 header 图标", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("✦")).toBeTruthy();
  });

  it("snippets 为空时仍渲染区块标题和操作按钮", () => {
    render(<SnippetsSection snippets={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText((content) => content.includes("查看更多"))).toBeTruthy();
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

- [ ] **Step 3: 运行测试**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx vitest run apps/web/components/snippets/ --reporter=verbose 2>&1`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(snippets): 更新碎语模块测试适配新 UI"
```

---

### Task 5: 更新碎语独立页面

**Files:**
- Modify: `apps/web/app/snippets/page.tsx`

- [ ] **Step 1: 更新 snippets/page.tsx**

完整替换 `apps/web/app/snippets/page.tsx`：

```tsx
import type { Metadata } from "next";
import type { MomentPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { SnippetCard } from "@/components/snippets/snippet-card";

export const metadata: Metadata = {
  title: "碎语 | Yevpt's Blog",
  description: "生活、思考与随笔的碎碎念",
};

const EMPTY_MOMENTS: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 20,
  list: [],
};

export default async function SnippetsPage() {
  const api = await createServerApiClient();
  const momentsPage = await api.moments
    .listPublic({ page: 1, page_size: 20, user_id: Number(process.env.BLOG_USER_ID) })
    .catch(() => EMPTY_MOMENTS);

  return (
    <div className="mx-auto max-w-[640px] px-5 pb-20 pt-16 md:pt-24">
      <h1 className="mb-6 text-2xl font-bold">碎语</h1>
      <div className="flex flex-col gap-2.5">
        {momentsPage.list.length > 0 ? (
          momentsPage.list.map((snippet) => <SnippetCard key={snippet.id} snippet={snippet} />)
        ) : (
          <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-(--fg3)">
            暂无碎语
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/snippets/page.tsx
git commit -m "feat(snippets): 碎语独立页面适配新卡片样式"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 运行完整测试套件**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx vitest run --reporter=verbose 2>&1 | tail -40`
Expected: 所有测试通过，无 regression

- [ ] **Step 2: TypeScript 全量类型检查**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: 检查是否有残留引用 snippet-actions 的文件**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && grep -r "snippet-actions" --include="*.ts" --include="*.tsx" apps/ packages/ 2>&1`
Expected: 无结果（或仅 test mock 中的引用）

- [ ] **Step 4: 验证 dev server 正常启动**

Run: `cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend && npx next build --no-lint 2>&1 | tail -20`
Expected: build 成功，无错误
