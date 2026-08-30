# Navbar Route Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让桌面端导航更早进入胶囊态，并为移动端首页、文章详情页、普通内页提供三种显式可追溯的导航结构。

**Architecture:** 导航场景由 `navbar-route-config.ts` 统一声明，`use-navbar-context.ts` 负责把 pathname 解析成稳定的 navbar 上下文，`NavbarMobileHeader` 专门渲染三种移动端变体。文章详情页通过一个轻量 Zustand store 把当前文章的点赞/评论数据同步给全局导航与页面内浮动操作，避免跨 layout/page 树重复维护状态。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand, TailwindCSS, `@repo/icons`, Vitest, `@testing-library/react`, `@testing-library/user-event`

---

## 文件清单

| 操作   | 路径                                                                | 说明                             |
| ------ | ------------------------------------------------------------------- | -------------------------------- |
| Create | `apps/web/components/navbar/navbar-route-config.ts`                 | 路由场景配置与纯函数匹配         |
| Create | `apps/web/components/navbar/navbar-route-config.test.ts`            | 路由匹配单测                     |
| Create | `apps/web/components/navbar/use-navbar-context.ts`                  | pathname → navbarContext         |
| Create | `apps/web/components/navbar/navbar-mobile-header.tsx`               | 三种移动端头部变体               |
| Create | `apps/web/components/navbar/navbar-mobile-header.test.tsx`          | 移动端头部单测                   |
| Create | `apps/web/store/use-active-article.ts`                              | 当前文章全局状态                 |
| Create | `apps/web/store/use-active-article.test.ts`                         | store 单测                       |
| Create | `apps/web/components/article-detail/article-navbar-sync.tsx`        | 文章页 mount/unmount 同步 store  |
| Create | `apps/web/components/article-detail/article-navbar-sync.test.tsx`   | 同步组件单测                     |
| Create | `apps/web/hooks/use-article-engagement.ts`                          | 点赞行为复用 hook                |
| Create | `apps/web/hooks/use-article-engagement.test.tsx`                    | 文章交互 hook 单测               |
| Modify | `apps/web/components/article-detail/article-float-actions.tsx`      | 改为复用共享文章状态             |
| Modify | `apps/web/components/article-detail/article-float-actions.test.tsx` | 更新点赞状态来源测试             |
| Modify | `apps/web/components/article-detail/article-comments.tsx`           | 增加评论区稳定锚点               |
| Modify | `apps/web/components/article-detail/article-comments.test.tsx`      | 覆盖锚点存在性                   |
| Modify | `apps/web/components/article-detail/index.ts`                       | 导出新组件                       |
| Modify | `apps/web/app/articles/[id]/page.tsx`                               | 接入 `ArticleNavbarSync`         |
| Modify | `apps/web/components/navbar/site-navbar.tsx`                        | 使用 context/header，阈值改 24px |
| Modify | `apps/web/components/navbar/site-navbar.test.tsx`                   | 更新阈值与三种头部行为           |
| Modify | `apps/web/components/navbar/index.ts`                               | 导出新组件/工具（如需要）        |

---

## Task 1: 建立导航场景配置与解析层

**Files:**

- Create: `apps/web/components/navbar/navbar-route-config.ts`
- Create: `apps/web/components/navbar/navbar-route-config.test.ts`
- Create: `apps/web/components/navbar/use-navbar-context.ts`

- [ ] **Step 1: 先写纯函数失败测试，锁定三种导航场景**

新建 `apps/web/components/navbar/navbar-route-config.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { matchNavbarRoute } from "./navbar-route-config";

describe("matchNavbarRoute", () => {
  it("首页命中 home", () => {
    expect(matchNavbarRoute("/")).toEqual({
      mobileVariant: "home",
      title: undefined,
    });
  });

  it("文章详情页命中 article", () => {
    expect(matchNavbarRoute("/articles/42")).toEqual({
      mobileVariant: "article",
      title: undefined,
    });
  });

  it("snippets 命中 default，并返回碎语标题", () => {
    expect(matchNavbarRoute("/snippets")).toEqual({
      mobileVariant: "default",
      title: "碎语",
    });
  });

  it("guestbook、friends、circle 命中 default", () => {
    expect(matchNavbarRoute("/guestbook")).toEqual({
      mobileVariant: "default",
      title: "留言",
    });
    expect(matchNavbarRoute("/friends")).toEqual({
      mobileVariant: "default",
      title: "友邻",
    });
    expect(matchNavbarRoute("/circle")).toEqual({
      mobileVariant: "default",
      title: "圈子",
    });
  });

  it("未显式登记的其他路径仍走 default，但 title 为空", () => {
    expect(matchNavbarRoute("/login")).toEqual({
      mobileVariant: "default",
      title: undefined,
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认因文件缺失而失败**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/navbar-route-config.test.ts
```

