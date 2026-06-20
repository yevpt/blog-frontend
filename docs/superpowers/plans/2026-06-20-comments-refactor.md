# 评论模块重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/web/components/comments/` 按职责分层，拆分 modal/inline 两套视图，逻辑与 UI 彻底分离，行为零变更。

**Architecture:** 逻辑层（`useCommentSectionState`）保持单一来源，被两个独立视图组件 `InlineComments` / `ModalComments` 复用；modal 专属滚动机制下沉到 `useCommentScroll`；展示组件归入 `parts/`、输入组件归入 `inputs/`、视图归入 `views/`、hook 归入 `hooks/`。删除 `comment-section.tsx` 及其 `layout` 分支。

**Tech Stack:** React + TypeScript + TailwindCSS + Zustand；测试 Vitest + Testing Library（jsdom，文件头需 `// @vitest-environment jsdom`）。

**约定：** 路径别名 `@/` → `apps/web/`。所有命令在 repo 根目录执行。每个任务结束时全量测试须绿：`pnpm --filter web test`。提交遵循 `git-commit` 规范（`commit-msg` 钩子强校验）。移动文件用 `git mv` 保留历史。

---

## 目标结构（终态）

```
comments/
  index.ts
  views/    inline-comments.tsx  modal-comments.tsx  comment-modal.tsx
  parts/    comment-list.tsx  comment-item.tsx  thread-comment-item.tsx  comment-replies.tsx  comment-skeleton.tsx
  inputs/   pill-comment-input.tsx  rich-comment-input.tsx  reply-banner.tsx
  hooks/    use-comment-section-state.ts  use-comment-scroll.ts
```

---

## Task 1: 展示组件归入 parts/

**Files:**
- Move: `comment-item.tsx`(+`.test.tsx`)、`thread-comment-item.tsx`(+`.test.tsx`)、`comment-replies.tsx`(+`.test.tsx`)、`comment-skeleton.tsx`(+`.test.tsx`) → `components/comments/parts/`
- Move+Rename: `comment-list-view.tsx` → `components/comments/parts/comment-list.tsx`
- Modify 引用：`index.ts`、`comment-section.tsx`、`comment-section.test.tsx`、`hooks/use-comment-section-state.ts`、`hooks/use-comment-section-state.test.ts`、guestbook 5 处

- [ ] **Step 1: 移动文件（git mv）**

```bash
cd apps/web/components/comments
mkdir -p parts
git mv comment-item.tsx comment-item.test.tsx parts/
git mv thread-comment-item.tsx thread-comment-item.test.tsx parts/
git mv comment-replies.tsx comment-replies.test.tsx parts/
git mv comment-skeleton.tsx comment-skeleton.test.tsx parts/
git mv comment-list-view.tsx parts/comment-list.tsx
```

- [ ] **Step 2: 重命名 comment-list 导出**

在 `parts/comment-list.tsx` 中：`CommentListViewProps`→`CommentListProps`，`export function CommentListView`→`export function CommentList`。内部 `./comment-item`、`./comment-skeleton` 相对引用保持不变（同目录）。

- [ ] **Step 3: 修复 comment-replies 测试中的源码路径断言**

`parts/comment-replies.test.tsx` 中 `webSourcePath("components/comments/comment-replies.tsx")` → `webSourcePath("components/comments/parts/comment-replies.tsx")`。

- [ ] **Step 4: 更新 index.ts**

```ts
export { CommentModal } from "./comment-modal";
export { CommentSection } from "./comment-section";
export { CommentReplies } from "./parts/comment-replies";
export { CommentItemSkeleton, CommentListSkeleton } from "./parts/comment-skeleton";
```

- [ ] **Step 5: 更新 comment-section.tsx 临时引用**

```ts
import { CommentListView } from "./comment-list-view";   // 删除
import { CommentList } from "./parts/comment-list";       // 新增
```
并把 JSX 中 `<CommentListView ... />` 改为 `<CommentList ... />`。（comment-section 将在 Task 4 删除，此处仅为保持绿灯。）

