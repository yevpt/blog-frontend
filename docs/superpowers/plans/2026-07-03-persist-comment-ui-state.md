# 持久化评论 UI 状态跨路由导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复"打开评论弹窗/展开回复后，点击站内 `<Link>` 跳走再返回，状态丢失"的 bug。

**Architecture:** 根因是 Next.js App Router 客户端路由切换时会卸载离开页面的组件子树，与 `staleTimes`/RSC 缓存无关（已用生产构建 + Network 面板验证：返回导航没有发起新的整页请求，但组件状态仍丢失）。修复方式是把两块瞬时 UI 状态从页面级 `useState` 挪到 Zustand store：

1. 评论弹窗（`activeComment`）迁移到全局 store + 挂载在 `app/providers/global-modals.tsx`（与现有 `MomentModal`/`LoginModal` 同级），使弹窗整棵子树（含内部嵌套的 `CommentReplies`）脱离页面路由树，不再随路由切换卸载。
2. 回复展开态（`comment-replies.tsx` 的 `isOpen`）迁移到按 `targetType:commentId` 键控的 Zustand store。这个修复覆盖面更广：无论是弹窗内的评论、留言板（`guestbook-item.tsx`）还是文章详情页内联评论（`article-comments.tsx` → `InlineComments`），都共用 `CommentReplies` 这一个组件，一次修复三处生效，不需要单独处理留言板。

**Tech Stack:** React 19、Next.js App Router（`apps/web`）、Zustand、Vitest + Testing Library、TypeScript。

## Global Constraints

- 禁 `any`（用 `unknown` 或精确类型）；优先纯函数 + Early Return；命名 `camelCase`/`PascalCase`/`UPPER_SNAKE_CASE`；非显然逻辑写中文注释 —— AGENTS.md。
- 复用优先：本计划复用仓库已有的 `useMomentModal`/`useLoginModal` store 模式，不发明新范式。
- 改 Hook/组件/页面必须有匹配的 `*.test.ts(x)` 更新，缺测 = 未完成 —— AGENTS.md。
- 每个用到 Zustand store 的测试文件必须在 `beforeEach` 里 `setState` 复位，否则测试间会互相污染（`.agents/skills/writing-tests/SKILL.md`）。
- commit message 需通过 `scripts/validate-commit-msg.cjs` 强校验，格式见 `.agents/skills/git-commit/SKILL.md`。
- 不在本计划范围内：`GuestbookItem`/`CommentItem`/`ReplyItem` 内部「正在回复/正在编辑」这类表单态（`isReplying`/`isEditing`）——这些是合理的、大多数网站也不会跨导航保留的临时输入态，不属于本次修复的 3 个 bug 场景。

---

### Task 1: `useCommentModal` Zustand store

**Files:**

- Create: `apps/web/store/use-comment-modal.ts`
- Test: `apps/web/store/use-comment-modal.test.ts`

**Interfaces:**

- Produces: `useCommentModal` — Zustand store 单例。
  - State: `targetType: "article" | "moment" | null`，`targetId: number | null`，`onCommentAdded: (() => void) | null`。
  - Actions: `open(targetType: "article" | "moment", targetId: number, onCommentAdded?: () => void): void`；`close(): void`。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/store/use-comment-modal.test.ts`：

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommentModal } from "./use-comment-modal";

describe("useCommentModal", () => {
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null });
  });

  it("初始状态无打开目标", () => {
    const state = useCommentModal.getState();
    expect(state.targetType).toBeNull();
    expect(state.targetId).toBeNull();
    expect(state.onCommentAdded).toBeNull();
  });

  it("open() 写入 targetType/targetId/onCommentAdded", () => {
    const onCommentAdded = vi.fn();
    useCommentModal.getState().open("article", 7, onCommentAdded);

    const state = useCommentModal.getState();
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
    expect(state.onCommentAdded).toBe(onCommentAdded);
  });

  it("open() 不传 onCommentAdded 时该字段为 null", () => {
    useCommentModal.getState().open("moment", 3);
    expect(useCommentModal.getState().onCommentAdded).toBeNull();
  });

  it("close() 清空所有字段", () => {
    useCommentModal.getState().open("article", 7, vi.fn());
    useCommentModal.getState().close();

    const state = useCommentModal.getState();
    expect(state.targetType).toBeNull();
    expect(state.targetId).toBeNull();
    expect(state.onCommentAdded).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run store/use-comment-modal.test.ts`
Expected: FAIL（`use-comment-modal.ts` 模块不存在）

- [ ] **Step 3: 实现 store**

创建 `apps/web/store/use-comment-modal.ts`：