Expected: FAIL，提示找不到 `./navbar-route-config`。

- [ ] **Step 3: 实现路由配置纯函数**

新建 `apps/web/components/navbar/navbar-route-config.ts`：

```ts
export type NavbarMobileVariant = "home" | "article" | "default";

export interface NavbarRouteMatch {
  mobileVariant: NavbarMobileVariant;
  title?: string;
}

const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  "/snippets": "碎语",
  "/guestbook": "留言",
  "/friends": "友邻",
  "/circle": "圈子",
};

export function matchNavbarRoute(pathname: string): NavbarRouteMatch {
  if (pathname === "/") {
    return { mobileVariant: "home", title: undefined };
  }

  if (/^\/articles\/\d+$/.test(pathname)) {
    return { mobileVariant: "article", title: undefined };
  }

  return {
    mobileVariant: "default",
    title: DEFAULT_ROUTE_TITLES[pathname],
  };
}
```

- [ ] **Step 4: 补上 navbar context hook**

新建 `apps/web/components/navbar/use-navbar-context.ts`：

```ts
"use client";

import { usePathname } from "next/navigation";
import { matchNavbarRoute } from "./navbar-route-config";

export const DESKTOP_NAVBAR_SENTINEL_HEIGHT = 24;

export function useNavbarContext() {
  const pathname = usePathname();
  const route = matchNavbarRoute(pathname);

  return {
    pathname,
    title: route.title,
    mobileVariant: route.mobileVariant,
    showHomeBack: route.mobileVariant !== "home",
    showArticleActions: route.mobileVariant === "article",
    desktopCapsuleThreshold: DESKTOP_NAVBAR_SENTINEL_HEIGHT,
  };
}
```

- [ ] **Step 5: 重新运行测试，确认纯函数通过**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/navbar-route-config.test.ts
```

Expected: PASS，5 个测试全部通过。

- [ ] **Step 6: 提交这一层**

```bash
git add apps/web/components/navbar/navbar-route-config.ts \
        apps/web/components/navbar/navbar-route-config.test.ts \
        apps/web/components/navbar/use-navbar-context.ts
git commit -m "feat(web): 新增导航路由场景配置与解析层"
```

---

## Task 2: 建立文章详情页共享状态与同步桥

**Files:**

- Create: `apps/web/store/use-active-article.ts`
- Create: `apps/web/store/use-active-article.test.ts`
- Create: `apps/web/components/article-detail/article-navbar-sync.tsx`
- Create: `apps/web/components/article-detail/article-navbar-sync.test.tsx`
- Modify: `apps/web/components/article-detail/index.ts`
- Modify: `apps/web/app/articles/[id]/page.tsx`

- [ ] **Step 1: 先写 store 测试，锁定初始化、更新、清空行为**

新建 `apps/web/store/use-active-article.test.ts`：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useActiveArticle } from "./use-active-article";

describe("useActiveArticle", () => {
  beforeEach(() => {
    useActiveArticle.getState().clearArticle();
  });

  it("syncArticle 写入当前文章状态", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });
  });

  it("patchLike 只更新点赞相关字段", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: false,
    });

    useActiveArticle.getState().patchLike({
      likeCount: 13,
      isLiked: true,
    });

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 8,
      likeCount: 13,
      commentCount: 34,
      isLiked: true,
    });
  });

  it("clearArticle 清空当前文章状态", () => {
    useActiveArticle.getState().syncArticle({
      articleId: 8,
      likeCount: 12,
      commentCount: 34,
      isLiked: true,
    });

    useActiveArticle.getState().clearArticle();

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test -- --run apps/web/store/use-active-article.test.ts
```

Expected: FAIL，文件还不存在。

- [ ] **Step 3: 实现当前文章 store**

新建 `apps/web/store/use-active-article.ts`：

