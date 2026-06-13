# 统一回复组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 `guestbook-replies.tsx`，将留言板回复逻辑合并入 `comment-replies.tsx`，消除重复代码并统一样式。

**Architecture:** 将 `TargetType` 扩展为 `"article" | "moment" | "guestbook"`，在 `useCommentLike` 中补充 guestbook 分支，`guestbook-item.tsx` 改用 `CommentReplies` 并统一 `ReplyTarget` 类型（`guestbookId` → `commentId`）。

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react, Tailwind CSS

---

## 文件变更一览

| 文件 | 操作 |
|------|------|
| `apps/web/hooks/use-comment-like.ts` | 修改：`toggleReplyLike` 新增 `"guestbook"` 分支 |
| `apps/web/hooks/use-comment-like.test.ts` | 修改：新增 guestbook 测试用例 |
| `apps/web/components/comments/comment-replies.tsx` | 修改：扩展 TargetType、URL 逻辑、re-export ReplyTarget、统一样式、删除死代码 |
| `apps/web/components/comments/comment-replies.test.tsx` | 修改：新增 guestbook targetType 测试 |
| `apps/web/components/guestbook/guestbook-item.tsx` | 修改：换用 `CommentReplies`，`GuestbookReplyTarget` 换成 `ReplyTarget` |
| `apps/web/components/guestbook/guestbook-item.test.tsx` | 修改：`guestbookId` → `commentId` |
| `apps/web/components/guestbook/guestbook-page.tsx` | 修改：`replyTarget.guestbookId` → `replyTarget.commentId` |
| `apps/web/components/guestbook/guestbook-input-bar.tsx` | 修改：import 换成 `ReplyTarget` |
| `apps/web/components/guestbook/guestbook-replies.tsx` | **删除** |
| `apps/web/components/guestbook/guestbook-replies.test.tsx` | **删除** |

---

## Task 1：扩展 useCommentLike 支持 guestbook

**Files:**
- Modify: `apps/web/hooks/use-comment-like.ts`
- Modify: `apps/web/hooks/use-comment-like.test.ts`

- [ ] **Step 1: 写失败测试**

在 `use-comment-like.test.ts` 的 `describe` 块末尾追加：

```typescript
it("toggleReplyLike guestbook 调用正确 URL", async () => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ is_liked: true, like_count: 1 }),
  } as Response);

  const { result } = renderHook(() => useCommentLike("guestbook"));
  await act(() => result.current.toggleReplyLike(5, 20));

  expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
    "/api/guestbook/comments/5/replies/20/like",
    expect.objectContaining({ method: "POST" }),
  );
});
```

- [ ] **Step 2: 验证测试失败**

```bash
npx vitest --run apps/web/hooks/use-comment-like.test.ts
```

期望：新测试 FAIL（`TargetType` 不含 `"guestbook"`，TypeScript 报错）

- [ ] **Step 3: 实现**

修改 `apps/web/hooks/use-comment-like.ts`，将 `TargetType` 扩展并补充 guestbook URL：

```typescript
type TargetType = "article" | "moment" | "guestbook";

export function useCommentLike(targetType: TargetType) {
  const toggleCommentLike = useCallback(
    async (commentId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/like`
          : `/api/moments/comments/${commentId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  const toggleReplyLike = useCallback(
    async (commentId: number, replyId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/replies/${replyId}/like`
          : targetType === "moment"
            ? `/api/moments/comments/${commentId}/replies/${replyId}/like`
            : `/api/guestbook/comments/${commentId}/replies/${replyId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  return { toggleCommentLike, toggleReplyLike };
}
```

- [ ] **Step 4: 验证测试通过**

```bash
npx vitest --run apps/web/hooks/use-comment-like.test.ts
```

期望：全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-comment-like.ts apps/web/hooks/use-comment-like.test.ts
git commit -m "feat(comment-like): toggleReplyLike 支持 guestbook 目标类型"
```

---

## Task 2：扩展 CommentReplies 支持 guestbook，统一样式

**Files:**
- Modify: `apps/web/components/comments/comment-replies.tsx`
- Modify: `apps/web/components/comments/comment-replies.test.tsx`

本 Task 同时修复现存样式不一致（对照 guestbook-replies.tsx），并删除 `ReplyItemSkeleton` 死代码。

- [ ] **Step 1: 写失败测试**

在 `comment-replies.test.tsx` 的 `describe` 块末尾追加：

```typescript
it("targetType=guestbook 时展开并显示回复", async () => {
  const user = userEvent.setup();
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockPage([makeReply(1)])),
  } as Response);

  render(
    <CommentReplies
      commentId={1}
      targetType="guestbook"
      replyCount={1}
      onReply={vi.fn()}
    />,
  );
  await user.click(screen.getByText(/展开 1 条回复/));
  await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
});

