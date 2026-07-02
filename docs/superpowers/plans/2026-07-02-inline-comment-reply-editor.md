# 评论区/留言板内联回复编辑器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 评论区（文章/动态的 `InlineComments`）和留言板（`GuestbookPage`）里点击「回复」「编辑」时，编辑器直接内联展开在该评论/回复下方，允许同时展开多个，不再滚动到共享编辑器；`CommentModal` 弹窗场景不变。

**Architecture:** 把「当前唯一回复/编辑目标」这个分区级共享状态下放到具体评论/回复条目组件本地（`isReplying`/`isEditing` + 本地内容 state），提交走父级传入的「提交并返回是否成功」回调（`onSubmitReply`/`onSubmitEditComment`/`onSubmitEditReply`），而不是「设置 target 交给父级统一处理」。新增一个共享展示组件 `InlineReplyEditor` 封装「本地内容 state + RichCommentInput + 提交中状态」，被 5 个内联场景复用。

**Tech Stack:** React 19 + TypeScript（`apps/web`，Next.js App Router），Vitest + Testing Library，`@repo/editor` 的 `RichEditor`。

## Global Constraints

- 禁止 `any`；类型不明确的地方用 `unknown` 或精确类型。
- 每个改动的组件/Hook 文件都必须有对应 `*.test.ts`/`*.test.tsx` 覆盖（AGENTS.md 强制要求）。
- 非显然逻辑写中文注释；不写解释「做了什么」的废话注释。
- 新代码复用现有 `@repo/ui`/`@repo/icons`/`@repo/hooks` 组件与工具，不写平行实现。
- 每个任务完成后运行 `pnpm --filter web test <相关测试文件>`，全部任务完成后跑一次 `pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web test`。
- 提交信息遵循 `.claude/skills/git-commit`：`<type>(<scope>): <中文主题>`，本仓库场景多为 `refactor(comments)` / `fix(comments)` / `test(comments)`。
- 参考设计文档：[`docs/superpowers/specs/2026-07-02-inline-comment-reply-editor-design.md`](../specs/2026-07-02-inline-comment-reply-editor-design.md)。

---

## 任务依赖关系

```
Task 1 (use-comment-submit 并发锁)   ─┐
Task 2 (use-comment-edit 并发锁)     ─┼─ 互相独立，可任意顺序
Task 3 (use-guestbook-submit 并发锁) ─┘
Task 4 (use-comment-section-state 新增函数) ─┐
Task 5 (新增 InlineReplyEditor 组件)        ─┼─ 互相独立
                                             │
Task 6 (评论区内联化：依赖 Task 4 + Task 5) ─┤
                                             │
Task 7 (留言板内联化：依赖 Task 5 + Task 6，因为复用 Task 6 改造后的 CommentReplies)
Task 8 (全量验证收尾：依赖以上全部)
```

---

### Task 1: 修复 `useCommentSubmit` 的全局并发提交锁

**Files:**
- Modify: `apps/web/hooks/use-comment-submit.ts`
- Test: `apps/web/hooks/use-comment-submit.test.ts`

**Interfaces:**
- Consumes: 无（纯内部实现改动，`submitComment`/`submitReply` 的函数签名和返回类型不变）
- Produces: `submitComment`/`submitReply` 现在允许「不同 target 并发调用互不阻塞」；「同一 target 并发重复调用」仍然被拒绝（返回 `null`），供 Task 6 的内联编辑器复用同一份 hook 时安全并发调用。

- [ ] **Step 1: 在测试文件追加两个新用例（先写测试，此时会失败，因为旧实现里任何并发调用都会被拒绝）**

在 `apps/web/hooks/use-comment-submit.test.ts` 文件末尾、`describe("useCommentSubmit", ...)` 的最后一个 `describe` 块之后（即整个文件最外层 `describe` 结束 `}` 之前）新增：

```ts
  describe("并发提交", () => {
    it("同一评论并发重复提交回复时第二次调用短路返回 null", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentSubmit("article", 5));

      const first = result.current.submitReply(1, "hello", 0);
      const duplicate = result.current.submitReply(1, "hello", 0);
      resolvers.forEach((resolve) => resolve(jsonResponse(makeReplyResp())));

      let duplicateResult: unknown = "sentinel";
      await act(async () => {
        await first;
        duplicateResult = await duplicate;
      });

      expect(duplicateResult).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("不同评论并发提交回复互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentSubmit("article", 5));

      const forCommentA = result.current.submitReply(1, "回复A", 0);
      const forCommentB = result.current.submitReply(2, "回复B", 0);
      resolvers.forEach((resolve, index) =>
        resolve(jsonResponse(makeReplyResp({ id: index === 0 ? 10 : 11 }))),
      );

      let resultA: unknown;
      let resultB: unknown;
      await act(async () => {
        resultA = await forCommentA;
        resultB = await forCommentB;
      });

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
```

- [ ] **Step 2: 运行测试确认新用例失败**

Run: `pnpm --filter web test use-comment-submit -- -t "并发提交"`
Expected: FAIL —「不同评论并发提交回复互不阻塞」用例失败，因为旧实现里第二个 `submitReply` 调用时 `isSubmittingRef.current` 仍为 `true`（第一个请求还没 resolve），被直接拒绝返回 `null`。

- [ ] **Step 3: 把全局布尔锁改为按 target 维度的 key 锁**

把 `apps/web/hooks/use-comment-submit.ts` 中 `useCommentSubmit` 函数体替换为：

```ts
export function useCommentSubmit(targetType: TargetType, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  // 评论与回复分别使用各自 scope 的幂等键，互不复用、互不干扰。
  const commentKey = useIdempotencyKey("comment");
  const replyKey = useIdempotencyKey("reply");

  // 按 target 维度（而非全局）加锁：同一 target 的重复提交会被拒绝，
  // 不同 target（如不同评论）之间互不阻塞，支持同时展开多个内联编辑器并发提交。
  const beginRequest = useCallback((key: string): boolean => {
    if (inFlightKeysRef.current.has(key)) return false;
    inFlightKeysRef.current.add(key);
    setIsSubmitting(true);
    return true;
  }, []);

  const endRequest = useCallback((key: string) => {
    inFlightKeysRef.current.delete(key);
    setIsSubmitting(inFlightKeysRef.current.size > 0);
  }, []);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      const key = "comment";
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, targetId, content });
      try {
        const resp = await apiJson<CommentItemResp>(commentUrl(targetType, targetId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": commentKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ content }),
        });
        commentKey.resetIdempotencyKey();
        notifySubmitSuccess(resp, "评论已发布");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) commentKey.resetIdempotencyKey();
        notifySubmitError(err, "发布失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, targetId, commentKey, beginRequest, endRequest],
  );

  const submitReply = useCallback(
    async (
      commentId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${commentId}:${parentReplyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({
        targetType,
        commentId,
        parentReplyId,
        content,
      });
      try {
        const resp = await apiJson<CommentReplyResp>(replyUrl(targetType, commentId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": replyKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        replyKey.resetIdempotencyKey();
        notifySubmitSuccess(resp, "回复已发布");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) replyKey.resetIdempotencyKey();
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, replyKey, beginRequest, endRequest],
  );

  return { isSubmitting, submitComment, submitReply };
}
```

同时把文件顶部的 `import { useState, useCallback, useRef } from "react";` 保持不变（`useRef`/`useCallback`/`useState` 都还在用）。

- [ ] **Step 4: 运行测试确认全部通过**

Run: `pnpm --filter web test use-comment-submit`
Expected: PASS（全部用例，包括新增的「并发提交」两个用例）

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-comment-submit.ts apps/web/hooks/use-comment-submit.test.ts
git commit -m "$(cat <<'EOF'
fix(comments): 评论提交锁按 target 维度隔离，支持并发提交
EOF
)"
```

---

### Task 2: 修复 `useCommentEdit` 的全局并发提交锁

**Files:**
- Modify: `apps/web/hooks/use-comment-edit.ts`
- Test: `apps/web/hooks/use-comment-edit.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `editComment`/`editReply` 签名不变；不同 target 并发调用互不阻塞，同一 target 并发重复调用仍返回 `null`（保留现有「编辑请求进行中时忽略重复提交」用例的行为）。

- [ ] **Step 1: 追加新用例（先写测试，会失败）**

在 `apps/web/hooks/use-comment-edit.test.ts` 的 `describe("幂等键复用规则", ...)` 块内，紧跟在「编辑请求进行中时忽略重复提交」这个 `it` 之后新增：

```ts
    it("不同评论并发编辑互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useCommentEdit("article"));

      const forCommentA = result.current.editComment(7, "编辑A");
      const forCommentB = result.current.editComment(9, "编辑B");
      resolvers.forEach((resolve) => resolve(jsonResponse(makeCommentResp())));

      let resultA: unknown;
      let resultB: unknown;
      await act(async () => {
        resultA = await forCommentA;
        resultB = await forCommentB;
      });

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
```

- [ ] **Step 2: 运行测试确认新用例失败**

Run: `pnpm --filter web test use-comment-edit -- -t "不同评论并发编辑"`
Expected: FAIL — 旧实现里第二个 `editComment(9, ...)` 调用时 `isEditingRef.current` 仍为 `true`，被直接拒绝返回 `null`。

- [ ] **Step 3: 把全局布尔锁改为按 target 维度的 key 锁**

把 `apps/web/hooks/use-comment-edit.ts` 中 `useCommentEdit` 函数体替换为：

```ts
export function useCommentEdit(targetType: TargetType) {
  const [isEditing, setIsEditing] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const commentKey = useIdempotencyKey("comment-edit");
  const replyKey = useIdempotencyKey("reply-edit");

  // 按 target 维度（而非全局）加锁，理由同 use-comment-submit.ts。
  const beginRequest = useCallback((key: string): boolean => {
    if (inFlightKeysRef.current.has(key)) return false;
    inFlightKeysRef.current.add(key);
    setIsEditing(true);
    return true;
  }, []);

  const endRequest = useCallback((key: string) => {
    inFlightKeysRef.current.delete(key);
    setIsEditing(inFlightKeysRef.current.size > 0);
  }, []);

  const editComment = useCallback(
    async (commentId: number, content: string): Promise<CommentItemResp | null> => {
      const key = `comment:${commentId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, commentId, content });
      try {
        const resp = await apiJson<CommentItemResp>(commentEditUrl(targetType, commentId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": commentKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ content }),
        });
        commentKey.resetIdempotencyKey();
        notifyEditSuccess(resp, "评论已更新");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) commentKey.resetIdempotencyKey();
        notifyEditError(err, "编辑失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, commentKey, beginRequest, endRequest],
  );

  const editReply = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      content: string,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${replyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, replyId, parentReplyId, content });
      try {
        const resp = await apiJson<CommentReplyResp>(replyEditUrl(targetType, replyId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": replyKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        replyKey.resetIdempotencyKey();
        notifyEditSuccess(resp, "回复已更新");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) replyKey.resetIdempotencyKey();
        notifyEditError(err, "编辑失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, replyKey, beginRequest, endRequest],
  );

  return { isEditing, editComment, editReply };
}
```

- [ ] **Step 4: 运行测试确认全部通过（包括原有「编辑请求进行中时忽略重复提交」用例）**

Run: `pnpm --filter web test use-comment-edit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-comment-edit.ts apps/web/hooks/use-comment-edit.test.ts
git commit -m "$(cat <<'EOF'
fix(comments): 评论编辑锁按 target 维度隔离，支持并发编辑
EOF
)"
```

---

### Task 3: 修复 `useGuestbookSubmit` 的全局并发提交锁

**Files:**
- Modify: `apps/web/hooks/use-guestbook-submit.ts`
- Test: `apps/web/hooks/use-guestbook-submit.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `submitEntry`/`submitReply`/`editEntry` 签名不变；不同 target 并发调用互不阻塞。