```ts
import { create } from "zustand";

interface SyncArticleInput {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

interface PatchLikeInput {
  likeCount: number;
  isLiked: boolean;
}

interface ActiveArticleStore {
  articleId: number | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  syncArticle: (input: SyncArticleInput) => void;
  patchLike: (input: PatchLikeInput) => void;
  clearArticle: () => void;
}

export const useActiveArticle = create<ActiveArticleStore>((set) => ({
  articleId: null,
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  syncArticle: ({ articleId, likeCount, commentCount, isLiked }) =>
    set({ articleId, likeCount, commentCount, isLiked }),
  patchLike: ({ likeCount, isLiked }) => set({ likeCount, isLiked }),
  clearArticle: () =>
    set({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    }),
}));
```

- [ ] **Step 4: 给文章页写同步桥测试**

新建 `apps/web/components/article-detail/article-navbar-sync.test.tsx`：

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ArticleNavbarSync } from "./article-navbar-sync";
import { useActiveArticle } from "@/store/use-active-article";

describe("ArticleNavbarSync", () => {
  beforeEach(() => {
    useActiveArticle.getState().clearArticle();
  });

  it("mount 时把文章信息同步到 store", () => {
    render(<ArticleNavbarSync articleId={3} likeCount={17} commentCount={21} isLiked />);

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: 3,
      likeCount: 17,
      commentCount: 21,
      isLiked: true,
    });
  });

  it("unmount 时清空 store，避免切页残留", () => {
    const { unmount } = render(
      <ArticleNavbarSync articleId={3} likeCount={17} commentCount={21} isLiked />,
    );

    unmount();

    expect(useActiveArticle.getState()).toMatchObject({
      articleId: null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    });
  });
});
```

- [ ] **Step 5: 实现同步桥并接到文章页**

新建 `apps/web/components/article-detail/article-navbar-sync.tsx`：

```tsx
"use client";

import { useEffect } from "react";
import { useActiveArticle } from "@/store/use-active-article";

interface ArticleNavbarSyncProps {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export function ArticleNavbarSync({
  articleId,
  likeCount,
  commentCount,
  isLiked,
}: ArticleNavbarSyncProps) {
  const syncArticle = useActiveArticle((state) => state.syncArticle);
  const clearArticle = useActiveArticle((state) => state.clearArticle);

  useEffect(() => {
    syncArticle({ articleId, likeCount, commentCount, isLiked });
    return () => clearArticle();
  }, [articleId, commentCount, isLiked, likeCount, clearArticle, syncArticle]);

  return null;
}
```

更新 `apps/web/components/article-detail/index.ts`：

```ts
export { ArticleNavbarSync } from "./article-navbar-sync";
```

在 `apps/web/app/articles/[id]/page.tsx` 的返回片段最上方插入：

```tsx
<ArticleNavbarSync
  articleId={article.id}
  likeCount={article.like_count}
  commentCount={article.comment_count}
  isLiked={article.is_liked ?? false}
/>
```

并补上 import：

```tsx
ArticleNavbarSync,
```

- [ ] **Step 6: 运行测试，确认 store 与同步桥都通过**

Run:

```bash
pnpm --filter web test -- --run apps/web/store/use-active-article.test.ts apps/web/components/article-detail/article-navbar-sync.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交这一层**

```bash
git add apps/web/store/use-active-article.ts \
        apps/web/store/use-active-article.test.ts \
        apps/web/components/article-detail/article-navbar-sync.tsx \
        apps/web/components/article-detail/article-navbar-sync.test.tsx \
        apps/web/components/article-detail/index.ts \
        apps/web/app/articles/[id]/page.tsx
git commit -m "feat(web): 同步当前文章状态到全局导航"
```

---

## Task 3: 抽出共享文章交互 hook，并把评论区加上稳定锚点

**Files:**

- Create: `apps/web/hooks/use-article-engagement.ts`
- Create: `apps/web/hooks/use-article-engagement.test.tsx`
- Modify: `apps/web/components/article-detail/article-float-actions.tsx`
- Modify: `apps/web/components/article-detail/article-float-actions.test.tsx`
- Modify: `apps/web/components/article-detail/article-comments.tsx`
- Modify: `apps/web/components/article-detail/article-comments.test.tsx`

- [ ] **Step 1: 先写 hook 测试，锁定未登录、成功点赞、401 登录弹窗三种行为**

新建 `apps/web/hooks/use-article-engagement.test.tsx`：

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArticleEngagement } from "./use-article-engagement";
import { useActiveArticle } from "@/store/use-active-article";