- [ ] **Step 6: 更新 comment-section.test.tsx 的 mock 路径**

`vi.mock("./comment-replies")`→`vi.mock("./parts/comment-replies")`；`vi.mock("./comment-item")`→`vi.mock("./parts/comment-item")`；`vi.mock("./comment-skeleton")`→`vi.mock("./parts/comment-skeleton")`。

- [ ] **Step 7: 更新逻辑 hook 的类型引用**

`hooks/use-comment-section-state.ts` 与 `hooks/use-comment-section-state.test.ts` 中 `@/components/comments/comment-item` → `@/components/comments/parts/comment-item`。

- [ ] **Step 8: 更新 guestbook 引用**

`components/guestbook/` 下：`guestbook-list.tsx`、`guestbook-input-bar.tsx`、`guestbook-item.tsx`、`guestbook-page.tsx`、`index.ts` 中 `@/components/comments/comment-replies` → `@/components/comments/parts/comment-replies`；`guestbook-item.tsx` 的 `@/components/comments/thread-comment-item` → `@/components/comments/parts/thread-comment-item`。

- [ ] **Step 9: 跑测试 + 类型**

Run: `pnpm --filter web test && pnpm --filter web check-types`
Expected: PASS（全绿，无类型错误）

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "refactor(comments): 展示组件归入 parts 目录"
```

---

## Task 2: 输入组件归入 inputs/，抽出 ReplyBanner

**Files:**
- Move+Rename: `comment-input.tsx`(+`.test.tsx`) → `inputs/pill-comment-input.tsx`（导出名 `PillCommentInput`）
- Move: `rich-comment-input.tsx`(+`.test.tsx`) → `inputs/`
- Create: `inputs/reply-banner.tsx`、`inputs/reply-banner.test.tsx`
- Modify: `comment-section.tsx`、`comment-section.test.tsx`、`guestbook-input-bar.tsx`、`guestbook-input-bar.test.tsx`

- [ ] **Step 1: 为 ReplyBanner 写失败测试**

`inputs/reply-banner.test.tsx`：

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplyBanner } from "./reply-banner";

vi.mock("@repo/ui", () => ({
  Button: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <button type="button" onClick={onPress}>{children}</button>
  ),
}));

describe("ReplyBanner", () => {
  it("展示被回复的用户名", () => {
    render(<ReplyBanner toUsername="alice" onCancel={() => {}} />);
    expect(screen.getByText("@alice")).toBeTruthy();
  });

  it("点击取消触发 onCancel", () => {
    const onCancel = vi.fn();
    render(<ReplyBanner toUsername="alice" onCancel={onCancel} />);
    screen.getByText("取消").click();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test reply-banner`
Expected: FAIL（找不到 `./reply-banner`）

- [ ] **Step 3: 实现 ReplyBanner**

`inputs/reply-banner.tsx`：

```tsx
"use client";

import { Button } from "@repo/ui";

interface ReplyBannerProps {
  toUsername: string;
  onCancel?: () => void;
}

/** 「正在回复 @xx 取消」提示条，pill 与 inline 输入共用 */
export function ReplyBanner({ toUsername, onCancel }: ReplyBannerProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-(--fg3)">正在回复</span>
      <span className="font-semibold text-primary">@{toUsername}</span>
      <Button
        type="button"
        variant="ghost"
        onPress={onCancel}
        className="h-auto p-0 text-[11px] text-(--fg3) hover:text-foreground"
      >
        取消
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test reply-banner`
Expected: PASS

- [ ] **Step 5: 移动输入组件**

```bash
cd apps/web/components/comments
mkdir -p inputs && git mv inputs/reply-banner.tsx inputs/reply-banner.test.tsx inputs/ 2>/dev/null || true
git mv comment-input.tsx inputs/pill-comment-input.tsx
git mv comment-input.test.tsx inputs/pill-comment-input.test.tsx
git mv rich-comment-input.tsx rich-comment-input.test.tsx inputs/
```
（注：Step 1/3 已直接在 `inputs/` 下创建 reply-banner，则上面首行的容错 mv 无操作。）