- [ ] **Step 1: 追加新用例（先写测试，会失败）**

在 `apps/web/hooks/use-guestbook-submit.test.ts` 文件末尾、最外层 `describe("useGuestbookSubmit", ...)` 结束 `}` 之前新增：

```ts

  describe("并发提交", () => {
    it("不同留言并发提交回复互不阻塞，均能成功返回", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useGuestbookSubmit());

      const forEntryA = result.current.submitReply(1, "回复A");
      const forEntryB = result.current.submitReply(2, "回复B");
      resolvers.forEach((resolve, index) =>
        resolve(jsonResponse({ ...mockReply, id: index === 0 ? 10 : 11 })),
      );

      let resultA: unknown;
      let resultB: unknown;
      await act(async () => {
        resultA = await forEntryA;
        resultB = await forEntryB;
      });

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it("同一留言并发重复提交回复时第二次调用短路返回 null", async () => {
      const resolvers: Array<(response: Response) => void> = [];
      vi.mocked(fetch).mockImplementation(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      );
      const { result } = renderHook(() => useGuestbookSubmit());

      const first = result.current.submitReply(1, "回复A", 0);
      const duplicate = result.current.submitReply(1, "回复A", 0);
      resolvers.forEach((resolve) => resolve(jsonResponse(mockReply)));

      let duplicateResult: unknown = "sentinel";
      await act(async () => {
        await first;
        duplicateResult = await duplicate;
      });

      expect(duplicateResult).toBeNull();
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: 运行测试确认「不同留言并发提交」用例失败**

Run: `pnpm --filter web test use-guestbook-submit -- -t "并发提交"`
Expected: FAIL —「不同留言并发提交回复互不阻塞」失败，旧实现的全局锁会拒绝第二个并发调用。

- [ ] **Step 3: 把全局布尔锁改为按 target 维度的 key 锁**

把 `apps/web/hooks/use-guestbook-submit.ts` 中 `useGuestbookSubmit` 函数体替换为：

```ts
export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const entryKey = useIdempotencyKey("guestbook");
  const replyKey = useIdempotencyKey("reply");
  const editKey = useIdempotencyKey("guestbook-edit");

  // 按 target 维度（而非全局）加锁，理由同 use-comment-submit.ts。
  const beginRequest = useCallback((key: string): boolean => {
    if (inFlightKeysRef.current.has(key)) return false;
    inFlightKeysRef.current.add(key);
    setIsSubmitting(true);
    return true;
  }, []);

  const endRequest = useCallback((key: string) => {
    inFlightKeysRef.current.delete(key);
    setIsSubmitting(inFlightKeysRef.current.size > 0);
  }, []);

  const submitEntry = useCallback(
    async (content: string, ownerUserId?: number): Promise<GuestbookItemResp | null> => {
      const key = "entry";
      if (!beginRequest(key)) return null;
      const fingerprint = `${ownerUserId ?? 0}:${content}`;
      const idempotencyKey = entryKey.getIdempotencyKey(fingerprint);
      try {
        const item = await apiJson<GuestbookItemResp>("/api/guestbook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ owner_user_id: ownerUserId, content }),
        });
        entryKey.resetIdempotencyKey();
        notifySuccess(item.moderation, ENTRY_SUCCESS_FALLBACK);
        return item;
      } catch (err) {
        if (!isRetriableError(err)) entryKey.resetIdempotencyKey();
        notifySubmitError(err, "发布失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [entryKey, beginRequest, endRequest],
  );

  const submitReply = useCallback(
    async (
      guestbookId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${guestbookId}:${parentReplyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = `${guestbookId}:${parentReplyId}:${content}`;
      const idempotencyKey = replyKey.getIdempotencyKey(fingerprint);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        const reply = await apiJson<CommentReplyResp>(
          `/api/guestbook/comments/${guestbookId}/replies`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(body),
          },
        );
        replyKey.resetIdempotencyKey();
        // 回复成功默认静默；后端注入 notice 时才提示（保留原有交互习惯）。
        notifySuccess(reply.moderation, "");
        return reply;
      } catch (err) {
        if (!isRetriableError(err)) replyKey.resetIdempotencyKey();
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [replyKey, beginRequest, endRequest],
  );

  const editEntry = useCallback(
    async (id: number, content: string): Promise<GuestbookItemResp | null> => {
      const key = `edit:${id}`;
      if (!beginRequest(key)) return null;
      const fingerprint = `${id}:${content}`;
      const idempotencyKey = editKey.getIdempotencyKey(fingerprint);
      try {
        const item = await apiJson<GuestbookItemResp>(`/api/guestbook/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ content }),
        });
        editKey.resetIdempotencyKey();
        notifySuccess(item.moderation, EDIT_SUCCESS_FALLBACK);
        return item;
      } catch (err) {
        if (!isRetriableError(err)) editKey.resetIdempotencyKey();
        notifySubmitError(err, "修改失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [editKey, beginRequest, endRequest],
  );

  return { isSubmitting, submitEntry, submitReply, editEntry };
}
```

- [ ] **Step 4: 运行测试确认全部通过**

Run: `pnpm --filter web test use-guestbook-submit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-guestbook-submit.ts apps/web/hooks/use-guestbook-submit.test.ts
git commit -m "$(cat <<'EOF'
fix(guestbook): 留言提交锁按 target 维度隔离，支持并发提交
EOF
)"
```

---

### Task 4: `useCommentSectionState` 新增细粒度提交函数

**Files:**
- Modify: `apps/web/components/comments/hooks/use-comment-section-state.ts`
- Test: `apps/web/components/comments/hooks/use-comment-section-state.test.ts`

**Interfaces:**
- Consumes: 该 hook 内部已有的 `submitReply`/`editComment`/`editReply`/`incrementReplyCount`/`setPendingReplies`/`updateComment`/`setEditedReplies`/`userId`/`profile`/`enrichReplyFromAuthor`/`enrichCommentAuthor`（均已在文件中定义/导入，无需新增依赖）。
- Produces（供 Task 6 使用）：
  - `handleReplySubmit(commentId: number, parentReplyId: number | undefined, content: string): Promise<boolean>`
  - `handleEditCommentSubmit(commentId: number, content: string): Promise<boolean>`
  - `handleEditReplySubmit(replyId: number, parentReplyId: number, commentId: number, content: string): Promise<boolean>`
- 现有导出（`replyTarget`/`editTarget`/`handleReply`/`handleCancelReply`/`handleEditComment`/`handleEditReply`/`handleCancelEdit`/`handleSubmit` 等）保持不变，供 `ModalComments` 继续使用。

- [ ] **Step 1: 写失败的测试**

在 `apps/web/components/comments/hooks/use-comment-section-state.test.ts` 的最后一个 `describe("编辑", ...)` 块**之后**（即最外层 `describe("useCommentSectionState", ...)` 结束 `}` 之前）新增：

```ts

  describe("细粒度提交函数（内联编辑器用）", () => {
    it("handleReplySubmit 成功时增加回复计数、写入 pendingReplies 并返回 true", async () => {
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = false;
      await act(async () => {
        ok = await result.current.handleReplySubmit(1, undefined, "回复一下");
      });

      expect(ok).toBe(true);
      expect(mockSubmitReply).toHaveBeenCalledWith(1, "回复一下", undefined);
      expect(mockIncrementReplyCount).toHaveBeenCalledWith(1);
      expect(result.current.pendingReplies[1]).toEqual({
        ...makeReply(10),
        from_user: {
          id: 1,
          username: "alice@example.com",
          nickname: "Alice",
          roles: ["user"],
        },
      });
    });

    it("handleReplySubmit 内容为空白时不发起请求并返回 false", async () => {
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = true;
      await act(async () => {
        ok = await result.current.handleReplySubmit(1, undefined, "   ");
      });

      expect(ok).toBe(false);
      expect(mockSubmitReply).not.toHaveBeenCalled();
    });

    it("handleReplySubmit 失败（submitReply 返回 null）时返回 false 且不增加计数", async () => {
      mockSubmitReply.mockResolvedValueOnce(null);
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = true;
      await act(async () => {
        ok = await result.current.handleReplySubmit(1, undefined, "回复一下");
      });

      expect(ok).toBe(false);
      expect(mockIncrementReplyCount).not.toHaveBeenCalled();
    });

    it("handleEditCommentSubmit 成功时调用 updateComment 原位替换并返回 true", async () => {
      const updated = { ...makeComment(1), content: "编辑后内容" };
      mockEditComment.mockResolvedValueOnce(updated);
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = false;
      await act(async () => {
        ok = await result.current.handleEditCommentSubmit(1, "编辑后内容");
      });

      expect(ok).toBe(true);
      expect(mockEditComment).toHaveBeenCalledWith(1, "编辑后内容");
      expect(mockUpdateComment).toHaveBeenCalledWith(updated);
    });

    it("handleEditReplySubmit 成功时写入 editedReplies 并返回 true", async () => {
      const updatedReply = { ...makeReply(10), content: "编辑后回复" };
      mockEditReply.mockResolvedValueOnce(updatedReply);
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = false;
      await act(async () => {
        ok = await result.current.handleEditReplySubmit(10, 0, 1, "编辑后回复");
      });

      expect(ok).toBe(true);
      expect(mockEditReply).toHaveBeenCalledWith(10, 0, "编辑后回复");
      expect(result.current.editedReplies[1]).toEqual({
        ...updatedReply,
        from_user: {
          id: 1,
          username: "alice@example.com",
          nickname: "Alice",
          roles: ["user"],
        },
      });
    });

    it("handleEditReplySubmit 失败时返回 false", async () => {
      mockEditReply.mockResolvedValueOnce(null);
      const { result } = renderHook(() =>
        useCommentSectionState({ targetType: "article", targetId: 1 }),
      );

      let ok = true;
      await act(async () => {
        ok = await result.current.handleEditReplySubmit(10, 0, 1, "编辑后回复");
      });

      expect(ok).toBe(false);
    });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test use-comment-section-state -- -t "细粒度提交函数"`
Expected: FAIL — `result.current.handleReplySubmit` 等是 `undefined`，因为 hook 还没有导出这些函数。

- [ ] **Step 3: 在 hook 中新增三个函数并加入返回值**

打开 `apps/web/components/comments/hooks/use-comment-section-state.ts`，在 `handleChange` 定义之后（`return {` 之前）插入：

```ts
  // 内联编辑器专用：不经过 replyTarget/editTarget，直接提交并处理副作用，返回是否成功。
  const handleReplySubmit = useCallback(
    async (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await submitReply(commentId, trimmed, parentReplyId);
      if (!reply) return false;
      incrementReplyCount(commentId);
      setPendingReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [incrementReplyCount, profile, submitReply, userId],
  );

  const handleEditCommentSubmit = useCallback(
    async (commentId: number, content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const updated = await editComment(commentId, trimmed);
      if (!updated) return false;
      updateComment(enrichCommentAuthor(updated, userId, profile));
      return true;
    },
    [editComment, profile, updateComment, userId],
  );

  const handleEditReplySubmit = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const updated = await editReply(replyId, parentReplyId, trimmed);
      if (!updated) return false;
      setEditedReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(updated, userId, profile),
      }));
      return true;
    },
    [editReply, profile, userId],
  );
```

然后在文件末尾的 `return { ... }` 对象里，紧跟 `handleChange,` 之后新增三行：

```ts
    handleChange,
    handleReplySubmit,
    handleEditCommentSubmit,
    handleEditReplySubmit,
  };
```

（即把原来的 `handleChange,\n  };` 替换为上面这段。）

- [ ] **Step 4: 运行全部测试确认通过**

Run: `pnpm --filter web test use-comment-section-state`
Expected: PASS（新增用例 + 原有用例全部通过，原有用例断言未变，因为没有删除任何现有导出）

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/hooks/use-comment-section-state.ts apps/web/components/comments/hooks/use-comment-section-state.test.ts
git commit -m "$(cat <<'EOF'
feat(comments): use-comment-section-state 新增内联提交函数
EOF
)"
```

---

### Task 5: 新增共享组件 `InlineReplyEditor`

**Files:**
- Create: `apps/web/components/comments/inputs/inline-reply-editor.tsx`
- Test: `apps/web/components/comments/inputs/inline-reply-editor.test.tsx`

**Interfaces:**
- Produces（供 Task 6、Task 7 使用）：

```ts
interface InlineReplyEditorProps {
  initialValue?: string;
  placeholder: string;
  header?: ReactNode;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onSubmit: (content: string) => Promise<boolean>;
  className?: string;
}
export function InlineReplyEditor(props: InlineReplyEditorProps): JSX.Element;
```

行为：内部持有 `value`（初始值 `initialValue ?? ""`）与 `isSaving` state；点击发送时 trim 后调用 `onSubmit`，`isSaving` 期间禁用发送（`RichCommentInput` 的 `isSubmitting` 负责禁用）；`onSubmit` 返回 `true`/`false` 均由调用方决定是否卸载该组件（组件自身不做「提交成功后清空/收起」的判断，因为「是否展开」这个布尔状态归调用方所有）。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/components/comments/inputs/inline-reply-editor.test.tsx`：

```tsx
// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineReplyEditor } from "./inline-reply-editor";

vi.mock("./rich-comment-input", () => ({
  RichCommentInput: ({
    value,
    onChange,
    onSubmit,
    isSubmitting,
    placeholder,
    header,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    isSubmitting?: boolean;
    placeholder?: string;
    header?: React.ReactNode;
  }) => (
    <div data-testid="rich-input">
      {header}
      <span data-testid="placeholder">{placeholder}</span>
      <textarea
        data-testid="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" disabled={isSubmitting} onClick={onSubmit}>
        发送
      </button>
    </div>
  ),
}));

describe("InlineReplyEditor", () => {
  it("渲染 initialValue 作为初始内容", () => {
    render(
      <InlineReplyEditor
        initialValue="草稿内容"
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("草稿内容");
  });

  it("无 initialValue 时初始内容为空字符串", () => {
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByTestId("textarea")).toHaveValue("");
  });

  it("渲染传入的 header", () => {
    render(
      <InlineReplyEditor
        placeholder="写点什么"
        header={<span data-testid="banner">回复 @Alice</span>}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("banner")).toBeTruthy();
  });

  it("点击发送时用 trim 后的内容调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "  hello  ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("内容为空白时点击发送不调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "   ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("提交进行中 RichCommentInput 收到 isSubmitting=true", async () => {
    const user = userEvent.setup();
    let resolveSubmit!: (v: boolean) => void;
    const onSubmit = vi.fn(
      () => new Promise<boolean>((resolve) => (resolveSubmit = resolve)),
    );
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "hello");
    await user.click(screen.getByText("发送"));

    expect(screen.getByText("发送")).toBeDisabled();
    resolveSubmit(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test inline-reply-editor`
Expected: FAIL（找不到模块 `./inline-reply-editor`）

- [ ] **Step 3: 实现组件**

创建 `apps/web/components/comments/inputs/inline-reply-editor.tsx`：

```tsx
"use client";

import { useCallback, useState, type ReactNode } from "react";
import { RichCommentInput } from "./rich-comment-input";

interface InlineReplyEditorProps {
  initialValue?: string;
  placeholder: string;
  header?: ReactNode;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onSubmit: (content: string) => Promise<boolean>;
  className?: string;
}

/**
 * 内联回复/编辑输入框：封装「本地内容 state + 提交中状态 + RichCommentInput」，
 * 由调用方决定「是否展开」（本组件不负责收起自己——提交成功后调用方会把它从渲染树里移除）。
 */
export function InlineReplyEditor({
  initialValue = "",
  placeholder,
  header,
  isLoggedIn,
  onLoginRequired,
  onSubmit,
  className,
}: InlineReplyEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    void onSubmit(trimmed).finally(() => setIsSaving(false));
  }, [value, isSaving, onSubmit]);

  return (
    <div className={className}>
      <RichCommentInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        isSubmitting={isSaving}
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
        placeholder={placeholder}
        maxLength={2000}
        header={header}
      />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test inline-reply-editor`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/inputs/inline-reply-editor.tsx apps/web/components/comments/inputs/inline-reply-editor.test.tsx
git commit -m "$(cat <<'EOF'
feat(comments): 新增内联回复/编辑输入框共享组件
EOF
)"
```

---

### Task 6: 评论区（文章/动态）内联化 — `CommentReplies` + `CommentItem` + `CommentList` + `InlineComments`

> 这四个文件通过 props 契约互相耦合（`CommentReplies` 改签名 → `CommentItem` 必须同步改 → `CommentList` 必须同步改 → `InlineComments` 必须同步改），只有四个文件全部改完项目才重新可编译，因此作为一个任务整体提交。以下按「先改被依赖的底层，再改上层」的顺序排列步骤。
>
> **⚠️ 执行期修正（双模式契约）**：原始 Step 3/7/9 的设计（下方仍保留，作为「新增内联提交路径」的实现基础）错误地假设可以直接把 `onReply`/`onEditComment`/`onEditReply`（目标态回调）整体替换成 `onSubmitReply`/`onSubmitEditComment`/`onSubmitEditReply`（内联提交回调）。但 `CommentList`/`CommentItem`/`CommentReplies` 同时被 `InlineComments`（本任务）和 `ModalComments`（明确不改动的弹窗场景，仍然只会传 `onReply`/`onEditComment`/`onEditReply`）共用——完全替换会导致 `modal-comments.tsx` 编译失败。
>
> 实际落地时改为**双模式共存**：三个组件的 props 里目标态回调（`onReply?`/`onEditComment?`/`onEditReply?`，全部可选，类型不变）和内联提交回调（`onSubmitReply?`/`onSubmitEditComment?`/`onSubmitEditReply?`，均改为可选）**同时存在**；每处入口按「内联回调优先，否则回退到目标态回调」解析：
> ```ts
> const canReply = Boolean(onSubmitReply || onReply);
> const handleReply = () => {
>   if (!userId) { openLoginModal(); return; }
>   if (onSubmitReply) { /* 内联模式：本地 isReplying=true */ return; }
>   onReply?.(target); // 目标态模式：原样转发，行为与改造前逐字一致
> };
> ```
> `onEditComment`/`onEditReply` 同理。`InlineComments` 全程只传 `onSubmit*` 三个新回调；`modal-comments.tsx` 完全不用改一行代码——它继续传 `onReply`/`onEditComment`/`onEditReply`，自动落入目标态分支，行为零变化。`CommentItem`/`CommentReplies` 之间不再用 `NOOP_SUBMIT_REPLY` 兜底转发（会让 `canReply` 误判为真），而是把两组回调原样透传下去，由更内层的组件做同样的「优先取内联」判断。
>
> 下面 Step 1/3/5/7/9 里的代码块是「新增内联路径」这一半的设计基础，实现时需要按上面这条规则，把目标态回调（`onReply?`/`onEditComment?`/`onEditReply?`，及 `comment-item.tsx` 里已导出的 `ReplyTarget`/`EditTarget`/`ReplyEditTarget` 类型）加回各 Props 接口，而不是删除它们。

**Files:**
- Modify: `apps/web/components/comments/parts/comment-replies.tsx`
- Modify: `apps/web/components/comments/parts/comment-replies.test.tsx`
- Modify: `apps/web/components/comments/parts/comment-item.tsx`
- Modify: `apps/web/components/comments/parts/comment-item.test.tsx`
- Modify: `apps/web/components/comments/parts/comment-list.tsx`
- Modify: `apps/web/components/comments/parts/comment-list.test.tsx`
- Modify: `apps/web/components/comments/views/inline-comments.tsx`
- Modify: `apps/web/components/comments/views/inline-comments.test.tsx`
- Delete: `apps/web/components/comments/views/inline-comments.composition.test.tsx`（整份测试的前提——`InlineComments` 靠 `replyTarget` 驱动顶部编辑器 header——不再成立）

**Interfaces:**
- Consumes: Task 4 的 `handleReplySubmit`/`handleEditCommentSubmit`/`handleEditReplySubmit`；Task 5 的 `InlineReplyEditor`；`comment-item.tsx` 里已导出、不变的 `ReplyTarget`/`EditTarget`/`ReplyEditTarget` 类型（继续给 `ModalComments`/`use-comment-section-state.ts` 用，本任务不删除这几个类型声明，且要在 `CommentRepliesProps`/`CommentItemProps`/`CommentListProps` 里重新作为可选字段引用，见上方「执行期修正」）。
- Produces（供 Task 7 复用）：`CommentReplies` 最终双模式契约（`onSubmitReply`/`onSubmitEditReply` 均为可选，与 `onReply`/`onEditReply` 并存）：

```ts
export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType; // "article" | "moment" | "guestbook"
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  editedReply?: CommentReplyResp | null;
  onReply?: (target: ReplyTarget) => void;
  onSubmitReply?: (commentId: number, parentReplyId: number | undefined, content: string) => Promise<boolean>;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onReplyDeleted?: (replyId: number) => void;
  onEditReply?: (target: ReplyEditTarget) => void;
  onSubmitEditReply?: (replyId: number, parentReplyId: number, commentId: number, content: string) => Promise<boolean>;
  onOpenChange?: (open: boolean) => void;
  linkProfile?: boolean;
}
```

Task 7（`GuestbookItem`）只会传 `onSubmitReply`/`onSubmitEditReply`（新回调），不受此次修正影响，继续沿用下方 Step 内容不变。

#### Step 1: 重写 `comment-replies.test.tsx` 里回复/编辑相关的用例

打开 `apps/web/components/comments/parts/comment-replies.test.tsx`：

0) `InlineReplyEditor` 内部渲染的是 `RichCommentInput`→`@repo/editor` 的 `RichEditor`（Tiptap contenteditable，`placeholder` 是 CSS `data-placeholder` 伪元素而非真实 DOM 属性，也没有 `value` 表单控件），所以**不能**像对普通 `<textarea>` 那样用 `getByPlaceholderText`/`getByDisplayValue`/`user.type` 去查询和交互。在顶部 mock 区（紧挨着其它 `vi.mock(...)` 调用之后）新增对 `InlineReplyEditor` 的 mock，和 `comment-item.test.tsx`（本任务 Step 5）、`guestbook-item.test.tsx`（Task 7）用的是同一套 mock 形状：

```tsx
vi.mock("../inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    initialValue = "",
    placeholder,
    header,
    onSubmit,
  }: {
    initialValue?: string;
    placeholder?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-reply-editor">
      {header}
      <span data-testid="inline-editor-placeholder">{placeholder}</span>
      <textarea data-testid="inline-editor-value" readOnly value={initialValue} />
      <button type="button" onClick={() => void onSubmit("内联提交内容")}>
        提交
      </button>
    </div>
  ),
}));
```

1) 顶部所有 `onReply={vi.fn()}` 的地方，保留原样但把 prop 名从 `onReply` 换成 `onSubmitReply`，并让传入的 mock 是 `vi.fn().mockResolvedValue(true)`（因为新签名返回 `Promise<boolean>`）。**这一步是纯改名，不改测试意图**——用编辑器的多光标/批量替换：把整份文件里的 `onReply={vi.fn()}` 全部替换为 `onSubmitReply={vi.fn().mockResolvedValue(true)}`，把 `onReply={onReply}`（有名字变量的那处）保留变量名但改成 `onSubmitReply={onReply}`（后面 Step 会把变量本身也重命名，见下）。

2) 把「点击回复内的回复按钮触发 onReply」这个 `it` 替换为（用上面新增的 mock，断言 `data-testid`/`onSubmit` 回调，而不是查询真实富文本编辑器）：

```ts
  it("点击回复内的回复按钮展开内联回复框，提交时调用 onSubmitReply", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies
        commentId={1}
        targetType="article"
        replyCount={1}
        onSubmitReply={onSubmitReply}
      />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));

    await user.click(screen.getAllByText("回复")[0]);
    expect(screen.getByTestId("inline-editor-placeholder")).toHaveTextContent("回复 @Alice…");

    await user.click(screen.getByText("提交"));

    expect(onSubmitReply).toHaveBeenCalledWith(1, 1, "内联提交内容");
  });

  it("回复提交成功后内联回复框收起", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies
        commentId={1}
        targetType="article"
        replyCount={1}
        onSubmitReply={onSubmitReply}
      />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));
    await user.click(screen.getAllByText("回复")[0]);
    await user.click(screen.getByText("提交"));

    await waitFor(() => expect(screen.queryByTestId("inline-reply-editor")).toBeNull());
  });