it("targetType=guestbook 时 fetch URL 包含 guestbook 路径", async () => {
  const user = userEvent.setup();
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockPage([makeReply(1)])),
  } as Response);

  render(
    <CommentReplies
      commentId={7}
      targetType="guestbook"
      replyCount={1}
      onReply={vi.fn()}
    />,
  );
  await user.click(screen.getByText(/展开 1 条回复/));
  await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

  expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
    expect.stringContaining("/api/guestbook/comments/7/replies"),
  );
});
```

- [ ] **Step 2: 验证测试失败**

```bash
npx vitest --run apps/web/components/comments/comment-replies.test.tsx
```

期望：2 个新测试 FAIL（TypeScript 不接受 `"guestbook"` 作为 targetType）

- [ ] **Step 3: 实现**

将 `apps/web/components/comments/comment-replies.tsx` 替换为以下完整内容：

```typescript
// apps/web/components/comments/comment-replies.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentLike } from "@/hooks/use-comment-like";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import { markdownToHtmlSync, MarkdownContent } from "@repo/markdown";
import type { ReplyTarget } from "./comment-item";

export type { ReplyTarget };

const PAGE_SIZE = 5;

export type TargetType = "article" | "moment" | "guestbook";

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function replyUrl(targetType: TargetType, commentId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/comments/${commentId}/replies`
      : targetType === "moment"
        ? `/api/moments/comments/${commentId}/replies`
        : `/api/guestbook/comments/${commentId}/replies`;
  return `${base}?page=${page}&page_size=${PAGE_SIZE}`;
}

function ReplyBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <MarkdownContent html={html} variant="comment" />;
}

interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLikeResult?: (replyId: number, isLiked: boolean, likeCount: number) => void;
}

function ReplyItem({ reply, commentId, targetType, onReply, onLikeResult }: ReplyItemProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const { toggleReplyLike } = useCommentLike(targetType);

  const fromName = getDisplayName(reply.from_user);
  const toName = reply.to_user ? getDisplayName(reply.to_user) : null;
  const time = formatRelativeTime(new Date(reply.created_at));

  const handleLike = useCallback(async () => {
    if (!userId) {
      openLoginModal();
      return;
    }
    const result = await toggleReplyLike(commentId, reply.id);
    if (result) {
      onLikeResult?.(reply.id, result.is_liked, result.like_count);
    }
  }, [userId, openLoginModal, toggleReplyLike, commentId, reply.id, onLikeResult]);

  return (
    <div className="flex gap-2 [animation:replyFadeIn_0.2s_ease-out_both]">
      <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{fromName}</span>
          <span className="text-[11px] text-(--fg3)">{time}</span>
        </div>
        <div className="relative">
          <div className="min-w-0 pr-7.5 text-[13px] leading-[1.65] text-(--fg2)">
            {toName && (
              <span className="mr-1 text-[11px] font-semibold text-primary">@{toName}</span>
            )}
            <ReplyBody content={reply.content} />
          </div>
          <Button
            variant="text"
            type="button"
            onClick={handleLike}
            aria-label={reply.is_liked ? "取消点赞" : "点赞"}
            className={cn(
              "absolute top-0 right-1.75 flex shrink-0 flex-col items-center gap-0.5 self-start pt-0.5",
              reply.is_liked
                ? "text-red-500 hover:text-red-500"
                : "text-foreground/40",
            )}
          >
            <SvgIcon name={reply.is_liked ? "heart-fill" : "heart"} size={14} />
            {reply.like_count > 0 && (
              <span
                className={`text-[10px] font-medium ${reply.is_liked ? "text-red-500" : "text-(--fg3)"}`}
              >
                {reply.like_count}
              </span>
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="text"
          onPress={() => onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName })}
          className="mt-3 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
        >
          回复
        </Button>
      </div>
    </div>
  );
}

export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  onReply: (target: ReplyTarget) => void;
}

export function CommentReplies({
  commentId,
  targetType,
  replyCount,
  pendingReply,
  onReply,
}: CommentRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(replyUrl(targetType, commentId, pageNum));
        if (!res.ok) throw new Error("fetch failed");
        const data: CommentReplyPageResp = await res.json();
        setReplies((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
        if (!append) setIsOpen(true);
      } catch {
        setError("加载回复失败");
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, commentId],
  );

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setError(null);
      void fetchReplies(1, false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, fetchReplies]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) void fetchReplies(page + 1, true);
  }, [isLoading, hasMore, page, fetchReplies]);

  const updateReplyLike = useCallback((replyId: number, isLiked: boolean, likeCount: number) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, is_liked: isLiked, like_count: likeCount } : r)),
    );
  }, []);

  if (replyCount <= 0) return null;

  const displayReplies = pendingReply
    ? [...replies.filter((r) => r.id !== pendingReply.id), pendingReply]
    : replies;

  if (!isOpen) {
    return (
      <div>
        <Button
          variant="text"
          onClick={handleToggle}
          isDisabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-(--fg2) transition-colors"
        >
          <div className="h-px w-4 bg-accent-foreground/15"></div>
          {isLoading ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              加载中
            </>
          ) : (
            <>展开 {replyCount} 条回复</>
          )}
        </Button>
        {error && !isLoading && (
          <p className="mt-1 text-[11px] text-red-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3">
        {displayReplies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            commentId={commentId}
            targetType={targetType}
            onReply={onReply}
            onLikeResult={updateReplyLike}
          />
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex gap-3">
        {hasMore && (
          <Button
            variant="text"
            size="sm"
            isDisabled={isLoading}
            onPress={handleLoadMore}
            className="flex items-center gap-1 text-xs font-semibold text-(--fg2)"
          >
            {isLoading && (
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            )}
            {isLoading ? "加载中" : "查看更多回复"}
          </Button>
        )}
        <Button
          variant="text"
          size="sm"
          onPress={handleToggle}
          className="text-xs font-semibold text-(--fg2)"
        >
          收起回复
        </Button>
      </div>
    </div>
  );
}
```

> **注意样式变化（对齐 guestbook 样式审查结论）：**
> - 未点赞颜色：`text-black/54 dark:text-(--fg3)` → `text-foreground/40`（更语义化）
> - "回复"按钮：新增 `hover:text-foreground`
> - 删除 `ReplyItemSkeleton` 组件（已无用：展开前按钮承担 loading 态）
> - 删除展开态的 `isInitialLoading` skeleton 逻辑

- [ ] **Step 4: 验证测试通过**

```bash
npx vitest --run apps/web/components/comments/comment-replies.test.tsx
```

期望：全部 PASS（含 2 个新测试）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/comment-replies.tsx \
        apps/web/components/comments/comment-replies.test.tsx
git commit -m "feat(comment-replies): 扩展 TargetType 支持 guestbook，统一样式"
```

---

## Task 3：更新 guestbook-item.tsx，换用 CommentReplies

**Files:**
- Modify: `apps/web/components/guestbook/guestbook-item.tsx`
- Modify: `apps/web/components/guestbook/guestbook-item.test.tsx`

- [ ] **Step 1: 写失败测试**

打开 `guestbook-item.test.tsx`，找到以下断言并修改为新的字段名（此步骤让测试先失败，再通过修改 item.tsx 让它通过）：

```typescript
// 改前（line 67）：
expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ guestbookId: 1 }));