```ts
import { create } from "zustand";

type CommentModalTargetType = "article" | "moment";

interface CommentModalStore {
  targetType: CommentModalTargetType | null;
  targetId: number | null;
  onCommentAdded: (() => void) | null;
  open: (targetType: CommentModalTargetType, targetId: number, onCommentAdded?: () => void) => void;
  close: () => void;
}

export const useCommentModal = create<CommentModalStore>((set) => ({
  targetType: null,
  targetId: null,
  onCommentAdded: null,
  open: (targetType, targetId, onCommentAdded) =>
    set({ targetType, targetId, onCommentAdded: onCommentAdded ?? null }),
  close: () => set({ targetType: null, targetId: null, onCommentAdded: null }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run store/use-comment-modal.test.ts`
Expected: PASS（4 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/store/use-comment-modal.ts apps/web/store/use-comment-modal.test.ts
git commit -m "$(cat <<'EOF'
feat(comments): 新增 useCommentModal 全局 store

为后续把评论弹窗迁出页面组件树、跨路由导航保活做准备。
EOF
)"
```

---

### Task 2: `GlobalCommentModal` 组件 + 挂载到全局

**Files:**

- Create: `apps/web/components/comments/views/global-comment-modal.tsx`
- Create: `apps/web/components/comments/views/global-comment-modal.test.tsx`
- Modify: `apps/web/components/comments/index.ts`
- Modify: `apps/web/app/providers/global-modals.tsx`

**Interfaces:**

- Consumes: `useCommentModal` from Task 1（`targetType`/`targetId`/`onCommentAdded`/`close`）；已有的 `CommentModal` from `./comment-modal`（props：`targetType`、`targetId`、`onClose`、`onCommentAdded?`）。
- Produces: `GlobalCommentModal` — 无 props 的组件，导出自 `@/components/comments`。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/components/comments/views/global-comment-modal.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCommentModal } from "@/store/use-comment-modal";
import { GlobalCommentModal } from "./global-comment-modal";

vi.mock("./comment-modal", () => ({
  CommentModal: ({
    targetId,
    targetType,
    onClose,
  }: {
    targetId: number;
    targetType: string;
    onClose: () => void;
  }) => (
    <div
      data-testid="comment-modal"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    >
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

describe("GlobalCommentModal", () => {
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null });
  });

  it("store 无打开目标时不渲染任何内容", () => {
    const { container } = render(<GlobalCommentModal />);
    expect(container.innerHTML).toBe("");
  });

  it("store 有打开目标时渲染 CommentModal 并传入正确 props", () => {
    useCommentModal.getState().open("article", 42);
    render(<GlobalCommentModal />);

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("42");
    expect(modal.dataset.targetType).toBe("article");
  });

  it("CommentModal 的 onClose 调用 store.close()", () => {
    useCommentModal.getState().open("moment", 9);
    render(<GlobalCommentModal />);

    fireEvent.click(screen.getByText("关闭"));

    expect(useCommentModal.getState().targetType).toBeNull();
    expect(useCommentModal.getState().targetId).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run components/comments/views/global-comment-modal.test.tsx`
Expected: FAIL（`global-comment-modal.tsx` 不存在）

- [ ] **Step 3: 实现组件**

创建 `apps/web/components/comments/views/global-comment-modal.tsx`：

```tsx
"use client";

import { useCommentModal } from "@/store/use-comment-modal";
import { CommentModal } from "./comment-modal";

export function GlobalCommentModal() {
  const targetType = useCommentModal((s) => s.targetType);
  const targetId = useCommentModal((s) => s.targetId);
  const onCommentAdded = useCommentModal((s) => s.onCommentAdded);
  const close = useCommentModal((s) => s.close);

  if (targetType === null || targetId === null) {
    return null;
  }

  return (
    <CommentModal
      targetType={targetType}
      targetId={targetId}
      onClose={close}
      onCommentAdded={onCommentAdded ?? undefined}
    />
  );
}
```

修改 `apps/web/components/comments/index.ts`，在现有导出后追加一行：

```ts
export { GlobalCommentModal } from "./views/global-comment-modal";
```

修改 `apps/web/app/providers/global-modals.tsx`：

```tsx
"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { OAuthResultHandler } from "@/components/auth/oauth-result-handler";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { MomentModal } from "@/components/moments/moment-modal";
import { GlobalCommentModal } from "@/components/comments";
import { ImageViewerHost } from "@/components/common/image-viewer-host";

export function GlobalModals() {
  return (
    <>
      <OAuthResultHandler />
      <LoginModal />
      <MomentModal />
      <GlobalCommentModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} position="top-right" className="top-20" />
    </>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run components/comments/views/global-comment-modal.test.tsx`