```

3) 把「作者编辑入口」`describe` 块里的三个 `it`（「作者点击编辑按钮触发 onEditReply」「编辑 pending_content 时初始内容为待审版本」「非作者不显示编辑按钮」「未提供 onEditReply 时不显示编辑按钮」）整体替换为：

```ts
  describe("作者编辑入口", () => {
    it("作者点击编辑按钮后内联展示编辑器，替换正文显示", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(mockPage([makeReply(1, { from_user_id: 1, parent_reply_id: 0 })])),
      );
      const onSubmitEditReply = vi.fn().mockResolvedValue(true);

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          currentUserId={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
          onSubmitEditReply={onSubmitEditReply}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

      await user.click(screen.getByRole("button", { name: "编辑回复" }));
      expect(screen.getByTestId("inline-editor-value")).toHaveValue("回复 1");

      await user.click(screen.getByText("提交"));
      expect(onSubmitEditReply).toHaveBeenCalledWith(1, 0, 1, "内联提交内容");
    });

    it("编辑 pending_content 时编辑框初始内容为待审版本", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(
          mockPage([
            makeReply(1, {
              content: "旧公开版本",
              moderation: {
                public_state: "visible",
                display_version: "last_approved",
                has_pending_revision: true,
                pending_risk_level: "medium",
                can_interact: true,
                pending_content: "新待审版本",
              },
            }),
          ]),
        ),
      );

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          currentUserId={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
          onSubmitEditReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("旧公开版本")).toBeTruthy());

      await user.click(screen.getByRole("button", { name: "编辑回复" }));
      expect(screen.getByTestId("inline-editor-value")).toHaveValue("新待审版本");
    });

    it("非作者不显示编辑按钮", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(
        jsonResponse(mockPage([makeReply(1, { from_user_id: 2 })])),
      );

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          currentUserId={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
          onSubmitEditReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

      expect(screen.queryByRole("button", { name: "编辑回复" })).toBeNull();
    });

    it("未提供 onSubmitEditReply 时不显示编辑按钮", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          currentUserId={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

      expect(screen.queryByRole("button", { name: "编辑回复" })).toBeNull();
    });
  });