- [ ] **Step 6: 改造 pill-comment-input.tsx**

- 导出名 `CommentInput` → `PillCommentInput`。
- 类型引用 `./comment-item` → `../parts/comment-item`。
- 新增 `import { ReplyBanner } from "./reply-banner";`
- 用 `ReplyBanner` 替换内联回复提示块（原 `replyTarget && (<div className="flex items-center gap-2 text-xs">...取消...</div>)`）：

```tsx
{replyTarget && <ReplyBanner toUsername={replyTarget.toUsername} onCancel={onCancelReply} />}
```

- 删除不再使用的 `import { Button } from "@repo/ui";`（pill 内发送/登录按钮均为原生 `<button>`，Button 仅曾用于回复提示）。

- [ ] **Step 7: 更新 pill-comment-input.test.tsx**

导入 `import { PillCommentInput } from "./pill-comment-input";`，并将文件内 `CommentInput` 用例替换为 `PillCommentInput`。若其中断言取消按钮，确认仍可通过（ReplyBanner 文案「取消」不变）。

- [ ] **Step 8: 更新 comment-section.tsx 临时引用**

```ts
import { CommentInput } from "./comment-input";          // 删除
import { RichCommentInput } from "./rich-comment-input"; // 删除
import { PillCommentInput } from "./inputs/pill-comment-input";  // 新增
import { RichCommentInput } from "./inputs/rich-comment-input";  // 新增
```
将 JSX 中 `<CommentInput ... />` 改为 `<PillCommentInput ... />`。

- [ ] **Step 9: 更新 comment-section.test.tsx 与 guestbook**

- `comment-section.test.tsx`：若有针对输入的断言依赖文案，确认不受影响（pill 文案未变）。
- `guestbook-input-bar.tsx`：`@/components/comments/rich-comment-input` → `@/components/comments/inputs/rich-comment-input`。
- `guestbook-input-bar.test.tsx`：`vi.mock("@/components/comments/rich-comment-input")` → `vi.mock("@/components/comments/inputs/rich-comment-input")`。

- [ ] **Step 10: 跑测试 + 类型**

Run: `pnpm --filter web test && pnpm --filter web check-types`
Expected: PASS

- [ ] **Step 11: 提交**

```bash
git add -A
git commit -m "refactor(comments): 输入组件归入 inputs 并抽出 ReplyBanner"
```

---

## Task 3: 逻辑 hook 归入 hooks/，抽出 useCommentScroll

**Files:**
- Move: `apps/web/hooks/use-comment-section-state.ts`(+`.test.ts`) → `components/comments/hooks/`
- Create: `hooks/use-comment-scroll.ts`、`hooks/use-comment-scroll.test.ts`
- Modify: `comment-section.tsx`（改引用 + 移除内联滚动逻辑，改用 hook）

- [ ] **Step 1: 移动逻辑 hook**

```bash
cd apps/web/components/comments && mkdir -p hooks
cd ../../..   # 回到 apps/web
git mv apps/web/hooks/use-comment-section-state.ts apps/web/components/comments/hooks/use-comment-section-state.ts
git mv apps/web/hooks/use-comment-section-state.test.ts apps/web/components/comments/hooks/use-comment-section-state.test.ts
```
该 hook 内部均为 `@/` 绝对引用（`@/hooks/use-comment-list` 等）与 `@/components/comments/parts/comment-item`，移动后无需改动；其测试 `./use-comment-section-state` 相对引用保持有效。

- [ ] **Step 2: 为 useCommentScroll 写失败测试**