Expected: PASS（3 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/views/global-comment-modal.tsx \
  apps/web/components/comments/views/global-comment-modal.test.tsx \
  apps/web/components/comments/index.ts \
  apps/web/app/providers/global-modals.tsx
git commit -m "$(cat <<'EOF'
feat(comments): 新增全局挂载的 GlobalCommentModal

挂载在 GlobalModals（根 layout 常驻），使评论弹窗子树不再随
打开它的页面路由切换而卸载，为后续迁移各调用方做准备。
EOF
)"
```

---

### Task 3: 迁移 `article-section.tsx` 到全局 store

**Files:**

- Modify: `apps/web/components/articles/article-section.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

**Interfaces:**

- Consumes: `useCommentModal` from Task 1.

- [ ] **Step 1: 修改测试断言打开方式**

在 `apps/web/components/articles/article-section.test.tsx` 中：

1. 删除对 `@/components/comments` 的 mock（第 180-185 行的 `vi.mock("@/components/comments", ...)` 整块），改为 mock `@/store/use-comment-modal`。在文件顶部其他 `vi.mock` 附近（例如紧邻 `vi.mock("@/store/use-login-modal", ...)` 之后）加入：

```ts
const mockOpenCommentModal = vi.fn();

vi.mock("@/store/use-comment-modal", () => ({
  useCommentModal: () => ({ open: mockOpenCommentModal }),
}));
```

2. 把原来第 576-590 行的用例：

```ts
  it("点击评论按钮后弹窗接收到正确的 articleId", async () => {
    const user = userEvent.setup();

    render(
      <ArticleSection
        initialPage={makePageResp({ list: [makeArticle(7, "目标文章")] })}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByLabelText("评论"));

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("7");
  });
```

替换为：

```ts
  it("点击评论按钮后调用 useCommentModal.open 并传入正确的 articleId", async () => {
    const user = userEvent.setup();

    render(
      <ArticleSection
        initialPage={makePageResp({ list: [makeArticle(7, "目标文章")] })}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByLabelText("评论"));

    expect(mockOpenCommentModal).toHaveBeenCalledWith("article", 7, expect.any(Function));
  });
```

3. 在文件顶部合适位置（靠近其他 `let mockSessionUserId` 声明处）确保测试间复位：找到已有的 `beforeEach`（若没有独立的顶层 `beforeEach` 块则在 `describe` 内第一个 `beforeEach` 里）追加 `mockOpenCommentModal.mockClear();`。若该文件已有 `afterEach(() => { vi.clearAllMocks(); })` 或等价逻辑覆盖所有 `vi.fn()`，无需重复添加。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run components/articles/article-section.test.tsx`
Expected: FAIL（`article-section.tsx` 仍渲染 `<CommentModal>`，且 store mock 未被组件使用，`mockOpenCommentModal` 未被调用）

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/articles/article-section.tsx` 中：

1. 删除 `import { CommentModal } from "@/components/comments";`（第 11 行）。
2. 新增 `import { useCommentModal } from "@/store/use-comment-modal";`。
3. 删除 `interface ActiveComment { articleId: number; title: string; type: string; }`（第 41-45 行——`title`/`type` 字段实际未被使用，`type` 恒等于分类名从未等于字面量 `"moment"`，属于死代码，随本次重构一并清理）。
4. 删除 `const [activeComment, setActiveComment] = useState<ActiveComment | null>(null);`（第 73 行）。
5. 新增 `const openCommentModal = useCommentModal((s) => s.open);`（放在 `const { userId } = useSession();` 附近）。
6. 把 `handleCommentAdded`（第 152-161 行）改为不再依赖 `activeComment`，改用参数接收 `articleId`：

```ts
const handleCommentAdded = useCallback(
  (articleId: number) => {
    setArticles((current) =>
      current.map((item) =>
        item.id === articleId ? { ...item, comment_count: item.comment_count + 1 } : item,
      ),
    );
  },
  [setArticles],
);
```

7. 把 `openComment`（第 163-169 行）改为：

```ts
const openComment = useCallback(
  (article: ArticleListItemResp) => {
    openCommentModal("article", article.id, () => handleCommentAdded(article.id));
  },
  [openCommentModal, handleCommentAdded],
);
```

8. 删除渲染末尾的：

```tsx
{
  activeComment !== null && (
    <CommentModal
      targetType={activeComment.type === "moment" ? "moment" : "article"}
      targetId={activeComment.articleId}
      onClose={() => setActiveComment(null)}
      onCommentAdded={handleCommentAdded}
    />
  );
}
```