```

4) 「targetType=guestbook 时点击回复按钮触发 onReply」这个 `it` 替换为：

```ts
  it("targetType=guestbook 时点击回复按钮展开内联回复框", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies
        commentId={1}
        targetType="guestbook"
        replyCount={1}
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));
    await user.click(screen.getByRole("button", { name: "回复" }));

    expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
  });
```

5) 文件顶部所有其余 `onReply={vi.fn()}`（在 replyCount=0、可见性、点赞、删除、加载、审核展示等与回复/编辑无关的用例里）批量重命名为 `onSubmitReply={vi.fn().mockResolvedValue(true)}`；对应地把函数签名 `onReply={onReply}` (line ~123 `replyCount=0` 那条 和其它保留局部变量名的地方) 一并改名成 `onSubmitReply`。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test comment-replies`
Expected: FAIL（`CommentReplies` 还没有 `onSubmitReply`/`onSubmitEditReply` prop，也没有内联编辑器）

- [ ] **Step 3: 重写 `comment-replies.tsx`**

打开 `apps/web/components/comments/parts/comment-replies.tsx`，做以下改动：

顶部 import 段替换为：

```tsx
// apps/web/components/comments/parts/comment-replies.tsx
"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp, CommentReplyPageResp, CommentUserResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentLike } from "@/hooks/use-comment-like";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { ThreadReplyItem } from "./thread-comment-item";
import { InlineReplyEditor } from "../inputs/inline-reply-editor";
import { ReplyBanner } from "../inputs/reply-banner";

export type { ReplyTarget } from "./comment-item";
```

（`import type { ReplyEditTarget, ReplyTarget } from "./comment-item";` 和单独的 `export type { ReplyTarget };` 两行删除，改成上面这一行 `export type { ReplyTarget } from "./comment-item";`——`ReplyEditTarget` 不再被本文件使用。）

`ReplyItemProps` 接口替换为：

```tsx
interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  targetType: TargetType;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLikeResult?: (replyId: number, isLiked: boolean, likeCount: number) => void;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  linkProfile?: boolean;
}
```

`ReplyItem` 组件体替换为：

```tsx
const ReplyItem = memo(function ReplyItem({
  reply,
  commentId,
  targetType,
  onSubmitReply,
  onLikeResult,
  currentUserId,
  onDeleteReply,
  onSubmitEditReply,
  linkProfile = false,
}: ReplyItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const { toggleReplyLike } = useCommentLike(targetType);
  const isOwnReply = currentUserId != null && currentUserId === reply.from_user_id;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleReply = useCallback(() => {
    if (!userId) {
      openLoginModal();
      return;
    }
    setIsEditing(false);
    setIsReplying(true);
  }, [userId, openLoginModal]);

  const handleDelete = useCallback(() => {
    return onDeleteReply?.(reply.id) ?? false;
  }, [onDeleteReply, reply.id]);

  const handleEdit = useCallback(() => {
    if (!isOwnReply || !onSubmitEditReply) return;
    setIsReplying(false);
    setIsEditing(true);
  }, [isOwnReply, onSubmitEditReply]);

  const fromName = reply.from_user?.nickname ?? reply.from_user?.username ?? "匿名";
  // 编辑时优先使用 pending_content，让作者编辑待审版本而非公开旧版本
  const pendingContent =
    reply.moderation?.pending_content?.trim() && reply.moderation!.pending_content!.length > 0
      ? reply.moderation!.pending_content!
      : reply.content;

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(commentId, reply.id, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, commentId, reply.id],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok =
        (await onSubmitEditReply?.(reply.id, reply.parent_reply_id, commentId, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onSubmitEditReply, reply.id, reply.parent_reply_id, commentId],
  );

  return (
    <div className="flex flex-col gap-3">
      <ThreadReplyItem
        user={reply.from_user}
        createdAt={reply.created_at}
        content={reply.content}
        mentionUser={reply.to_user}
        likeCount={reply.like_count}
        isLiked={reply.is_liked}
        onLike={() => void handleLike()}
        onReply={onSubmitReply ? handleReply : undefined}
        onDelete={isOwnReply && onDeleteReply ? handleDelete : undefined}
        onEdit={isOwnReply && onSubmitEditReply ? handleEdit : undefined}
        deleteLabel="删除回复"
        deleteConfirmMessage="确定删除这条回复吗？"
        linkProfile={linkProfile}
        moderation={reply.moderation}
        isOwner={isOwnReply}
      />
      {isReplying && (
        <InlineReplyEditor
          placeholder={`回复 @${fromName}…`}
          header={<ReplyBanner toUsername={fromName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
        />
      )}
      {isEditing && (
        <InlineReplyEditor
          initialValue={pendingContent}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => setIsEditing(false)}
              editing
              pendingReview={Boolean(reply.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
});
```