const mockOpenLoginModal = vi.fn();
const mockAddToast = vi.fn();
const mockFetch = vi.fn();
let mockUserId: number | null = null;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockUserId }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

describe("useArticleEngagement", () => {
  beforeEach(() => {
    mockUserId = null;
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    useActiveArticle.getState().clearArticle();
    useActiveArticle.getState().syncArticle({
      articleId: 7,
      likeCount: 5,
      commentCount: 9,
      isLiked: false,
    });
  });

  it("未登录点赞时打开登录弹窗，不发请求", async () => {
    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("点赞成功后更新 store 中的 likeCount 和 isLiked", async () => {
    mockUserId = 1;
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ like_count: 6, is_liked: true }), { status: 200 }),
    );

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(useActiveArticle.getState()).toMatchObject({
      likeCount: 6,
      isLiked: true,
    });
  });

  it("401 时打开登录弹窗", async () => {
    mockUserId = 1;
    mockFetch.mockResolvedValue(new Response(null, { status: 401 }));

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test -- --run apps/web/hooks/use-article-engagement.test.tsx
```

Expected: FAIL，因为 hook 文件不存在。

- [ ] **Step 3: 实现共享文章交互 hook**

新建 `apps/web/hooks/use-article-engagement.ts`：

```ts
import { useCallback, useState } from "react";
import type { ArticleLikeResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useActiveArticle } from "@/store/use-active-article";
import { addToast } from "@/lib/toast";

export function useArticleEngagement() {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const articleId = useActiveArticle((state) => state.articleId);
  const likeCount = useActiveArticle((state) => state.likeCount);
  const commentCount = useActiveArticle((state) => state.commentCount);
  const isLiked = useActiveArticle((state) => state.isLiked);
  const patchLike = useActiveArticle((state) => state.patchLike);
  const [isLiking, setIsLiking] = useState(false);

  const toggleLike = useCallback(async () => {
    if (!articleId) return;
    if (!userId) {
      openLoginModal();
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/like`, { method: "POST" });
      if (res.status === 401) {
        openLoginModal();
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data: ArticleLikeResp = await res.json();
      patchLike({ likeCount: data.like_count, isLiked: data.is_liked });
    } catch {
      addToast("点赞失败，请稍后重试", "error");
    } finally {
      setIsLiking(false);
    }
  }, [articleId, isLiking, openLoginModal, patchLike, userId]);

  return {
    articleId,
    likeCount,
    commentCount,
    isLiked,
    isLiking,
    toggleLike,
  };
}
```

- [ ] **Step 4: 让浮动操作复用这个 hook**

把 `apps/web/components/article-detail/article-float-actions.tsx` 中点赞相关 state 和 `handleLike` 替换为：

```tsx
import { useArticleEngagement } from "@/hooks/use-article-engagement";
```

并在组件内部使用：

```tsx
const { isLiked, isLiking, toggleLike } = useArticleEngagement();
```

删除以下本地状态与逻辑：

```tsx
const { userId } = useSession();
const { open: openLoginModal } = useLoginModal();
const [isLiked, setIsLiked] = useState(initialIsLiked);
const [, setLikeCount] = useState(initialLikeCount);
const [isLiking, setIsLiking] = useState(false);
```

以及整个 `handleLike` 回调。

同时把按钮点击改为：

```tsx
onClick={() => void toggleLike()}
```

把 props 收窄为：

```ts
interface ArticleFloatActionsProps {
  articleId: number;
  musicUrl?: string;
  musicName?: string;
}
```

- [ ] **Step 5: 更新浮动操作测试与评论区锚点测试**

在 `apps/web/components/article-detail/article-float-actions.test.tsx`：

- 删除对 `initialLikeCount` 和 `initialIsLiked` 的依赖
- 新增一个 `vi.mock("@/hooks/use-article-engagement", ...)`，让按钮文案和交互由 mock hook 控制

推荐替换默认 props 为：

```ts
const defaultProps = {
  articleId: 1,
  musicUrl: undefined,
  musicName: undefined,
};
```

新增 mock：

```ts
const mockToggleLike = vi.fn();
vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    articleId: 1,
    likeCount: 10,
    commentCount: 5,
    isLiked: false,
    isLiking: false,
    toggleLike: mockToggleLike,
  }),
}));
```

并把未登录测试改成：

```tsx
it("点击点赞时调用共享 toggleLike", async () => {
  render(<ArticleFloatActions {...defaultProps} />);
  await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
  expect(mockToggleLike).toHaveBeenCalledOnce();
});
```

在 `apps/web/components/article-detail/article-comments.tsx` 的 `<section>` 上增加：

```tsx
id = "article-comments";
```

并在 `article-comments.test.tsx` 增加：

```tsx
it("评论区根节点带稳定锚点 id", () => {
  const { container } = render(<ArticleComments articleId={42} commentCount={7} />);
  expect(container.querySelector("#article-comments")).toBeInTheDocument();
});
```

- [ ] **Step 6: 运行相关测试，确认全部通过**

Run:

```bash
pnpm --filter web test -- --run apps/web/hooks/use-article-engagement.test.tsx apps/web/components/article-detail/article-float-actions.test.tsx apps/web/components/article-detail/article-comments.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交这一层**

```bash
git add apps/web/hooks/use-article-engagement.ts \
        apps/web/hooks/use-article-engagement.test.tsx \
        apps/web/components/article-detail/article-float-actions.tsx \
        apps/web/components/article-detail/article-float-actions.test.tsx \
        apps/web/components/article-detail/article-comments.tsx \
        apps/web/components/article-detail/article-comments.test.tsx
git commit -m "feat(web): 共享文章点赞状态并为评论区增加稳定锚点"
```

---

## Task 4: 实现三种移动端头部变体

**Files:**

- Create: `apps/web/components/navbar/navbar-mobile-header.tsx`
- Create: `apps/web/components/navbar/navbar-mobile-header.test.tsx`
- Modify: `apps/web/components/navbar/index.ts`

- [ ] **Step 1: 先写组件测试，锁定三种变体结构**

新建 `apps/web/components/navbar/navbar-mobile-header.test.tsx`：

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileHeader } from "./navbar-mobile-header";

const mockPush = vi.fn();
const mockToggleMenu = vi.fn();
const mockToggleLike = vi.fn();
const mockScrollIntoView = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    articleId: 1,
    likeCount: 120,
    commentCount: 8,
    isLiked: true,
    isLiking: false,
    toggleLike: mockToggleLike,
  }),
}));

describe("NavbarMobileHeader", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToggleMenu.mockReset();
    mockToggleLike.mockReset();
    mockScrollIntoView.mockReset();
    document.body.innerHTML = "";
  });

  it("home 变体渲染菜单按钮，不渲染返回按钮", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="home"
        title={undefined}
        isGlass={false}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
    expect(screen.queryByLabelText("返回首页")).not.toBeInTheDocument();
  });

  it("article 变体渲染返回首页、点赞数字按钮、评论数字按钮、menu", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "点赞 99+" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "评论 8" })).toBeInTheDocument();
    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
  });

  it("default 变体渲染返回首页、标题、menu", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="碎语"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
    expect(screen.getByText("碎语")).toBeInTheDocument();
    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
  });

  it("点击返回首页调用 router.push('/')", async () => {
    const user = userEvent.setup();
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="留言"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByLabelText("返回首页"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("article 变体点击评论按钮时滚动到评论区锚点", async () => {
    const user = userEvent.setup();
    const anchor = document.createElement("section");
    anchor.id = "article-comments";
    anchor.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(anchor);

    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByRole("button", { name: "评论 8" }));
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/navbar-mobile-header.test.tsx
```

Expected: FAIL，因为组件文件还不存在。

- [ ] **Step 3: 实现组件与计数格式化逻辑**

新建 `apps/web/components/navbar/navbar-mobile-header.tsx`：

```tsx
"use client";

import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import type { NavbarMobileVariant } from "./navbar-route-config";
import { useArticleEngagement } from "@/hooks/use-article-engagement";

interface NavbarMobileHeaderProps {
  mobileVariant: NavbarMobileVariant;
  title?: string;
  isGlass: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function NavbarMobileHeader({
  mobileVariant,
  title,
  isGlass,
  menuOpen,
  onToggleMenu,
}: NavbarMobileHeaderProps) {
  const router = useRouter();
  const { likeCount, commentCount, isLiked, isLiking, toggleLike } = useArticleEngagement();

  const menuButton = (
    <button
      type="button"
      onClick={onToggleMenu}
      aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
      className={cn(
        "flex h-[34px] w-[34px] cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[9px] p-[9px] text-foreground transition-colors",
        isGlass ? "bg-primary/10 text-primary" : "bg-foreground/5",
      )}
    >
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-transform",
          menuOpen && "translate-y-[6.5px] rotate-45",
        )}
      />
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-[opacity,transform]",
          menuOpen && "scale-x-0 opacity-0",
        )}
      />
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-transform",
          menuOpen && "-translate-y-[6.5px] -rotate-45",
        )}
      />
    </button>
  );

  if (mobileVariant === "home") {
    return (
      <div className="flex min-h-[52px] items-center justify-between px-4 md:hidden">
        <NavbarLogo isGlass={isGlass} />
        {menuButton}
      </div>
    );
  }

  const actionButtonClass =
    "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/5";

  return (
    <div className="flex min-h-[52px] items-center justify-between gap-2 px-4 md:hidden">
      <button
        type="button"
        aria-label="返回首页"
        onClick={() => router.push("/")}
        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5"
      >
        <SvgIcon name="chevron-left" size={18} />
      </button>

      <div className="min-w-0 flex-1 text-center">
        {mobileVariant === "default" ? (
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {mobileVariant === "article" ? (
          <>
            <button
              type="button"
              aria-label={`点赞 ${formatCount(likeCount)}`}
              disabled={isLiking}
              onClick={() => void toggleLike()}
              className={cn(actionButtonClass, isLiked && "text-primary")}
            >
              <SvgIcon name="heart" size={16} />
              <span>{formatCount(likeCount)}</span>
            </button>
            <button
              type="button"
              aria-label={`评论 ${formatCount(commentCount)}`}
              onClick={() => {
                document.getElementById("article-comments")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={actionButtonClass}
            >
              <SvgIcon name="message-circle" size={16} />
              <span>{formatCount(commentCount)}</span>
            </button>
          </>
        ) : null}

        {menuButton}
      </div>
    </div>
  );
}
```

并在 `apps/web/components/navbar/index.ts` 导出：

```ts
export { NavbarMobileHeader } from "./navbar-mobile-header";
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/navbar-mobile-header.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交这一层**

```bash
git add apps/web/components/navbar/navbar-mobile-header.tsx \
        apps/web/components/navbar/navbar-mobile-header.test.tsx \
        apps/web/components/navbar/index.ts
git commit -m "feat(web): 新增三种移动端导航头部变体"
```

---

## Task 5: 接线 SiteNavbar，切换到新头部并把桌面阈值改为 24px

**Files:**

- Modify: `apps/web/components/navbar/site-navbar.tsx`
- Modify: `apps/web/components/navbar/site-navbar.test.tsx`

- [ ] **Step 1: 先改测试，锁定新的阈值和文章/普通页行为**

在 `apps/web/components/navbar/site-navbar.test.tsx` 中新增三组断言：

1. 把哨兵 class 从 `h-[60px]` 改为检查 inline style：

```tsx
it("顶部滚动哨兵默认高度为 24px", () => {
  render(<SiteNavbar />);
  const sentinel = document.querySelector('div[aria-hidden="true"]') as HTMLElement;
  expect(sentinel.style.height).toBe("24px");
});
```

2. 验证文章详情页使用文章变体：

```tsx
it("文章详情页移动端头部显示返回首页、点赞、评论、menu", () => {
  mockPathname.mockReturnValue("/articles/18");
  render(<SiteNavbar />);
  expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /点赞/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /评论/ })).toBeInTheDocument();
});
```

3. 验证普通页使用标题变体：

```tsx
it("普通内页移动端头部显示返回首页、标题、menu", () => {
  mockPathname.mockReturnValue("/snippets");
  render(<SiteNavbar />);
  expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
  expect(screen.getAllByText("碎语").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/site-navbar.test.tsx
```

Expected: FAIL，因为当前 `SiteNavbar` 仍然内联旧移动端结构，哨兵高度还是 `60px`。

- [ ] **Step 3: 修改 SiteNavbar**

更新 import：

```tsx
import { NavbarMobileHeader } from "./navbar-mobile-header";
import { useNavbarContext } from "./use-navbar-context";
```

在组件顶部拿到上下文：

```tsx
const navbarContext = useNavbarContext();
```

把哨兵改成固定 `24px`：

```tsx
<div
  ref={sentinelRef}
  aria-hidden
  className="pointer-events-none absolute left-0 top-0 w-px"
  style={{ height: `${navbarContext.desktopCapsuleThreshold}px` }}
/>
```

把原本移动端这段：

```tsx
<div className="flex min-h-[52px] items-center justify-between px-4 md:min-h-0 md:px-4 md:py-[9px]">
  <NavbarLogo isGlass={isGlass} />
  ...
  <button ...>...</button>
</div>
```

调整为桌面与移动分层：

```tsx
<NavbarMobileHeader
  mobileVariant={navbarContext.mobileVariant}
  title={navbarContext.title}
  isGlass={isGlass}
  menuOpen={menuOpen}
  onToggleMenu={() => setMenuOpen((open) => !open)}
/>

<div className="hidden min-h-0 items-center justify-between px-4 py-[9px] md:flex">
  <NavbarLogo isGlass={isGlass} />

  <div className="absolute left-1/2 -translate-x-1/2">
    <NavbarLinks isGlass={isGlass} />
  </div>

  <div className="items-center gap-1">
    <NavbarActions isGlass={isGlass} />
  </div>
</div>
```

保留：

```tsx
<NavbarMobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
```

- [ ] **Step 4: 运行 Navbar 测试，确认通过**

Run:

```bash
pnpm --filter web test -- --run apps/web/components/navbar/site-navbar.test.tsx apps/web/components/navbar/navbar-route-config.test.ts apps/web/components/navbar/navbar-mobile-header.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 运行本次改动的回归验证**

Run:

```bash
pnpm --filter web test -- --run \
  apps/web/components/navbar/site-navbar.test.tsx \
  apps/web/components/navbar/navbar-mobile-menu.test.tsx \
  apps/web/components/navbar/navbar-links.test.tsx \
  apps/web/components/article-detail/article-float-actions.test.tsx \
  apps/web/components/article-detail/article-comments.test.tsx \
  apps/web/hooks/use-article-engagement.test.tsx \
  apps/web/store/use-active-article.test.ts \
  apps/web/components/article-detail/article-navbar-sync.test.tsx
pnpm --filter web check-types
pnpm --filter web lint
```

Expected:

- 所有 Vitest 测试 PASS
- `tsc --noEmit` PASS
- `eslint . --max-warnings 0` PASS

- [ ] **Step 6: 提交最终实现**

```bash
git add apps/web/components/navbar/site-navbar.tsx \
        apps/web/components/navbar/site-navbar.test.tsx \
        apps/web/components/navbar/navbar-mobile-menu.test.tsx \
        apps/web/components/navbar/navbar-links.test.tsx \
        apps/web/components/navbar/navbar-route-config.ts \
        apps/web/components/navbar/navbar-route-config.test.ts \
        apps/web/components/navbar/use-navbar-context.ts \
        apps/web/components/navbar/navbar-mobile-header.tsx \
        apps/web/components/navbar/navbar-mobile-header.test.tsx \
        apps/web/store/use-active-article.ts \
        apps/web/store/use-active-article.test.ts \
        apps/web/components/article-detail/article-navbar-sync.tsx \
        apps/web/components/article-detail/article-navbar-sync.test.tsx \
        apps/web/hooks/use-article-engagement.ts \
        apps/web/hooks/use-article-engagement.test.tsx \
        apps/web/components/article-detail/article-float-actions.tsx \
        apps/web/components/article-detail/article-float-actions.test.tsx \
        apps/web/components/article-detail/article-comments.tsx \
        apps/web/components/article-detail/article-comments.test.tsx \
        apps/web/components/article-detail/index.ts \
        apps/web/app/articles/[id]/page.tsx \
        apps/web/components/navbar/index.ts
git commit -m "feat(web): 新增按路由切换的移动端导航变体"
```

---

## 自检结论

- **Spec coverage:** 已覆盖桌面 24px 阈值、三种移动端变体、显式路由配置表、文章页点赞/评论按钮、评论区锚点、测试边界。
- **Placeholder scan:** 计划中没有 `TODO`、`TBD`、"自行处理" 之类空描述；每个任务都给出了具体文件、测试和命令。
- **Type consistency:** `mobileVariant`、`ArticleNavbarSync`、`useActiveArticle`、`useArticleEngagement` 的命名在各任务中保持一致。

---

Plan complete and saved to `docs/superpowers/plans/2026-06-06-navbar-route-variants.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