（`</section>` 前的这一整块，直接移除；`</section>` 前保留 `articleGrid`/`sidebar` 渲染逻辑不变。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run components/articles/article-section.test.tsx`
Expected: PASS（全部用例，含新的 open 断言）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/articles/article-section.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "$(cat <<'EOF'
fix(articles): 评论弹窗迁移到全局 store，避免返回导航后状态丢失

article-section.tsx 原来用页面内 useState 管理 activeComment，
点击站内 Link 离开页面时组件树被 Next.js 卸载，弹窗状态随之丢失。
改为调用全局 useCommentModal.open()，弹窗由常驻的 GlobalCommentModal
渲染，不再受页面路由切换影响。
EOF
)"
```

---

### Task 4: 迁移 `moments-section.tsx` 到全局 store

**Files:**

- Modify: `apps/web/components/moments/moments-section.tsx`
- Modify: `apps/web/components/moments/moments-section.test.tsx`

**Interfaces:**

- Consumes: `useCommentModal` from Task 1.

- [ ] **Step 1: 修改测试**

在 `apps/web/components/moments/moments-section.test.tsx` 中：

1. 把第 128-143 行的 `vi.mock("@/components/comments", ...)` 整块删除，改为：

```ts
const mockOpenCommentModal = vi.fn();

vi.mock("@/store/use-comment-modal", () => ({
  useCommentModal: (selector?: (state: { open: typeof mockOpenCommentModal }) => unknown) => {
    const state = { open: mockOpenCommentModal };
    return selector ? selector(state) : state;
  },
}));
```

2. 把第 327-336 行的用例替换为：

```ts
  it("点击评论按钮后调用 useCommentModal.open 并传入正确的 momentId", async () => {
    const user = userEvent.setup();
    render(<MomentsSection initialMoments={[makeMoment(7, SHORT_CONTENT)]} />);

    await user.click(screen.getByLabelText("评论"));

    expect(mockOpenCommentModal).toHaveBeenCalledWith("moment", 7, expect.any(Function));
  });
```

3. 确认文件已有的 `afterEach(() => { vi.clearAllMocks(); })`（若存在）会一并清空 `mockOpenCommentModal`；若没有则在合适的 `beforeEach`/`afterEach` 中加入 `mockOpenCommentModal.mockClear();`。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run components/moments/moments-section.test.tsx`
Expected: FAIL

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/moments/moments-section.tsx` 中：

1. 删除 `import { CommentModal } from "@/components/comments";`（第 7 行）。
2. 新增 `import { useCommentModal } from "@/store/use-comment-modal";`。
3. 删除 `const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);`（第 68 行）。
4. 新增 `const openCommentModal = useCommentModal((s) => s.open);`（放在 `const openMomentModal = useMomentModal((state) => state.open);` 附近）。
5. 把 `handleCommentAdded`（第 90-99 行）改为接受 `momentId` 参数：

```ts
const handleCommentAdded = useCallback(
  (momentId: number) => {
    setMoments((current) =>
      current.map((item) =>
        item.id === momentId ? { ...item, comment_count: item.comment_count + 1 } : item,
      ),
    );
  },
  [setMoments],
);
```

6. 把 `openComment`（第 71-73 行）改为：

```ts
const openComment = useCallback(
  (moment: MomentItemResp) => {
    openCommentModal("moment", moment.id, () => handleCommentAdded(moment.id));
  },
  [openCommentModal, handleCommentAdded],
);
```

7. 删除 `closeComment`（第 80-82 行，不再需要，`GlobalCommentModal` 自带 `onClose`）。
8. 删除渲染末尾的：

```tsx
{
  activeComment !== null && (
    <CommentModal
      targetType="moment"
      targetId={activeComment.momentId}
      onClose={closeComment}
      onCommentAdded={handleCommentAdded}
    />
  );
}
```

（连同外层多余的 `<>...</>` fragment 一并简化：若移除后 `return` 只剩一个 `<section>...</section>`，把最外层的 `<>`/`</>` 也去掉，直接 `return (<section>...</section>);`。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run components/moments/moments-section.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/moments/moments-section.tsx apps/web/components/moments/moments-section.test.tsx
git commit -m "$(cat <<'EOF'
fix(moments): moments-section 评论弹窗迁移到全局 store

同 article-section，避免返回导航后弹窗状态丢失。
EOF
)"
```

---

### Task 5: 迁移 `moments-list.tsx` 到全局 store

**Files:**

- Modify: `apps/web/components/moments/moments-list.tsx`
- Modify: `apps/web/components/moments/moments-list.test.tsx`

**Interfaces:**

- Consumes: `useCommentModal` from Task 1.

- [ ] **Step 1: 修改测试**

在 `apps/web/components/moments/moments-list.test.tsx` 中：

1. 删除第 103-111 行的 `vi.mock("@/components/comments", ...)`，改为：

```ts
const mockOpenCommentModal = vi.fn();