`CommentRepliesProps` 接口替换为：

```tsx
export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  /** 编辑成功后由父组件传入的最新回复，触发一次按 ID 原位替换；传入同一引用只替换一次。 */
  editedReply?: CommentReplyResp | null;
  onSubmitReply: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onReplyDeleted?: (replyId: number) => void;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  onOpenChange?: (open: boolean) => void;
  linkProfile?: boolean;
}
```

`CommentReplies` 组件的参数解构和内部 `<ReplyItem>` 渲染处，把 `onReply`/`onEditReply` 改名为 `onSubmitReply`/`onSubmitEditReply`（函数体其余逻辑——分页、点赞、删除、`displayReplies` 计算——完全不变）：

```tsx
export const CommentReplies = memo(function CommentReplies({
  commentId,
  targetType,
  replyCount,
  pendingReply,
  editedReply,
  onSubmitReply,
  currentUserId,
  onDeleteReply,
  onReplyDeleted,
  onSubmitEditReply,
  onOpenChange,
  linkProfile = true,
}: CommentRepliesProps) {
```

（其余 `CommentReplies` 函数体——`isOpen`/`replies`/`page`/`fetchReplies`/`handleToggle`/`handleLoadMore`/`updateReplyLike`/`updateReply`/`handleDeleteReply`/`displayReplies` 计算——保持原样不动，只需要把渲染 `<ReplyItem>` 那一处的 `onReply={onReply}` 改成 `onSubmitReply={onSubmitReply}`、`onEditReply={onEditReply}` 改成 `onSubmitEditReply={onSubmitEditReply}`。）

- [ ] **Step 4: 运行 comment-replies 测试确认通过**

Run: `pnpm --filter web test comment-replies`
Expected: PASS

- [ ] **Step 5: 重写 `comment-item.test.tsx`**

打开 `apps/web/components/comments/parts/comment-item.test.tsx`，整份替换为：

```tsx
// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentItem } from "./comment-item";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  wrapMarkdownImagesWithSkeletonHtml: (h: string) => h,
  deferMarkdownImageSources: (h: string) => h,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/lib/format-time", () => ({
  formatDateTime: () => "2022-01-03 20:56",
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

vi.mock("../inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    initialValue = "",
    header,
    onSubmit,
  }: {
    initialValue?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-reply-editor">
      {header}
      <textarea data-testid="inline-editor-value" readOnly value={initialValue} />
      <button type="button" onClick={() => void onSubmit("内联提交内容")}>
        提交
      </button>
    </div>
  ),
}));

vi.mock("./comment-replies", () => ({
  CommentReplies: (props: {
    replyCount: number;
    onSubmitReply: (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ) => Promise<boolean>;
    pendingReply: CommentReplyResp | null;
  }) => {
    if (props.replyCount <= 0) return null;
    return (
      <div data-testid="comment-replies" data-reply-count={props.replyCount}>
        <button type="button" onClick={() => void props.onSubmitReply(1, 2, "子回复内容")}>
          回复子评论
        </button>
        {props.pendingReply && <span data-testid="pending-in-comment">pending</span>}
      </div>
    );
  },
}));

const baseComment: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 5,
  user_id: 10,
  content: "这篇文章写得很好",
  user: { id: 10, username: "alice", nickname: "Alice" },
  reply_count: 3,
  like_count: 5,
  is_liked: false,
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CommentItem", () => {
  it("显示评论者昵称和评论内容", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("无昵称时显示 username", () => {
    const comment = {
      ...baseComment,
      user: { id: 10, username: "alice" },
    };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("显示点赞数和爱心图标", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("is_liked=true 时爱心仍为实心样式", () => {
    const liked = { ...baseComment, is_liked: true };
    render(<CommentItem comment={liked} targetType="article" />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("点击爱心触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onLike={onLike} />);

    await user.click(screen.getByRole("button", { name: /点赞/ }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复展开内联回复框", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
    await user.click(screen.getByText("回复"));
    expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
  });

  it("内联回复框提交成功后调用 onSubmitReply 并收起", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(<CommentItem comment={baseComment} targetType="article" onSubmitReply={onSubmitReply} />);

    await user.click(screen.getByText("回复"));
    await user.click(screen.getByText("提交"));

    expect(onSubmitReply).toHaveBeenCalledWith(1, undefined, "内联提交内容");
    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
  });

  it("未提供 onSubmitReply 时不显示回复按钮", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.queryByText("回复")).toBeNull();
  });

  it("当前用户是评论作者时显示删除按钮并二次确认", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "删除评论" }));
    expect(screen.getByText("确定删除这条评论吗？")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("当前用户不是评论作者时不显示删除按钮", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={99}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "删除评论" })).toBeNull();
  });

  it("作者点击编辑按钮后内联展示编辑器，替换正文显示", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onSubmitEditComment={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    // mock 的 InlineReplyEditor 用一个 readOnly textarea 展示 initialValue，其内容恰好与被隐藏的正文相同，
    // 默认的 queryByText 会把这个 textarea 也当作候选节点匹配到；用 ignore 选项把 textarea 排除在候选之外，
    // 这样断言真正验证的是「ThreadCommentContent 没有渲染」而不是被 mock 的读数误伤。
    expect(
      screen.queryByText("这篇文章写得很好", { ignore: "script, style, textarea" }),
    ).toBeNull();
    expect(screen.getByTestId("inline-editor-value")).toHaveValue("这篇文章写得很好");
  });

  it("内联编辑提交成功后调用 onSubmitEditComment 并恢复正文显示", async () => {
    const user = userEvent.setup();
    const onSubmitEditComment = vi.fn().mockResolvedValue(true);
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onSubmitEditComment={onSubmitEditComment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    await user.click(screen.getByText("提交"));

    expect(onSubmitEditComment).toHaveBeenCalledWith(1, "内联提交内容");
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("非作者不显示编辑按钮", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={99}
        onSubmitEditComment={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "编辑评论" })).toBeNull();
  });

  it("reply_count>0 时渲染 CommentReplies", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByTestId("comment-replies")).toBeTruthy();
    expect(screen.getByTestId("comment-replies").dataset.replyCount).toBe("3");
  });

  it("reply_count=0 时不渲染 CommentReplies", () => {
    const noReply = { ...baseComment, reply_count: 0 };
    render(<CommentItem comment={noReply} targetType="article" />);
    expect(screen.queryByTestId("comment-replies")).toBeNull();
  });

  it("转发 onSubmitReply 到 CommentReplies", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(<CommentItem comment={baseComment} targetType="article" onSubmitReply={onSubmitReply} />);

    await user.click(screen.getByText("回复子评论"));
    expect(onSubmitReply).toHaveBeenCalledWith(1, 2, "子回复内容");
  });

  it("未提供 onSubmitReply 时转发给 CommentReplies 的是安全的空实现", async () => {
    const user = userEvent.setup();
    render(<CommentItem comment={baseComment} targetType="article" />);

    await expect(user.click(screen.getByText("回复子评论"))).resolves.not.toThrow();
  });

  it("pendingReply 传递给 CommentReplies", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        pendingReply={{ id: 99 } as CommentReplyResp}
      />,
    );
    expect(screen.getByTestId("pending-in-comment")).toBeTruthy();
  });

  it("渲染 data-comment-id 属性", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    const el = screen.getByText("这篇文章写得很好").closest("[data-comment-id]");
    expect(el?.getAttribute("data-comment-id")).toBe("1");
  });

  it("有 user 时昵称渲染为跳转链接", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    const nicknameLink = screen
      .getAllByRole("link", { name: "Alice" })
      .find((link) => link.textContent === "Alice");
    expect(nicknameLink).toBeTruthy();
    expect(nicknameLink?.getAttribute("href")).toBe("/users/10");
  });

  it("无 user 时昵称为普通文本", () => {
    const comment = { ...baseComment, user: undefined };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.queryByRole("link", { name: "匿名" })).toBeNull();
    expect(screen.getByText("匿名")).toBeTruthy();
  });
});
```

- [ ] **Step 6: 运行 comment-item 测试确认失败**

Run: `pnpm --filter web test comment-item.test`
Expected: FAIL（`CommentItem` 还没实现新 props 与内联渲染逻辑）

- [ ] **Step 7: 重写 `comment-item.tsx`**

把整个文件替换为：

```tsx
"use client";

import { memo, useCallback, useState } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { cn } from "@repo/ui";
import type { TargetType } from "@/hooks/use-comment-like";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { CommentReplies } from "./comment-replies";
import { InlineReplyEditor } from "../inputs/inline-reply-editor";
import { ReplyBanner } from "../inputs/reply-banner";
import {
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
} from "./thread-comment-item";

export interface EditTarget {
  type: "comment";
  id: number;
  initialContent: string;
  pendingReview?: boolean;
}

export interface ReplyEditTarget {
  type: "reply";
  id: number;
  commentId: number;
  parentReplyId: number;
  initialContent: string;
  pendingReview?: boolean;
}

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

const NOOP_SUBMIT_REPLY = async () => false;

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onSubmitEditComment?: (commentId: number, content: string) => Promise<boolean>;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  onLike?: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
  editedReply?: CommentReplyResp | null;
}

export const CommentItem = memo(function CommentItem({
  comment,
  targetType,
  onSubmitReply,
  onSubmitEditComment,
  onSubmitEditReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
  editedReply,
}: CommentItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasReplies = comment.reply_count > 0;
  const isOwnComment = currentUserId != null && currentUserId === comment.user_id;
  const displayName = comment.user?.nickname ?? comment.user?.username ?? "匿名";

  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    if (!userId) {
      openLoginModal();
      return;
    }
    setIsEditing(false);
    setIsReplying(true);
  }, [userId, openLoginModal]);

  const handleDelete = useCallback(() => {
    return onDelete?.(comment.id) ?? false;
  }, [onDelete, comment.id]);

  const handleEdit = useCallback(() => {
    if (!isOwnComment || !onSubmitEditComment) return;
    setIsReplying(false);
    setIsEditing(true);
  }, [isOwnComment, onSubmitEditComment]);

  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(comment.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, comment.id],
  );

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(comment.id, undefined, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, comment.id],
  );

  // 编辑时优先使用待审版本：让作者编辑的是 pending_content 而非公开旧版本
  const pendingContent =
    comment.moderation?.pending_content?.trim() && comment.moderation!.pending_content!.length > 0
      ? comment.moderation!.pending_content!
      : comment.content;

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitEditComment?.(comment.id, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onSubmitEditComment, comment.id],
  );

  return (
    <div className="comment-item" data-comment-id={comment.id}>
      <ThreadCommentHeader
        user={comment.user}
        createdAt={comment.created_at}
        likeCount={comment.like_count}
        isLiked={comment.is_liked}
        onLike={handleLike}
        onReply={onSubmitReply ? handleReply : undefined}
        onDelete={isOwnComment && onDelete ? handleDelete : undefined}
        onEdit={isOwnComment && onSubmitEditComment ? handleEdit : undefined}
        deleteLabel="删除评论"
        deleteConfirmMessage="确定删除这条评论吗？"
        linkProfile
        moderation={comment.moderation}
      />

      {isEditing ? (
        <InlineReplyEditor
          initialValue={pendingContent}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => setIsEditing(false)}
              editing
              pendingReview={Boolean(comment.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
        <ThreadCommentContent
          content={comment.content}
          className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
          moderation={comment.moderation}
          isOwner={isOwnComment}
        />
      )}

      {isReplying && (
        <InlineReplyEditor
          placeholder={`回复 @${displayName}…`}
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={comment.id}
            targetType={targetType}
            replyCount={comment.reply_count}
            pendingReply={pendingReply}
            editedReply={editedReply}
            onSubmitReply={onSubmitReply ?? NOOP_SUBMIT_REPLY}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onSubmitEditReply={onSubmitEditReply}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
```