// 改后：
expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ commentId: 1 }));
```

- [ ] **Step 2: 验证测试失败**

```bash
npx vitest --run apps/web/components/guestbook/guestbook-item.test.tsx
```

期望：FAIL（`guestbookId` 不匹配）

- [ ] **Step 3: 实现**

将 `apps/web/components/guestbook/guestbook-item.tsx` 替换为：

```typescript
"use client";

import { useCallback, useMemo } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { markdownToHtmlSync, MarkdownContent } from "@repo/markdown";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatRelativeTime } from "@/lib/format-time";
import { CommentReplies } from "@/components/comments/comment-replies";
import type { ReplyTarget } from "@/components/comments/comment-replies";

function getDisplayName(user: GuestbookItemResp["user"]): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function GuestbookBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <MarkdownContent html={html} variant="comment" />;
}

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (id: number) => void;
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({ item, onReply, onLike, pendingReply }: GuestbookItemProps) {
  const displayName = getDisplayName(item.user);
  const time = formatRelativeTime(new Date(item.created_at));

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ commentId: item.id, toUsername: displayName }),
    [onReply, item.id, displayName],
  );

  return (
    <div className="py-4">
      <div className="flex gap-2.5">
        <UserAvatar src={item.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            {item.user?.mark && (
              <span className="rounded-full bg-primary/10 px-2 text-[10px] font-semibold text-primary">
                {item.user.mark}
              </span>
            )}
            {item.user?.site && (
              <a
                href={item.user.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-(--fg3) transition-colors hover:text-primary"
              >
                {item.user.site.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>

          <div className="relative flex gap-2">
            <div className="min-w-0 flex-1 pr-7.5 text-[12px] text-(--fg1)">
              <GuestbookBody content={item.content} />
            </div>
            <button
              type="button"
              onClick={handleLike}
              aria-label={item.is_liked ? "取消点赞" : "点赞"}
              className={cn(
                "absolute right-1.75 top-0 flex shrink-0 flex-col items-center gap-0.5",
                item.is_liked ? "text-red-500" : "text-foreground/40",
              )}
            >
              <SvgIcon name={item.is_liked ? "heart-fill" : "heart"} size={16} />
              {item.like_count > 0 && (
                <span className="text-[10px] font-medium">{item.like_count}</span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            回复
          </button>

          {item.reply_count > 0 && (
            <CommentReplies
              commentId={item.id}
              targetType="guestbook"
              replyCount={item.reply_count}
              pendingReply={pendingReply}
              onReply={onReply ?? (() => undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

> **注意：** `GuestbookReplyTarget` 类型被完全移除，上层调用方需在 Task 4 更新。

- [ ] **Step 4: 验证测试通过**

```bash
npx vitest --run apps/web/components/guestbook/guestbook-item.test.tsx
```

期望：全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-item.tsx \
        apps/web/components/guestbook/guestbook-item.test.tsx
git commit -m "refactor(guestbook-item): 换用统一 CommentReplies 组件，ReplyTarget 统一字段"
```

---

## Task 4：更新 guestbook-page.tsx 和 guestbook-input-bar.tsx

**Files:**
- Modify: `apps/web/components/guestbook/guestbook-page.tsx`
- Modify: `apps/web/components/guestbook/guestbook-input-bar.tsx`

- [ ] **Step 1: 更新 guestbook-input-bar.tsx**

找到 `guestbook-input-bar.tsx` 中的 import：

```typescript
// 改前：
import type { GuestbookReplyTarget } from "./guestbook-item";
// props 类型：
replyTarget?: GuestbookReplyTarget | null;
```

改为：

```typescript
import type { ReplyTarget } from "@/components/comments/comment-replies";
// props 类型：
replyTarget?: ReplyTarget | null;
```

同时，input-bar 内部引用 `replyTarget.guestbookId` 的地方（如有）也改为 `replyTarget.commentId`。

- [ ] **Step 2: 更新 guestbook-page.tsx**

找到所有使用 `GuestbookReplyTarget` 和 `replyTarget.guestbookId` 的地方：

```typescript
// 改前 import：
import type { GuestbookReplyTarget } from "./guestbook-item";
// 改后：
import type { ReplyTarget } from "@/components/comments/comment-replies";

// 改前 state：
const [replyTarget, setReplyTarget] = useState<GuestbookReplyTarget | null>(null);
// 改后：
const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

// 改前 handler 类型：
(target: GuestbookReplyTarget) => { ... }
// 改后：
(target: ReplyTarget) => { ... }

// 改前 3 处字段引用：
replyTarget.guestbookId   →   replyTarget.commentId
```

- [ ] **Step 3: 验证编译和测试通过**

```bash
npx vitest --run apps/web/components/guestbook/
```

期望：全部 PASS，无 TypeScript 错误

- [ ] **Step 4: 提交**

```bash
git add apps/web/components/guestbook/guestbook-page.tsx \
        apps/web/components/guestbook/guestbook-input-bar.tsx
git commit -m "refactor(guestbook): 统一 ReplyTarget 类型，移除 GuestbookReplyTarget"
```

---

## Task 5：删除 guestbook-replies.tsx 和其测试文件

**Files:**
- Delete: `apps/web/components/guestbook/guestbook-replies.tsx`
- Delete: `apps/web/components/guestbook/guestbook-replies.test.tsx`

- [ ] **Step 1: 确认无其他引用**

```bash
grep -r "guestbook-replies\|GuestbookReplies" apps/web/components apps/web/hooks apps/web/app --include="*.tsx" --include="*.ts"
```

期望：**无任何输出**（说明已无引用，可以安全删除）

- [ ] **Step 2: 删除文件**

```bash
rm apps/web/components/guestbook/guestbook-replies.tsx
rm apps/web/components/guestbook/guestbook-replies.test.tsx
```

- [ ] **Step 3: 全量验证**

```bash
npx vitest --run apps/web/components/comments/ apps/web/components/guestbook/ apps/web/hooks/use-comment-like.test.ts
```

期望：全部 PASS，无文件找不到错误

- [ ] **Step 4: TypeScript 编译检查**

```bash
pnpm --filter web tsc --noEmit
```

期望：无错误输出

- [ ] **Step 5: 提交**

```bash
git add -A apps/web/components/guestbook/guestbook-replies.tsx \
           apps/web/components/guestbook/guestbook-replies.test.tsx
git commit -m "refactor(guestbook): 删除 GuestbookReplies，统一使用 CommentReplies"
```

---

## 完成验证

```bash
# 全量测试
npx vitest --run apps/web/components/comments/ apps/web/components/guestbook/ apps/web/hooks/

# TypeScript 类型检查
pnpm --filter web tsc --noEmit
```

期望：全部绿灯，无 TypeScript 错误。