vi.mock("@/store/use-comment-modal", () => ({
  useCommentModal: (selector?: (state: { open: typeof mockOpenCommentModal }) => unknown) => {
    const state = { open: mockOpenCommentModal };
    return selector ? selector(state) : state;
  },
}));
```

2. 把第 207-216 行的用例替换为：

```ts
  it("点击评论后调用 useCommentModal.open 并传入正确的 momentId", async () => {
    const user = userEvent.setup();
    render(<MomentsList initialPage={makePageResp()} />);

    await user.click(screen.getByLabelText("评论"));

    expect(mockOpenCommentModal).toHaveBeenCalledWith("moment", 1, expect.any(Function));
  });
```

3. 文件已有 `afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); })`（第 191-194 行），会自动清空 `mockOpenCommentModal`，无需额外处理。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run components/moments/moments-list.test.tsx`
Expected: FAIL

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/moments/moments-list.tsx` 中：

1. 删除 `import dynamic from "next/dynamic";`（第 5 行）以及：

```ts
const CommentModal = dynamic(() => import("@/components/comments").then((m) => m.CommentModal), {
  ssr: false,
});
```

（第 17-19 行）。2. 新增 `import { useCommentModal } from "@/store/use-comment-modal";`。3. 删除 `const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);`（第 86 行）。4. 新增 `const openCommentModal = useCommentModal((s) => s.open);`（紧邻 `const openMomentModal = useMomentModal((state) => state.open);` 之后）。5. 把 `handleCommentAdded`（第 160-171 行）改为接受 `momentId` 参数：

```ts
const handleCommentAdded = useCallback(
  (momentId: number) => {
    setMoments((current) =>
      current.map((item) =>
        item.id === momentId ? { ...item, comment_count: item.comment_count + 1 } : item,
      ),
    );
  },
  [setMoments],
);
```

6. 把 `openComment`（第 145-147 行）改为：

```ts
const openComment = useCallback(
  (moment: MomentItemResp) => {
    openCommentModal("moment", moment.id, () => handleCommentAdded(moment.id));
  },
  [openCommentModal, handleCommentAdded],
);
```

7. 删除 `closeComment`（第 156-158 行）。
8. 删除渲染末尾的：

```tsx
{
  activeComment !== null && (
    <CommentModal
      targetType="moment"
      targetId={activeComment.momentId}
      onClose={closeComment}
      onCommentAdded={handleCommentAdded}
    />
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run components/moments/moments-list.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/moments/moments-list.tsx apps/web/components/moments/moments-list.test.tsx
git commit -m "$(cat <<'EOF'
fix(moments): moments-list 评论弹窗迁移到全局 store

同时移除不再需要的 next/dynamic 懒加载封装
（GlobalCommentModal 已在 layout 级别统一挂载）。
EOF
)"
```

---

### Task 6: 迁移 `profile-moments-tab.tsx` 到全局 store

**Files:**

- Modify: `apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.tsx`
- Modify: `apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.test.tsx`

**Interfaces:**

- Consumes: `useCommentModal` from Task 1.

- [ ] **Step 1: 修改测试**

在 `apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.test.tsx` 中：

1. 把第 6-8 行的 `ProfileMomentsVirtualList` mock 改为可触发 `onComment`：

```ts
vi.mock("./profile-moments-virtual-list", () => ({
  ProfileMomentsVirtualList: ({
    items,
    onComment,
  }: {
    items: Array<{ id: number; content: string }>;
    onComment?: (item: { id: number; content: string }) => void;
  }) => (
    <div data-testid="profile-moments-virtual-list">
      {items.map((item) => (
        <button key={item.id} aria-label="评论" onClick={() => onComment?.(item)}>
          {item.content}
        </button>
      ))}
    </div>
  ),
}));
```

2. 在文件顶部新增（紧邻已有的 `vi.mock("@/store/use-moment-modal", ...)` 之后）：

```ts
const mockOpenCommentModal = vi.fn();

vi.mock("@/store/use-comment-modal", () => ({
  useCommentModal: (selector: (state: { open: typeof mockOpenCommentModal }) => unknown) =>
    selector({ open: mockOpenCommentModal }),
}));
```

3. 在 `describe("ProfileMomentsTab", ...)` 的 `beforeEach` 里追加 `mockOpenCommentModal.mockClear();`（紧邻 `mockUseMomentList.mockReset();`）。
4. 在文件顶部 import 区加入 `import userEvent from "@testing-library/user-event";`（若尚未导入）。
5. 在文件末尾新增用例：

```ts
  it("点击评论后调用 useCommentModal.open 并传入正确的 momentId", async () => {
    const user = userEvent.setup();
    const moment = {
      id: 7,
      user_id: 1,
      content: "个人页碎语",
      status: 1 as const,
      comment_status: 1 as const,
      read_count: 0,
      is_top: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: [],
      created_at: "2026-05-30T09:00:00Z",
      updated_at: "2026-05-30T09:00:00Z",
    };
    mockUseMomentList.mockReturnValue({
      moments: [moment],
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [moment] },
      isLoadingInitial: false,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner={false} />);

    await user.click(screen.getByLabelText("评论"));

    expect(mockOpenCommentModal).toHaveBeenCalledWith("moment", 7, expect.any(Function));
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run "app/users/[id]/_components/profile-moments-tab/profile-moments-tab.test.tsx"`
Expected: FAIL

- [ ] **Step 3: 修改组件实现**

在 `apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.tsx` 中：

1. 删除 `import dynamic from "next/dynamic";`（第 5 行）以及：

```ts
const CommentModal = dynamic(() => import("@/components/comments").then((m) => m.CommentModal), {
  ssr: false,
});
```

（第 13-15 行）。2. 新增 `import { useCommentModal } from "@/store/use-comment-modal";`。3. 删除 `const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);`（第 46 行）。4. 新增 `const openCommentModal = useCommentModal((s) => s.open);`（紧邻 `const openMomentModal = useMomentModal((state) => state.open);` 之后）。5. 把 `handleCommentAdded`（第 69-80 行）改为接受 `momentId` 参数：

```ts
const handleCommentAdded = useCallback(
  (momentId: number) => {
    setMoments((current) =>
      current.map((item) =>
        item.id === momentId ? { ...item, comment_count: item.comment_count + 1 } : item,
      ),
    );
  },
  [setMoments],
);
```

6. 把 `openComment`（第 54-56 行）改为：

```ts
const openComment = useCallback(
  (moment: MomentItemResp) => {
    openCommentModal("moment", moment.id, () => handleCommentAdded(moment.id));
  },
  [openCommentModal, handleCommentAdded],
);
```

7. 删除 `closeComment`（第 65-67 行）。
8. 删除渲染末尾的：

```tsx
{
  activeComment !== null && (
    <CommentModal
      targetType="moment"
      targetId={activeComment.momentId}
      onClose={closeComment}
      onCommentAdded={handleCommentAdded}
    />
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run "app/users/[id]/_components/profile-moments-tab/profile-moments-tab.test.tsx"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add "apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.tsx" \
  "apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.test.tsx"
git commit -m "$(cat <<'EOF'
fix(profile): 个人页碎语 Tab 评论弹窗迁移到全局 store

同时移除不再需要的 next/dynamic 懒加载封装。
EOF
)"
```

---

### Task 7: `useCommentRepliesStore` Zustand store

**Files:**

- Create: `apps/web/store/use-comment-replies-store.ts`
- Test: `apps/web/store/use-comment-replies-store.test.ts`

**Interfaces:**

- Consumes: `type TargetType` from `@/components/comments/parts/comment-replies`（已存在，`"article" | "moment" | "guestbook"`）。
- Produces: `useCommentRepliesStore` — Zustand store 单例。
  - State: `openKeys: Set<string>`。
  - Actions: `setOpen(targetType: TargetType, commentId: number, open: boolean): void`。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/store/use-comment-replies-store.test.ts`：

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCommentRepliesStore } from "./use-comment-replies-store";

describe("useCommentRepliesStore", () => {
  beforeEach(() => {
    useCommentRepliesStore.setState({ openKeys: new Set() });
  });

  it("初始状态没有任何展开项", () => {
    expect(useCommentRepliesStore.getState().openKeys.size).toBe(0);
  });

  it("setOpen(true) 记录该 targetType+commentId 为展开", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    expect(useCommentRepliesStore.getState().openKeys.has("article:1")).toBe(true);
  });

  it("setOpen(false) 移除该 targetType+commentId", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    useCommentRepliesStore.getState().setOpen("article", 1, false);
    expect(useCommentRepliesStore.getState().openKeys.has("article:1")).toBe(false);
  });

  it("不同 targetType 相同 commentId 互不影响", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    expect(useCommentRepliesStore.getState().openKeys.has("guestbook:1")).toBe(false);
  });

  it("状态未变化时不产生新的 openKeys 引用", () => {
    const before = useCommentRepliesStore.getState().openKeys;
    useCommentRepliesStore.getState().setOpen("article", 1, false);
    expect(useCommentRepliesStore.getState().openKeys).toBe(before);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test:run store/use-comment-replies-store.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 store**

创建 `apps/web/store/use-comment-replies-store.ts`：

```ts
import { create } from "zustand";
import type { TargetType } from "@/components/comments/parts/comment-replies";

interface CommentRepliesStore {
  /** 已展开的回复线程，键为 `${targetType}:${commentId}` */
  openKeys: Set<string>;
  setOpen: (targetType: TargetType, commentId: number, open: boolean) => void;
}

function keyOf(targetType: TargetType, commentId: number): string {
  return `${targetType}:${commentId}`;
}

export const useCommentRepliesStore = create<CommentRepliesStore>((set, get) => ({
  openKeys: new Set(),
  setOpen: (targetType, commentId, open) => {
    const key = keyOf(targetType, commentId);
    const hasKey = get().openKeys.has(key);
    if (hasKey === open) return;
    const next = new Set(get().openKeys);
    if (open) {
      next.add(key);
    } else {
      next.delete(key);
    }
    set({ openKeys: next });
  },
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test:run store/use-comment-replies-store.test.ts`
Expected: PASS（5 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/store/use-comment-replies-store.ts apps/web/store/use-comment-replies-store.test.ts
git commit -m "$(cat <<'EOF'
feat(comments): 新增 useCommentRepliesStore 记录回复展开态

按 targetType+commentId 键控，供 comment-replies.tsx 跨路由
导航恢复展开态使用。
EOF
)"
```

---

### Task 8: 迁移 `comment-replies.tsx` 到 `useCommentRepliesStore`

**Files:**

- Modify: `apps/web/components/comments/parts/comment-replies.tsx`
- Modify: `apps/web/components/comments/parts/comment-replies.test.tsx`

**Interfaces:**

- Consumes: `useCommentRepliesStore` from Task 7.

- [ ] **Step 1: 先改测试文件的 `beforeEach`，避免用例间状态串扰**

在 `apps/web/components/comments/parts/comment-replies.test.tsx` 顶部新增 import：

```ts
import { useCommentRepliesStore } from "@/store/use-comment-replies-store";
```

把已有的：

```ts
beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn();
});
```

改为：

```ts
beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn();
  useCommentRepliesStore.setState({ openKeys: new Set() });
});
```

- [ ] **Step 2: 在同一测试文件末尾新增「跨挂载保持展开态」用例**

在 `describe("CommentReplies", ...)` 块内、`describe("作者编辑入口", ...)` 之后（`});` 收尾前）新增：

```ts
  describe("跨挂载保持展开态", () => {
    it("展开后卸载重新挂载，无需再次点击即自动展开并重新拉取", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

      const { unmount } = render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

      unmount();

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );

      // 重新挂载后不应再显示折叠态的「展开」按钮
      expect(screen.queryByText(/展开 1 条回复/)).toBeNull();
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
    });

    it("未展开过时重新挂载仍保持折叠", () => {
      render(
        <CommentReplies
          commentId={2}
          targetType="article"
          replyCount={3}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      expect(screen.getByText(/展开 3 条回复/)).toBeTruthy();
    });

    it("不同 targetType 相同 commentId 的展开态互不影响", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

      render(
        <CommentReplies
          commentId={1}
          targetType="guestbook"
          replyCount={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      expect(screen.getByText(/展开 1 条回复/)).toBeTruthy();
    });
  });