- [ ] **Step 8: 运行 comment-item 测试确认通过**

Run: `pnpm --filter web test comment-item.test`
Expected: PASS

- [ ] **Step 9: 更新 `comment-list.tsx` 和 `comment-list.test.tsx`**

在 `apps/web/components/comments/parts/comment-list.tsx` 中：

把 import 段里的

```ts
import {
  CommentItem,
  type EditTarget,
  type ReplyEditTarget,
  type ReplyTarget,
} from "./comment-item";
```

改为：

```ts
import { CommentItem } from "./comment-item";
```

把 `CommentListProps` 接口里这几行：

```ts
  onReply: (target: ReplyTarget) => void;
  onLike: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  onEditComment?: (target: EditTarget) => void;
  onEditReply?: (target: ReplyEditTarget) => void;
```

改为：

```ts
  onSubmitReply: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLike: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  onSubmitEditComment?: (commentId: number, content: string) => Promise<boolean>;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
```

把 `CommentList` 函数的参数解构和内部 `<CommentItem>` 渲染处，对应地把 `onReply`/`onEditComment`/`onEditReply` 改名为 `onSubmitReply`/`onSubmitEditComment`/`onSubmitEditReply`（其余分页、骨架屏、空状态逻辑不变）：

```tsx
export function CommentList({
  comments,
  isLoading,
  expectedCommentCount,
  hasLoaded = true,
  error,
  hasMore,
  pendingReplies,
  editedReplies,
  targetType,
  onSubmitReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onSubmitEditComment,
  onSubmitEditReply,
  onLoadMore,
}: CommentListProps) {
```

……在 JSX 里：

```tsx
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            targetType={targetType}
            onSubmitReply={onSubmitReply}
            onLike={onLike}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onDeleteReply={onDeleteReply}
            onSubmitEditComment={onSubmitEditComment}
            onSubmitEditReply={onSubmitEditReply}
            pendingReply={pendingReplies[comment.id] ?? null}
            editedReply={editedReplies?.[comment.id] ?? null}
          />
        ))}
```

在 `apps/web/components/comments/parts/comment-list.test.tsx` 中，把顶部 import 里的 `import type { ReplyTarget } from "./comment-item";` 删除，把 `defaultProps` 里：

```ts
    onReply: vi.fn<(target: ReplyTarget) => void>(),
```

改为：

```ts
    onSubmitReply: vi.fn<
      (commentId: number, parentReplyId: number | undefined, content: string) => Promise<boolean>
    >(),
```

- [ ] **Step 10: 运行 comment-list 测试确认通过**

Run: `pnpm --filter web test comment-list.test`
Expected: PASS

- [ ] **Step 11: 更新 `inline-comments.tsx`**

把整个文件替换为：

```tsx
"use client";

import { useLoginModal } from "@/store/use-login-modal";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { CommentList } from "../parts/comment-list";
import { RichCommentInput } from "../inputs/rich-comment-input";

type TargetType = "article" | "moment";

interface InlineCommentsProps {
  targetType: TargetType;
  targetId: number;
  /** SSR 或父级已知的评论总数，用于首屏加载占位 */
  expectedCommentCount?: number;
  onCommentAdded?: () => void;
}

export function InlineComments({
  targetType,
  targetId,
  expectedCommentCount,
  onCommentAdded,
}: InlineCommentsProps) {
  const openLoginModal = useLoginModal((state) => state.open);

  const {
    userId,
    comments,
    isLoading,
    hasLoaded,
    hasMore,
    error,
    loadMore,
    content,
    pendingReplies,
    editedReplies,
    isSubmitting,
    handleReplySubmit,
    handleEditCommentSubmit,
    handleEditReplySubmit,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
  });

  return (
    <div className="flex flex-col gap-6">
      <RichCommentInput
        value={content}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder="写下你的评论..."
        maxLength={2000}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
      <div className="px-3">
        <CommentList
          comments={comments}
          isLoading={isLoading}
          expectedCommentCount={expectedCommentCount}
          hasLoaded={hasLoaded}
          error={error}
          hasMore={hasMore}
          pendingReplies={pendingReplies}
          editedReplies={editedReplies}
          targetType={targetType}
          onSubmitReply={handleReplySubmit}
          onLike={handleCommentLike}
          currentUserId={userId}
          onDelete={handleCommentDelete}
          onDeleteReply={handleReplyDelete}
          onSubmitEditComment={handleEditCommentSubmit}
          onSubmitEditReply={handleEditReplySubmit}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 12: 重写 `inline-comments.test.tsx`**

打开 `apps/web/components/comments/views/inline-comments.test.tsx`，删除「点击回复时平滑滚动到编辑器（避开顶栏）」这个 `it`（整个滚动机制已被移除，无等价行为）。把顶部 `vi.mock("../parts/comment-item", ...)` 里 mock 组件收到的 `onReply` prop 改名为 `onSubmitReply`：

```tsx
vi.mock("../parts/comment-item", () => ({
  CommentItem: ({
    comment,
    onSubmitReply,
  }: {
    comment: CommentItemResp;
    onSubmitReply?: (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ) => Promise<boolean>;
  }) => (
    <div data-testid="comment-item" data-comment-id={comment.id}>
      {comment.content}
      {onSubmitReply ? (
        <button type="button" onClick={() => void onSubmitReply(comment.id, undefined, "内容")}>
          回复
        </button>
      ) : null}
    </div>
  ),
}));
```

在保留的「评论列表渲染」用例之后新增一个用例，验证新回调被正确透传（替代被删掉的滚动用例）：

```tsx
  it("点击评论项的回复按钮转发到 CommentList 的 onSubmitReply", async () => {
    const user = userEvent.setup();
    render(<InlineComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());

    // mock 的 CommentItem 在点击时会调用 onSubmitReply(commentId, undefined, "内容")，
    // 不应抛出异常（真实场景下会触发 use-comment-section-state 的 handleReplySubmit）。
    await expect(
      user.click(screen.getAllByRole("button", { name: "回复" })[0]!),
    ).resolves.not.toThrow();
  });
```

（`vi.useFakeTimers`/`scrollTo`/`navbar` 相关的 setup 代码只在被删除的那个用例里使用，一并删除；若删除后该文件不再需要 `vi.useFakeTimers`/`vi.spyOn(window, "scrollTo")`，确认没有其它用例依赖后直接移除这些引用。）

- [ ] **Step 13: 删除过时的 composition 测试**

```bash
git rm apps/web/components/comments/views/inline-comments.composition.test.tsx
```

- [ ] **Step 14: 运行本任务涉及的全部测试确认通过**

Run: `pnpm --filter web test comment-replies comment-item.test comment-list.test inline-comments`
Expected: PASS（`inline-comments.composition.test.tsx` 已删除，不再出现在测试列表里）

- [ ] **Step 15: 类型检查与 lint**

Run: `pnpm --filter web check-types && pnpm --filter web lint`
Expected: 无报错（确认 `ReplyEditTarget`/`ReplyTarget`/`EditTarget` 等类型在 `comment-item.tsx` 里仍然存在且未被误删——它们还要给 Task 7 之外的 `use-comment-section-state.ts`/`modal-comments.tsx`/`pill-comment-input.tsx` 用）

- [ ] **Step 16: Commit**

```bash
git add apps/web/components/comments/parts/comment-replies.tsx \
  apps/web/components/comments/parts/comment-replies.test.tsx \
  apps/web/components/comments/parts/comment-item.tsx \
  apps/web/components/comments/parts/comment-item.test.tsx \
  apps/web/components/comments/parts/comment-list.tsx \
  apps/web/components/comments/parts/comment-list.test.tsx \
  apps/web/components/comments/views/inline-comments.tsx \
  apps/web/components/comments/views/inline-comments.test.tsx \
  apps/web/components/comments/views/inline-comments.composition.test.tsx
git commit -m "$(cat <<'EOF'
feat(comments): 评论区回复/编辑改为内联展开，支持同时展开多个
EOF
)"
```

---

### Task 7: 留言板内联化 — `GuestbookPage` + `GuestbookInputBar` + `GuestbookItem` + `GuestbookList`

**Files:**
- Modify: `apps/web/components/guestbook/guestbook-page.tsx`
- Modify: `apps/web/components/guestbook/guestbook-page.test.tsx`
- Modify: `apps/web/components/guestbook/guestbook-input-bar.tsx`
- Modify: `apps/web/components/guestbook/guestbook-input-bar.test.tsx`
- Modify: `apps/web/components/guestbook/guestbook-item.tsx`
- Modify: `apps/web/components/guestbook/guestbook-item.test.tsx`
- Modify: `apps/web/components/guestbook/guestbook-list.tsx`
- Modify: `apps/web/components/guestbook/guestbook-list.test.tsx`

**Interfaces:**
- Consumes: Task 6 改造后的 `CommentReplies`（`onSubmitReply`/`onSubmitEditReply` 契约）；Task 5 的 `InlineReplyEditor`。
- Produces: 无对外接口（`GuestbookPage` 是页面级组件，本任务是本 feature 的最后一段调用链）。

#### Step 1: 简化 `guestbook-input-bar.tsx` 并更新其测试

打开 `apps/web/components/guestbook/guestbook-input-bar.test.tsx`，整份替换为：

```tsx
// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookInputBar } from "./guestbook-input-bar";

const mockOpenLoginModal = vi.fn();
const mockUseSession = vi.fn(() => ({ userId: 1 as number | null }));
const mockUseLoginModal = vi.fn(() => ({ open: mockOpenLoginModal }));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => mockUseLoginModal(),
}));

vi.mock("@/components/comments", () => ({
  RichCommentInput: ({
    value,
    onSubmit,
    placeholder,
  }: {
    value: string;
    onSubmit: () => void;
    placeholder?: string;
  }) => (
    <div data-testid="rich-input">
      <span data-testid="input-value">{value}</span>
      <span data-testid="placeholder">{placeholder}</span>
      <button onClick={onSubmit}>发布</button>
    </div>
  ),
}));