`hooks/use-comment-scroll.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommentScroll } from "./use-comment-scroll";

describe("useCommentScroll", () => {
  it("返回 scrollRef 与两个滚动方法", () => {
    const { result } = renderHook(() => useCommentScroll({}));
    expect(typeof result.current.scrollRef).toBe("function");
    expect(typeof result.current.scrollToListTop).toBe("function");
    expect(typeof result.current.scrollToComment).toBe("function");
  });

  it("scrollRef 回调会把节点写入外部 ref", () => {
    const externalRef = { current: null as HTMLDivElement | null };
    const { result } = renderHook(() => useCommentScroll({ externalScrollRef: externalRef }));
    const node = document.createElement("div");
    result.current.scrollRef(node);
    expect(externalRef.current).toBe(node);
  });

  it("节点尺寸变化时回调 onContentResize", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    let trigger: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) { trigger = cb; }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const onContentResize = vi.fn();
    const { result } = renderHook(() => useCommentScroll({ onContentResize }));
    result.current.scrollRef(document.createElement("div"));
    trigger?.();
    expect(onContentResize).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter web test use-comment-scroll`
Expected: FAIL（找不到 `./use-comment-scroll`）

- [ ] **Step 4: 实现 useCommentScroll（从 comment-section.tsx 提取）**

`hooks/use-comment-scroll.ts`：

```ts
"use client";

import { useCallback, useRef, type RefObject } from "react";

interface UseCommentScrollOptions {
  externalScrollRef?: RefObject<HTMLDivElement | null>;
  onContentResize?: () => void;
}

/** modal 视图专属：滚动容器 ref 合并 + ResizeObserver 高度同步 + 滚动定位 */
export function useCommentScroll({ externalScrollRef, onContentResize }: UseCommentScrollOptions) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onContentResizeRef = useRef(onContentResize);
  onContentResizeRef.current = onContentResize;

  const scrollToListTop = useCallback(() => {
    requestAnimationFrame(() => {
      internalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const scrollToComment = useCallback((commentId: number) => {
    requestAnimationFrame(() => {
      const element = internalScrollRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      internalScrollRef.current = node;
      if (externalScrollRef) {
        externalScrollRef.current = node;
      }
      if (node && typeof window !== "undefined" && "ResizeObserver" in window) {
        const observer = new ResizeObserver(() => {
          onContentResizeRef.current?.();
        });
        observer.observe(node);
        const contentNode = node.firstElementChild;
        if (contentNode) {
          observer.observe(contentNode);
        }
        resizeObserverRef.current = observer;
      }
    },
    [externalScrollRef],
  );

  return { scrollRef, scrollToListTop, scrollToComment };
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter web test use-comment-scroll`
Expected: PASS

- [ ] **Step 6: 让 comment-section.tsx 改用两个 hook（临时，保持绿灯）**

- 引用：`@/hooks/use-comment-section-state` → `./hooks/use-comment-section-state`；新增 `import { useCommentScroll } from "./hooks/use-comment-scroll";`
- 删除组件内联的 `internalScrollRef` / `resizeObserverRef` / `onContentResizeRef` / `scrollToListTop` / `scrollToComment` / `mergeRef` 定义，改为：

```ts
const { scrollRef, scrollToListTop, scrollToComment } = useCommentScroll({
  externalScrollRef,
  onContentResize,
});
```
- modal 分支容器 `ref={mergeRef}` → `ref={scrollRef}`。
- `useCommentSectionState` 仍接 `onScrollToListTop: scrollToListTop, onScrollToComment: scrollToComment`。

- [ ] **Step 7: 跑测试 + 类型**

Run: `pnpm --filter web test && pnpm --filter web check-types`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "refactor(comments): 逻辑 hook 归入 hooks 并抽出 useCommentScroll"
```

---

## Task 4: 拆出 InlineComments / ModalComments，删除 comment-section

**Files:**
- Create: `views/inline-comments.tsx`(+`.test.tsx`)、`views/modal-comments.tsx`(+`.test.tsx`)
- Move: `comment-modal.tsx`(+`.test.tsx`) → `views/`
- Delete: `comment-section.tsx`、`comment-section.test.tsx`
- Modify: `index.ts`、`views/comment-modal.tsx`、`article-detail/article-comments.tsx`

- [ ] **Step 1: 创建 ModalComments**

`views/modal-comments.tsx`（容器结构来自 comment-section 的 modal 分支）：

```tsx
"use client";