```

- [ ] **Step 3: 运行测试确认新用例失败、旧用例仍应通过**

Run: `pnpm --filter web test:run components/comments/parts/comment-replies.test.tsx`
Expected: 新增的「跨挂载保持展开态」3 个用例 FAIL（组件还没接入 store，重新挂载后状态丢失），其余既有用例应仍 PASS（`beforeEach` 复位不影响单次挂载内的行为）。

- [ ] **Step 4: 修改组件实现**

在 `apps/web/components/comments/parts/comment-replies.tsx` 中：

1. 顶部 import 增加 `useRef`，并新增 store import：

```ts
import { memo, useState, useCallback, useEffect, useRef } from "react";
```

```ts
import { useCommentRepliesStore } from "@/store/use-comment-replies-store";
```

2. 在 `CommentReplies` 组件内，把：

```ts
const [isOpen, setIsOpen] = useState(false);
const [replies, setReplies] = useState<CommentReplyResp[]>([]);
```

改为：

```ts
const isOpen = useCommentRepliesStore((s) => s.openKeys.has(`${targetType}:${commentId}`));
const setStoreOpen = useCommentRepliesStore((s) => s.setOpen);
const [replies, setReplies] = useState<CommentReplyResp[]>([]);
```

3. 把 `fetchReplies` 里的：

```ts
if (!append) setIsOpen(true);
```

改为：

```ts
if (!append) setStoreOpen(targetType, commentId, true);
```

同时把该 `useCallback` 的依赖数组从 `[targetType, commentId]` 改为 `[targetType, commentId, setStoreOpen]`。

4. 把 `handleToggle` 里的：

```ts
const handleToggle = useCallback(() => {
  if (!isOpen) {
    setError(null);
    void fetchReplies(1, false);
  } else {
    setIsOpen(false);
  }
}, [isOpen, fetchReplies]);
```

改为：

```ts
const handleToggle = useCallback(() => {
  if (!isOpen) {
    setError(null);
    void fetchReplies(1, false);
  } else {
    setStoreOpen(targetType, commentId, false);
  }
}, [isOpen, fetchReplies, setStoreOpen, targetType, commentId]);
```

5. 在 `updateReplyLike`/`updateReply` 声明之后、`handleDeleteReply` 之前（任意两个已有 `useCallback` 之间即可，保持在 `if (replyCount <= 0) return null;` 之前）新增自动恢复展开态的 effect：

```ts
// 展开态从 store 恢复（如路由返回导航后重新挂载）但本地回复数据已清空时，
// 自动重新拉取一次，避免停留在「已展开但空列表」的状态
const didAutoRestoreRef = useRef(false);
useEffect(() => {
  if (didAutoRestoreRef.current) return;
  didAutoRestoreRef.current = true;
  if (isOpen && replies.length === 0) {
    void fetchReplies(1, false);
  }
}, [isOpen, replies.length, fetchReplies]);
```

- [ ] **Step 5: 运行测试确认全部通过**

Run: `pnpm --filter web test:run components/comments/parts/comment-replies.test.tsx`
Expected: PASS（全部用例，含新增的 3 个）

- [ ] **Step 6: 提交**

```bash
git add apps/web/components/comments/parts/comment-replies.tsx apps/web/components/comments/parts/comment-replies.test.tsx
git commit -m "$(cat <<'EOF'
fix(comments): 回复展开态迁移到 useCommentRepliesStore