describe("GuestbookInputBar", () => {
  it("渲染 RichCommentInput", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("rich-input")).toBeTruthy();
  });

  it("placeholder 为留言提示", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("placeholder").textContent).toContain("说点什么");
  });

  it("点击发布调用 onSubmit 并在成功后清空内容", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<GuestbookInputBar onSubmit={onSubmit} />);
    await userEvent.click(screen.getByText("发布"));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

把 `apps/web/components/guestbook/guestbook-input-bar.tsx` 整个文件替换为：

```tsx
"use client";

import { useState, useCallback } from "react";
import { RichCommentInput } from "@/components/comments";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<boolean>;
  isSubmitting?: boolean;
}

export function GuestbookInputBar({ onSubmit, isSubmitting }: GuestbookInputBarProps) {
  const [content, setContent] = useState("");
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;
    const success = await onSubmit(content);
    if (success) {
      setContent("");
    }
  }, [content, isSubmitting, onSubmit]);

  return (
    <div className="flex flex-col gap-1.5">
      <RichCommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder="说点什么，支持 Markdown…"
        maxLength={2000}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
    </div>
  );
}
```

- [ ] **Step 2: 运行 guestbook-input-bar 测试确认通过**

Run: `pnpm --filter web test guestbook-input-bar`
Expected: PASS

#### Step 3: 重写 `guestbook-item.test.tsx`

打开 `apps/web/components/guestbook/guestbook-item.test.tsx`，做以下改动（其余未提及的用例——渲染内容、跳转链接、点赞数、心跳动效、格式化时间、审核展示——保持原样不动）：

把顶部 `vi.mock("@/components/comments/inputs/rich-comment-input", ...)` 改成 mock `InlineReplyEditor`（因为编辑/回复现在都通过 `InlineReplyEditor` 渲染）：

```ts
// 编辑器/回复框在留言项内联渲染；测试只关心初始值与提交回调，mock 掉共享组件
vi.mock("@/components/comments/inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    initialValue = "",
    header,
    onSubmit,
  }: {
    initialValue?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-editor">
      {header}
      <textarea data-testid="inline-editor-value" readOnly value={initialValue} />
      <button type="button" onClick={() => void onSubmit("内联提交内容")}>
        保存
      </button>
    </div>
  ),
}));
```

把「点击回复按钮调用 onReply」这个 `it` 替换为：

```ts
  it("点击回复按钮内联展开回复框，提交时调用 onSubmitReply", async () => {
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(<GuestbookItem item={mockItem} onSubmitReply={onSubmitReply} />);

    expect(screen.queryByTestId("inline-editor")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(screen.getByTestId("inline-editor")).toBeTruthy();

    await userEvent.click(screen.getByText("保存"));
    expect(onSubmitReply).toHaveBeenCalledWith(1, undefined, "内联提交内容");
  });
```

在「作者编辑」`describe` 块里，把「中风险留言：公开显示旧正文，编辑器初始正文为 pending_content」和「无 pending_content 时编辑器初始正文回退到正文」这两个 `it` 里的 `data-testid="inline-editor-value"` 断言目标保持不变（因为新 mock 用的也是同一个 `data-testid`），只需要把点击「保存」后的断言从

```ts
      expect(onEdit).toHaveBeenCalledWith(1, "待审新版本");
```

改为（这条不需要改，`onEdit` 签名本身没变）——**该 describe 块内容整体保持不变，无需修改**，因为 `onEdit` 的调用契约（`(id, content) => Promise<boolean>`）没有变化，只是内部渲染从旧的 `GuestbookInlineEditor`（本地组件）换成了共享的 `InlineReplyEditor`，测试用的 `data-testid` 保持一致（`inline-editor-value`）。

- [ ] **Step 4: 运行 guestbook-item 测试确认失败**

Run: `pnpm --filter web test guestbook-item.test`
Expected: FAIL（`GuestbookItem` 还没有 `onSubmitReply` prop 与内联回复逻辑）

#### Step 5: 重写 `guestbook-item.tsx`

整个文件替换为：

```tsx
"use client";

import { memo, useCallback, useState } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn, Button } from "@repo/ui";
import {
  CommentReplies,
  getThreadDisplayName,
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
} from "@/components/comments";
import { InlineReplyEditor } from "@/components/comments/inputs/inline-reply-editor";
import { ReplyBanner } from "@/components/comments/inputs/reply-banner";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { normalizeModerationView } from "@/components/moderation";

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLike?: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
  /** 作者编辑回调；返回 true 表示已按 ID 原位替换。 */
  onEdit?: (id: number, content: string) => Promise<boolean>;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  editedReply?: CommentReplyResp | null;
}

const NOOP_SUBMIT_REPLY = async () => false;

export const GuestbookItem = memo(function GuestbookItem({
  item,
  onSubmitReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
  onEdit,
  onSubmitEditReply,
  editedReply,
}: GuestbookItemProps) {
  const displayName = getThreadDisplayName(item.user);
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 所有互动判断先经规范化，审核关闭/旧响应缺失时回退为充分可交互的可见旧版本
  const moderation = normalizeModerationView(item.moderation);
  const canInteract = moderation.can_interact;
  const hasReplies = item.reply_count > 0;
  // 作者的删除/编辑入口不由前端审核状态擅自移除
  const isOwnItem = currentUserId != null && currentUserId === item.from_user_id;

  const handleLike = useCallback(() => {
    if (!canInteract) return;
    onLike?.(item.id);
  }, [canInteract, onLike, item.id]);

  const handleReply = useCallback(() => {
    if (!canInteract) return;
    if (!userId) {
      openLoginModal();
      return;
    }
    setIsEditing(false);
    setIsReplying(true);
  }, [canInteract, userId, openLoginModal]);

  const handleDelete = useCallback(() => onDelete?.(item.id) ?? false, [onDelete, item.id]);
  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(item.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, item.id],
  );

  const handleOpenEditor = useCallback(() => {
    setIsReplying(false);
    setIsEditing(true);
  }, []);

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(item.id, undefined, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, item.id],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onEdit?.(item.id, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onEdit, item.id],
  );

  // 中风险编辑：作者看到的是待审新版本，便于在其基础上修订或撤销
  const editInitialContent = item.moderation?.pending_content ?? item.content;

  return (
    <div className={cn("pt-4", hasReplies ? "pb-5" : "pb-2")}>
      <ThreadCommentHeader
        user={item.user}
        createdAt={item.created_at}
        likeCount={item.like_count}
        isLiked={item.is_liked}
        onLike={handleLike}
        onReply={onSubmitReply && canInteract ? handleReply : undefined}
        onDelete={isOwnItem && onDelete ? handleDelete : undefined}
        deleteLabel="删除留言"
        deleteConfirmMessage="确定删除这条留言吗？"
        linkProfile
        moderation={item.moderation}
      />

      {isOwnItem && onEdit && !isEditing && (
        <div className="mb-2">
          <Button
            variant="text"
            aria-label="编辑留言"
            onPress={handleOpenEditor}
            className="h-auto min-h-0 p-0 text-xs leading-none font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            编辑
          </Button>
        </div>
      )}

      {isEditing ? (
        <InlineReplyEditor
          initialValue={editInitialContent}
          placeholder="编辑留言正文…"
          header={<ReplyBanner toUsername="编辑中" onCancel={() => setIsEditing(false)} editing />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
        <ThreadCommentContent
          content={item.content}
          moderation={item.moderation}
          isOwner={isOwnItem}
          className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
        />
      )}

      {isReplying && (
        <InlineReplyEditor
          placeholder={`回复 @${displayName}…`}
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={item.id}
            targetType="guestbook"
            replyCount={item.reply_count}
            pendingReply={pendingReply}
            editedReply={editedReply}
            onSubmitReply={onSubmitReply ?? NOOP_SUBMIT_REPLY}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onSubmitEditReply={onSubmitEditReply}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
```

- [ ] **Step 6: 运行 guestbook-item 测试确认通过**

Run: `pnpm --filter web test guestbook-item.test`
Expected: PASS

#### Step 7: 更新 `guestbook-list.tsx` 和 `guestbook-list.test.tsx`

在 `apps/web/components/guestbook/guestbook-list.tsx` 中，把 `GuestbookListProps` 接口里：

```ts
  onReply: (target: ReplyTarget) => void;
  ...
  onEditReply?: (target: ReplyEditTarget) => void;
```

改为：

```ts
  onSubmitReply: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  ...
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
```

把顶部 `import type { ReplyEditTarget } from "@/components/comments";` 和 `import { CommentItemSkeleton, type ReplyTarget } from "@/components/comments";` 合并简化为：

```ts
import { CommentItemSkeleton } from "@/components/comments";
```

把 `GuestbookList` 函数参数解构和内部 `<GuestbookItem>` 渲染处的 `onReply`/`onEditReply` 改名为 `onSubmitReply`/`onSubmitEditReply`：

```tsx
export function GuestbookList({
  items,
  page,
  totalPages,
  total,
  isLoading,
  error,
  onPageChange,
  onSubmitReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onEdit,
  onSubmitEditReply,
  pendingReplies,
  editedReplies,
  listRef,
}: GuestbookListProps) {
```

```tsx
              <GuestbookItem
                key={item.id}
                item={item}
                onSubmitReply={onSubmitReply}
                onLike={onLike}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onDeleteReply={onDeleteReply}
                onEdit={onEdit}
                onSubmitEditReply={onSubmitEditReply}
                pendingReply={pendingReplies[item.id] ?? null}
                editedReply={editedReplies?.[item.id] ?? null}
              />
```

在 `apps/web/components/guestbook/guestbook-list.test.tsx` 中，把 `defaultProps`（或等价对象）里的 `onReply: vi.fn()` 改为 `onSubmitReply: vi.fn().mockResolvedValue(true)`。

- [ ] **Step 8: 运行 guestbook-list 测试确认通过**

Run: `pnpm --filter web test guestbook-list.test`
Expected: PASS

#### Step 9: 重写 `guestbook-page.test.tsx`

把「点击回复时滚动到编辑器」这个 `it` 删除（回复不再滚动）。把 `vi.mock("./guestbook-list", ...)` 里 mock 组件的 `onReply`/`onEditReply` 改名为 `onSubmitReply`/`onSubmitEditReply`，且触发方式改成直接调用（不再是「设置 target」而是「提交内容」）：