import { useLayoutEffect, type RefObject } from "react";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { useCommentScroll } from "../hooks/use-comment-scroll";
import { CommentList } from "../parts/comment-list";
import { PillCommentInput } from "../inputs/pill-comment-input";

type TargetType = "article" | "moment";

interface ModalCommentsProps {
  targetType: TargetType;
  targetId: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onCommentAdded?: () => void;
  /** 列表内容尺寸变化时回调，供外层弹窗同步高度动效 */
  onContentResize?: () => void;
}

export function ModalComments({
  targetType,
  targetId,
  scrollRef: externalScrollRef,
  onCommentAdded,
  onContentResize,
}: ModalCommentsProps) {
  const { scrollRef, scrollToListTop, scrollToComment } = useCommentScroll({
    externalScrollRef,
    onContentResize,
  });

  const {
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    replyTarget,
    content,
    setContent,
    pendingReplies,
    isSubmitting,
    submitError,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
    onScrollToListTop: scrollToListTop,
    onScrollToComment: scrollToComment,
  });

  useLayoutEffect(() => {
    onContentResize?.();
  }, [comments.length, error, hasMore, isLoading, onContentResize, replyTarget]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[18px] py-4"
        style={{ overscrollBehavior: "contain" }}
      >
        <div>
          <CommentList
            comments={comments}
            isLoading={isLoading}
            error={error}
            hasMore={hasMore}
            pendingReplies={pendingReplies}
            targetType={targetType}
            onReply={handleReply}
            onLike={handleCommentLike}
            onLoadMore={loadMore}
          />
        </div>
      </div>
      <PillCommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        replyTarget={replyTarget}
        onCancelReply={handleCancelReply}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
```

- [ ] **Step 2: 创建 InlineComments**

`views/inline-comments.tsx`（结构来自 comment-section 的 inline 分支，回复提示改用 ReplyBanner）：

```tsx
"use client";

import { useLoginModal } from "@/store/use-login-modal";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { CommentList } from "../parts/comment-list";
import { RichCommentInput } from "../inputs/rich-comment-input";
import { ReplyBanner } from "../inputs/reply-banner";

type TargetType = "article" | "moment";

interface InlineCommentsProps {
  targetType: TargetType;
  targetId: number;
  onCommentAdded?: () => void;
}

export function InlineComments({ targetType, targetId, onCommentAdded }: InlineCommentsProps) {
  const openLoginModal = useLoginModal((state) => state.open);

  const {
    userId,
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    replyTarget,
    content,
    pendingReplies,
    isSubmitting,
    submitError,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
    handleChange,
  } = useCommentSectionState({ targetType, targetId, onCommentAdded });

  return (
    <div className="flex flex-col gap-6">
      <RichCommentInput
        value={content}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder={replyTarget ? "写下你的回复..." : "写下你的评论..."}
      />
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
      {replyTarget && (
        <ReplyBanner toUsername={replyTarget.toUsername} onCancel={handleCancelReply} />
      )}
      <div>
        <CommentList
          comments={comments}
          isLoading={isLoading}
          error={error}
          hasMore={hasMore}
          pendingReplies={pendingReplies}
          targetType={targetType}
          onReply={handleReply}
          onLike={handleCommentLike}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 移动 comment-modal 并改引用**

```bash
cd apps/web/components/comments && mkdir -p views
git mv comment-modal.tsx comment-modal.test.tsx views/
git mv views/inline-comments.tsx views/modal-comments.tsx views/ 2>/dev/null || true
```
（前两个新文件 Step 1/2 已写在 `views/` 下，则末行容错 mv 无操作。）

`views/comment-modal.tsx`：`import { CommentSection } from "./comment-section";` → `import { ModalComments } from "./modal-comments";`。文件内两处 `<CommentSection ... layout="modal" ... />` → `<ModalComments ... />`（删除 `layout` 属性，其余 props 不变：`targetType`/`targetId`/`onCommentAdded`，CommentSheet 额外保留 `scrollRef`，CommentDialog 额外保留 `onContentResize`）。

`views/comment-modal.test.tsx`：`vi.mock("./comment-section", ...)` → `vi.mock("./modal-comments", ...)`，并把 mock 内导出的 `CommentSection` 改为 `ModalComments`（断言渲染存在性即可）。

- [ ] **Step 4: 拆分 comment-section 测试为两份**

参考原 `comment-section.test.tsx`（已含 `@repo/ui`/`@repo/icons`/`Modal` 等 mock）拆为：

- `views/modal-comments.test.tsx`：导入 `import { ModalComments } from "./modal-comments";`，承接原文件中 `layout="modal"`（默认）相关用例；mock 路径由 `./parts/...` 改为 `../parts/...`、`./inputs/...`、`../hooks/...` 相应调整为相对 `views/` 的路径（`../parts/comment-replies` 等）。渲染 `<ModalComments targetType="article" targetId={1} />`。
- `views/inline-comments.test.tsx`：导入 `import { InlineComments } from "./inline-comments";`，承接原文件中 `layout="inline"` 相关用例（富文本输入、回复提示）；同样修正 mock 相对路径。渲染 `<InlineComments targetType="article" targetId={1} />`，删除 `layout` 属性。

两份测试均保留原有 `useCommentSectionState` 真实调用或既有 mock 策略，仅改组件入口与 mock 路径前缀。

- [ ] **Step 5: 删除 comment-section**

```bash
cd apps/web/components/comments
git rm comment-section.tsx comment-section.test.tsx
```

- [ ] **Step 6: 更新 index.ts 对外 API**

```ts
export { CommentModal } from "./views/comment-modal";
export { InlineComments } from "./views/inline-comments";
export { CommentReplies } from "./parts/comment-replies";
export { CommentItemSkeleton, CommentListSkeleton } from "./parts/comment-skeleton";
```

- [ ] **Step 7: 更新唯一 inline 消费方**

`apps/web/components/article-detail/article-comments.tsx`：`import { CommentSection } from "@/components/comments";` → `import { InlineComments } from "@/components/comments";`；JSX `<CommentSection ... />` → `<InlineComments ... />`（props 不变：`targetType`/`targetId`/`onCommentAdded`，原本就未传 `layout` 以外参数；若传了 `layout="inline"` 则删除该属性）。

- [ ] **Step 8: 跑全量测试 + 类型 + lint**

Run: `pnpm --filter web test && pnpm --filter web check-types && pnpm --filter web lint`
Expected: PASS（无 `CommentSection` 残留引用，无类型错误，lint 零警告）

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "refactor(comments): 拆出 InlineComments 与 ModalComments 并删除 comment-section"
```

---

## 验收

- `grep -rn "comment-section\|layout=\"modal\"\|layout=\"inline\"\|CommentSection" apps/web` 无残留（除历史 spec/plan 文档外）。
- `pnpm --filter web test` 全绿；`pnpm --filter web check-types` 与 `lint` 通过。
- modal（桌面 dialog 高度动效 / 移动端 sheet 手势 / 滚动定位）与 inline（富文本 + 顶部输入 + 回复提示）行为与重构前一致。

## 自查结论

- **Spec 覆盖**：目录分层、modal/inline 拆分、useCommentScroll、ReplyBanner、hook 迁移、对外 API 改名、测试随迁——均有对应 Task。
- **类型一致性**：`CommentList`/`PillCommentInput`/`ReplyBanner`/`useCommentScroll`（返回 `scrollRef`/`scrollToListTop`/`scrollToComment`）/`InlineComments`/`ModalComments` 命名在各 Task 间一致。
- **额外耦合**：guestbook 对 `comment-replies`/`rich-comment-input`/`thread-comment-item` 的深引用已在 Task 1/2 同步更新。