comment-replies.tsx 原来用组件内 useState 管理 isOpen，页面路由
切换导致组件卸载后展开态丢失（评论弹窗内、留言板、文章详情页内联
评论共用此组件，三处场景一并修复）。展开态改由 store 持有，重新
挂载时若 store 记录为展开但本地回复数据为空，自动重新拉取一次。
EOF
)"
```

---

### Task 9: 全量验证

**Files:** 无新增/修改文件，仅运行检查。

- [ ] **Step 1: 全量类型检查**

Run: `pnpm --filter web check-types`
Expected: 无报错

- [ ] **Step 2: 全量 lint**

Run: `pnpm --filter web lint`
Expected: 无报错（含未使用的 `dynamic`/`CommentModal` import 等死代码检测）

- [ ] **Step 3: 全量测试**

Run: `pnpm --filter web test:run`
Expected: 全部通过

- [ ] **Step 4: 浏览器手动复现验证**

用 preview 工具（`preview_start` 配置 `web-dev`，需确保 `apps/web/.env.local` 指向的后端 `API_BASE_URL` 可访问）走一遍此前定位 bug 时用的复现路径，这次预期结果应反过来：

1. 打开首页，点击一篇有评论的文章的「评论」按钮，展开一条回复。
2. 点击导航栏的站内 `<Link>`（如「友邻」）跳转。
3. `history.back()` 或点击浏览器后退返回首页。
4. 断言：评论弹窗仍处于打开状态，且回复仍处于展开状态（不需要重新点击「展开」）。
5. 额外验证留言板场景：打开 `/guestbook`，展开一条留言的回复 → 跳转 → 返回，确认展开态保留。

Expected: 两处场景状态均保留，不再重现此前记录的 bug。

- [ ] **Step 5: 提交（若前序步骤发现并修复了遗漏，在此处补一个收尾 commit；若无遗漏则跳过，不产生空提交）**

---

## 已知不覆盖范围（供后续参考）

- `CommentItem`/`GuestbookItem`/`ReplyItem` 内部的「正在回复」「正在编辑」表单态（`isReplying`/`isEditing`）不在本次修复范围，跨导航仍会重置——这是合理的默认行为，未被列入本次要修复的 3 个 bug 场景。
- 若后续发现某些交互不是通过 `<Link>`/`history.back()` 触发（例如表单提交后 `router.refresh()`），需要额外验证这类路径下 store 状态是否仍然正确（预期应该没问题，因为 store 完全独立于组件挂载/卸载，但值得留意）。