```tsx
vi.mock("./guestbook-list", () => ({
  GuestbookList: ({
    total,
    onSubmitReply,
    onSubmitEditReply,
    onPageChange,
    listRef,
    editedReplies,
  }: {
    total: number;
    onSubmitReply: (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ) => Promise<boolean>;
    onSubmitEditReply?: (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ) => Promise<boolean>;
    onPageChange: (page: number) => void;
    listRef?: RefObject<HTMLDivElement | null>;
    editedReplies?: Record<number, { content: string } | null>;
  }) => (
    <div ref={listRef} data-testid="guestbook-list">
      {total} 条留言
      <button type="button" onClick={() => void onSubmitReply(1, undefined, "回复内容")}>
        回复
      </button>
      <button type="button" onClick={() => onPageChange(2)}>
        下一页
      </button>
      <button
        type="button"
        onClick={() => void onSubmitEditReply?.(9, 0, 1, "修正后的回复")}
      >
        编辑回复
      </button>
      <span data-testid="edited-reply">{editedReplies?.[1]?.content}</span>
    </div>
  ),
}));
```

把 `vi.mock("./guestbook-input-bar", ...)` 简化为（不再需要 `editTarget`）：

```tsx
vi.mock("./guestbook-input-bar", () => ({
  GuestbookInputBar: ({ onSubmit }: { onSubmit: (content: string) => Promise<boolean> }) => (
    <div data-testid="input-bar">
      <button type="button" onClick={() => void onSubmit("新留言内容")}>
        发布
      </button>
    </div>
  ),
}));
```

删掉「点击回复时滚动到编辑器」这个 `it`；把「留言回复编辑成功后按所属留言原位替换」这个 `it` 替换为：

```tsx
  it("点击回复按钮提交后调用 submitReply 并增加回复计数", async () => {
    const user = userEvent.setup();
    render(<GuestbookPage initialPage={filledPage} />);

    await user.click(screen.getByRole("button", { name: "回复" }));

    // mock 的 useGuestbookSubmit().submitReply 默认返回 null（见 mock 定义），
    // 这里只验证调用链路不抛异常、且没有对不存在的 replyTarget 状态产生依赖。
    expect(screen.getByTestId("guestbook-list")).toBeTruthy();
  });

  it("留言回复编辑成功后按所属留言原位替换", async () => {
    const user = userEvent.setup();
    render(<GuestbookPage initialPage={filledPage} />);

    await user.click(screen.getByRole("button", { name: "编辑回复" }));

    await waitFor(() => {
      expect(mockEditReply).toHaveBeenCalledWith(9, 0, "修正后的回复");
      expect(screen.getByTestId("edited-reply")).toHaveTextContent("修正后的回复");
    });
  });
```

（`mockScrollIntoViewBelowFixedHeader`/`mockRunAfterSmoothScroll` 相关的 mock 与 import 继续保留——「分页切换加载完成后滚动到留言列表顶部」这个用例仍然需要它们，那部分逻辑属于分页滚动，与回复编辑器无关，本任务不改动。）

- [ ] **Step 10: 运行 guestbook-page 测试确认失败**

Run: `pnpm --filter web test guestbook-page.test`
Expected: FAIL（`GuestbookPage` 还没实现新的提交函数与移除 replyTarget 状态）

#### Step 11: 重写 `guestbook-page.tsx`

整个文件替换为：

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CommentReplyResp, GuestbookPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookList } from "@/hooks/use-guestbook-list";
import { useGuestbookSubmit } from "@/hooks/use-guestbook-submit";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import { useGuestbookDelete } from "@/hooks/use-guestbook-delete";
import { useCommentEdit } from "@/hooks/use-comment-edit";
import { GuestbookList } from "./guestbook-list";
import { GuestbookInputBar } from "./guestbook-input-bar";
import { PageContainer } from "@/components/common/page-container";
import { enrichGuestbookAuthor, enrichReplyFromAuthor } from "@/lib/enrich-ugc-author";
import { scrollIntoViewBelowFixedHeader } from "@/lib/scroll-into-view";

interface GuestbookPageProps {
  initialPage: GuestbookPageResp;
}

export function GuestbookPage({ initialPage }: GuestbookPageProps) {
  const { userId, profile } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const {
    items,
    page,
    totalPages,
    total,
    isLoading,
    error,
    fetchPage,
    addItem,
    incrementReplyCount,
    decrementReplyCount,
    removeItem,
    updateLike,
    replaceItem,
  } = useGuestbookList(initialPage);

  const { isSubmitting, submitEntry, submitReply, editEntry } = useGuestbookSubmit();
  const { editReply } = useCommentEdit("guestbook");

  const { toggleEntryLike } = useGuestbookLike();
  const { deleteItem, deleteReply } = useGuestbookDelete();

  const listRef = useRef<HTMLDivElement>(null);
  const pendingPaginationScrollRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});
  const [editedReplies, setEditedReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const handleSubmitEntry = useCallback(
    async (content: string): Promise<boolean> => {
      const item = await submitEntry(content);
      if (item) {
        addItem(enrichGuestbookAuthor(item, userId, profile));
        return true;
      }
      return false;
    },
    [addItem, profile, submitEntry, userId],
  );

  const handleReplySubmit = useCallback(
    async (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await submitReply(commentId, trimmed, parentReplyId);
      if (!reply) return false;
      incrementReplyCount(commentId);
      setPendingReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [incrementReplyCount, profile, submitReply, userId],
  );

  const handleEditReplySubmit = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await editReply(replyId, parentReplyId, trimmed);
      if (!reply) return false;
      setEditedReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [editReply, profile, userId],
  );

  const handleLike = useCallback(
    async (id: number) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      const result = await toggleEntryLike(id);
      if (result) updateLike(id, result.is_liked, result.like_count);
    },
    [userId, openLoginModal, toggleEntryLike, updateLike],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const ok = await deleteItem(id);
      if (ok) {
        removeItem(id);
      }
      return ok;
    },
    [deleteItem, removeItem],
  );

  const handleEdit = useCallback(
    async (id: number, content: string): Promise<boolean> => {
      const item = await editEntry(id, content);
      if (item) {
        replaceItem(enrichGuestbookAuthor(item, userId, profile));
        return true;
      }
      return false;
    },
    [editEntry, profile, replaceItem, userId],
  );

  const handleReplyDelete = useCallback(
    async (itemId: number, replyId: number) => {
      const ok = await deleteReply(replyId);
      if (ok) {
        decrementReplyCount(itemId);
      }
      return ok;
    },
    [decrementReplyCount, deleteReply],
  );

  const handlePageChange = useCallback(
    (pageNum: number) => {
      pendingPaginationScrollRef.current = true;
      void fetchPage(pageNum);
    },
    [fetchPage],
  );

  // 分页加载完成后，滚到留言列表顶部（避开 fixed 顶栏）
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && pendingPaginationScrollRef.current) {
      pendingPaginationScrollRef.current = false;
      const el = listRef.current;
      if (el) {
        scrollIntoViewBelowFixedHeader(el);
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  return (
    <PageContainer size="default" className="min-h-dvh">
      <div className="mb-6">
        <GuestbookInputBar onSubmit={handleSubmitEntry} isSubmitting={isSubmitting} />
      </div>
      <GuestbookList
        items={items}
        page={page}
        totalPages={totalPages}
        total={total}
        isLoading={isLoading}
        error={error}
        onPageChange={handlePageChange}
        onSubmitReply={handleReplySubmit}
        listRef={listRef}
        onLike={handleLike}
        currentUserId={userId}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDeleteReply={handleReplyDelete}
        onSubmitEditReply={handleEditReplySubmit}
        pendingReplies={pendingReplies}
        editedReplies={editedReplies}
      />
    </PageContainer>
  );
}
```

- [ ] **Step 12: 运行 guestbook-page 测试确认通过**

Run: `pnpm --filter web test guestbook-page.test`
Expected: PASS

- [ ] **Step 13: 类型检查与 lint**

Run: `pnpm --filter web check-types && pnpm --filter web lint`
Expected: 无报错

- [ ] **Step 14: Commit**

```bash
git add apps/web/components/guestbook/guestbook-page.tsx \
  apps/web/components/guestbook/guestbook-page.test.tsx \
  apps/web/components/guestbook/guestbook-input-bar.tsx \
  apps/web/components/guestbook/guestbook-input-bar.test.tsx \
  apps/web/components/guestbook/guestbook-item.tsx \
  apps/web/components/guestbook/guestbook-item.test.tsx \
  apps/web/components/guestbook/guestbook-list.tsx \
  apps/web/components/guestbook/guestbook-list.test.tsx
git commit -m "$(cat <<'EOF'
feat(guestbook): 留言板回复/编辑改为内联展开，复用共享内联编辑器
EOF
)"
```

---

### Task 8: 全量验证与收尾

**Files:** 无新增/修改文件（除非验证中发现问题需要修复）

**Interfaces:** 无

- [ ] **Step 1: 全量类型检查**

Run: `pnpm --filter web check-types`
Expected: 无错误

- [ ] **Step 2: 全量 lint（`--max-warnings 0`）**

Run: `pnpm --filter web lint`
Expected: 无错误无警告

- [ ] **Step 3: 全量测试**

Run: `pnpm --filter web test`
Expected: 全部通过；确认 `apps/web/components/comments/` 和 `apps/web/components/guestbook/` 目录下测试数量相较改造前有所增加（内联回复/编辑用例是新增的），且没有残留对 `inline-comments.composition.test.tsx` 的引用。

- [ ] **Step 4: 人工确认 `CommentModal`/`ModalComments`/`PillCommentInput` 未被触碰**

Run: `git diff --stat main -- apps/web/components/comments/views/comment-modal.tsx apps/web/components/comments/views/modal-comments.tsx apps/web/components/comments/inputs/pill-comment-input.tsx`
Expected: 无输出（这三个文件在整个 feature 分支里没有任何改动），验证「弹窗式评论保持现状」这条设计约束成立。

- [ ] **Step 5: 搜索确认没有遗留的旧 prop 名引用**

Run: `grep -rn "onEditComment\b\|onEditReply?:\s*(target" apps/web/components/comments apps/web/components/guestbook --include="*.tsx" --include="*.ts"`
Expected: 无匹配（`onEditComment`/`onEditReply` 这两个「设置 target」风格的 prop 名已经在 `CommentItem`/`CommentReplies`/`GuestbookItem`/`GuestbookList`/`comment-list.tsx` 里被 `onSubmitEditComment`/`onSubmitEditReply` 取代；`use-comment-section-state.ts` 里同名的 `handleEditComment`/`handleEditReply`——即「设置 editTarget」的函数——仍然保留给 `ModalComments` 用，属于预期保留项，不在本次搜索目标范围内，因为搜索的是「组件 prop 类型签名」而非 hook 内部函数名）。

- [ ] **Step 6: 如发现问题，修复后单独提交**

若 Step 1-5 任一步骤失败，定位具体文件修复，修复后重新跑对应步骤直到全部通过。修复内容按「做了什么」提交：

```bash
git add <fixed files>
git commit -m "$(cat <<'EOF'
fix(comments): 修复内联编辑器改造遗留问题
EOF
)"
```

（若全部验证一次通过，本任务无需提交。）
