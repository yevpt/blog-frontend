# 导航来回恢复态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让评论弹窗支持"前进导航自动隐藏、精确后退才恢复"，并把留言板/评论区的回复与编辑输入框（含已输入草稿）、友邻页"暂别友邻"展开态，纳入跨路由导航保留状态的范围；三者共用同一个全局导航守卫判断"是否应该恢复"。

**Architecture:** 新增一个全局唯一的、模块级"待恢复槽位"（同一时刻至多记一份），由一个只挂载一次的 `NavigationRestoreGuard` 组件维护。规则：每次前进导航（`pathname` 变化且不是 `popstate` 触发的）时，若槽位已有内容则判定为"深度跳转"、内容全部作废，否则把槽位写成"刚离开的页面"；每次 `popstate`（后退/前进按钮、`router.back()`）时，若槽位记的页面等于当前页面则恢复，否则同样作废。评论弹窗新增 `isVisible`/`hide()`/`show()` 参与这套机制；留言板/评论区回复编辑框迁移到一个新的按 key 存储的草稿 store；友邻页展开态迁移到一个新的简单布尔 store。三者都只需要对导航守卫暴露一个"清空"方法，不需要各自感知 pathname。

**Tech Stack:** React 19、Next.js App Router（`apps/web`）、Zustand、Vitest + Testing Library、TypeScript。

## Global Constraints

- 禁 `any`（用 `unknown` 或精确类型）；优先纯函数 + Early Return；命名 `camelCase`/`PascalCase`/`UPPER_SNAKE_CASE`；非显然逻辑写中文注释 —— AGENTS.md。
- 复用优先：本计划复用仓库已有的 Zustand store 模式（`use-comment-modal.ts`、`use-comment-replies-store.ts`），不发明新范式。
- 改 Hook/组件/页面必须有匹配的 `*.test.ts(x)` 更新，缺测 = 未完成 —— AGENTS.md。
- 每个用到 Zustand store 的测试文件必须在 `beforeEach` 里 `setState` 复位，否则测试间会互相污染（`.agents/skills/writing-tests/SKILL.md`）。
- commit message 需通过 `scripts/validate-commit-msg.cjs` 强校验，格式见 `.agents/skills/git-commit/SKILL.md`。
- 不改变浏览器地址栏——整个方案不引入 URL 查询参数或往 History API 的 `state` 里写自定义数据，只读取 `pathname` 和监听原生 `popstate` 事件。
- 完整设计背景见 `docs/superpowers/specs/2026-07-03-navigation-restore-guard-design.md`。

---

### Task 1: `useCommentModal` store 新增 `isVisible`/`hide`/`show`

**Files:**
- Modify: `apps/web/store/use-comment-modal.ts`
- Modify: `apps/web/store/use-comment-modal.test.ts`

**Interfaces:**
- Produces: `useCommentModal` 新增字段 `isVisible: boolean`；新增动作 `hide(): void`（仅隐藏，保留 `targetType`/`targetId`/`onCommentAdded`）、`show(): void`（仅显示，不检查 `targetType`——调用方负责在调用前自行判断是否还有 target）。`open()` 额外把 `isVisible` 置 `true`；`close()` 额外把 `isVisible` 置 `false`。

- [ ] **Step 1: 写失败测试**

打开 `apps/web/store/use-comment-modal.test.ts`，在文件末尾（最后一个 `it` 之后、`});` 之前）追加：

```ts
  it("初始状态 isVisible 为 false", () => {
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("open() 把 isVisible 置为 true", () => {
    useCommentModal.getState().open("article", 7);
    expect(useCommentModal.getState().isVisible).toBe(true);
  });

  it("close() 把 isVisible 置为 false", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().close();
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("hide() 只隐藏，保留 targetType/targetId", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().hide();

    const state = useCommentModal.getState();
    expect(state.isVisible).toBe(false);
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
  });

  it("show() 把 isVisible 置为 true，不改变 target", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().hide();
    useCommentModal.getState().show();

    const state = useCommentModal.getState();
    expect(state.isVisible).toBe(true);
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
  });
```

同时把文件顶部的 `beforeEach` 里的 `setState` 补上 `isVisible: false`：

```ts
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null, isVisible: false });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test store/use-comment-modal.test.ts`
Expected: FAIL（`isVisible`/`hide`/`show` 不存在）

- [ ] **Step 3: 修改 store 实现**

把 `apps/web/store/use-comment-modal.ts` 整个文件内容替换为：

```ts
import { create } from "zustand";

type CommentModalTargetType = "article" | "moment";

interface CommentModalStore {
  targetType: CommentModalTargetType | null;
  targetId: number | null;
  onCommentAdded: (() => void) | null;
  isVisible: boolean;
  open: (targetType: CommentModalTargetType, targetId: number, onCommentAdded?: () => void) => void;
  close: () => void;
  /** 导航守卫用：前进导航时调用，仅隐藏，保留 target 供后续可能的 show() 恢复 */
  hide: () => void;
  /** 导航守卫用：精确后退回到打开弹窗的页面时调用 */
  show: () => void;
}

export const useCommentModal = create<CommentModalStore>((set) => ({
  targetType: null,
  targetId: null,
  onCommentAdded: null,
  isVisible: false,
  open: (targetType, targetId, onCommentAdded) =>
    set({ targetType, targetId, onCommentAdded: onCommentAdded ?? null, isVisible: true }),
  close: () => set({ targetType: null, targetId: null, onCommentAdded: null, isVisible: false }),
  hide: () => set({ isVisible: false }),
  show: () => set({ isVisible: true }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test store/use-comment-modal.test.ts`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交**

```bash
git add apps/web/store/use-comment-modal.ts apps/web/store/use-comment-modal.test.ts
git commit -m "$(cat <<'EOF'
feat(comments): useCommentModal 新增 isVisible/hide/show

为导航守卫的「前进隐藏、精确后退恢复」机制做准备。
EOF
)"
```

---

### Task 2: `GlobalCommentModal` 渲染条件加上 `isVisible`

**Files:**
- Modify: `apps/web/components/comments/views/global-comment-modal.tsx`
- Modify: `apps/web/components/comments/views/global-comment-modal.test.tsx`

**Interfaces:**
- Consumes: `useCommentModal` 的 `isVisible` from Task 1。

- [ ] **Step 1: 写失败测试**

打开 `apps/web/components/comments/views/global-comment-modal.test.tsx`，在现有 `describe("GlobalCommentModal", ...)` 块内追加一个用例（放在已有用例之后）：

```tsx
  it("有 target 但 isVisible 为 false 时不渲染", () => {
    useCommentModal.setState({ targetType: "article", targetId: 42, onCommentAdded: null, isVisible: false });
    const { container } = render(<GlobalCommentModal />);
    expect(container.innerHTML).toBe("");
  });
```

同时把文件里已有的 `beforeEach` 改成同时复位 `isVisible`：

```ts
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null, isVisible: false });
  });
```

以及把已有的"store 有打开目标时渲染 CommentModal"这条用例里的 `useCommentModal.getState().open("article", 42);` 保持不变（`open()` 已经会把 `isVisible` 置 true，这条用例不需要改）。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/comments/views/global-comment-modal.test.tsx`
Expected: FAIL（新用例失败，因为组件目前只检查 `targetType`/`targetId`，`isVisible=false` 时仍会渲染）

- [ ] **Step 3: 修改组件实现**

打开 `apps/web/components/comments/views/global-comment-modal.tsx`，把：

```tsx
export function GlobalCommentModal() {
  const targetType = useCommentModal((s) => s.targetType);
  const targetId = useCommentModal((s) => s.targetId);
  const onCommentAdded = useCommentModal((s) => s.onCommentAdded);
  const close = useCommentModal((s) => s.close);

  if (targetType === null || targetId === null) {
    return null;
  }
```

改为：

```tsx
export function GlobalCommentModal() {
  const targetType = useCommentModal((s) => s.targetType);
  const targetId = useCommentModal((s) => s.targetId);
  const onCommentAdded = useCommentModal((s) => s.onCommentAdded);
  const isVisible = useCommentModal((s) => s.isVisible);
  const close = useCommentModal((s) => s.close);

  if (targetType === null || targetId === null || !isVisible) {
    return null;
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test components/comments/views/global-comment-modal.test.tsx`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/views/global-comment-modal.tsx apps/web/components/comments/views/global-comment-modal.test.tsx
git commit -m "$(cat <<'EOF'
feat(comments): GlobalCommentModal 渲染条件加入 isVisible
EOF
)"
```

---

### Task 3: `useInlineEditorStore` store

**Files:**
- Create: `apps/web/store/use-inline-editor-store.ts`
- Test: `apps/web/store/use-inline-editor-store.test.ts`

**Interfaces:**
- Produces: `useInlineEditorStore` — Zustand store。
  - State: `editors: Record<string, { isOpen: boolean; content: string }>`。
  - Actions: `open(key: string, initialContent?: string): void`（写入 `{isOpen: true, content: initialContent ?? ""}`）；`setContent(key: string, content: string): void`（只更新已存在 key 的 content，key 不存在时不做任何事）；`close(key: string): void`（从 `editors` 里删除该 key）；`submitSuccess(key: string): void`（同 `close`，从 `editors` 里删除该 key）；`discardAll(): void`（清空整个 `editors`）。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/store/use-inline-editor-store.test.ts`：

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useInlineEditorStore } from "./use-inline-editor-store";

describe("useInlineEditorStore", () => {
  beforeEach(() => {
    useInlineEditorStore.setState({ editors: {} });
  });

  it("初始状态没有任何 editor", () => {
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });

  it("open() 写入 isOpen=true 和初始内容", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    expect(useInlineEditorStore.getState().editors.k1).toEqual({ isOpen: true, content: "草稿" });
  });

  it("open() 不传初始内容时 content 为空字符串", () => {
    useInlineEditorStore.getState().open("k1");
    expect(useInlineEditorStore.getState().editors.k1).toEqual({ isOpen: true, content: "" });
  });

  it("setContent() 更新已存在 key 的内容", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().setContent("k1", "改过的草稿");
    expect(useInlineEditorStore.getState().editors.k1?.content).toBe("改过的草稿");
    expect(useInlineEditorStore.getState().editors.k1?.isOpen).toBe(true);
  });

  it("setContent() 对不存在的 key 不做任何事", () => {
    useInlineEditorStore.getState().setContent("missing", "内容");
    expect(useInlineEditorStore.getState().editors.missing).toBeUndefined();
  });

  it("close() 删除该 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().close("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
  });

  it("submitSuccess() 删除该 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().submitSuccess("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
  });

  it("discardAll() 清空所有 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿1");
    useInlineEditorStore.getState().open("k2", "草稿2");
    useInlineEditorStore.getState().discardAll();
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });

  it("不同 key 互不影响", () => {
    useInlineEditorStore.getState().open("k1", "草稿1");
    useInlineEditorStore.getState().open("k2", "草稿2");
    useInlineEditorStore.getState().close("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
    expect(useInlineEditorStore.getState().editors.k2).toEqual({ isOpen: true, content: "草稿2" });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test store/use-inline-editor-store.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 store**

创建 `apps/web/store/use-inline-editor-store.ts`：

```ts
import { create } from "zustand";

interface InlineEditorEntry {
  isOpen: boolean;
  content: string;
}

interface InlineEditorStore {
  /** key 由调用方拼，约定为 `${作用域}:${目标ID}:${reply|edit}` */
  editors: Record<string, InlineEditorEntry>;
  open: (key: string, initialContent?: string) => void;
  setContent: (key: string, content: string) => void;
  close: (key: string) => void;
  submitSuccess: (key: string) => void;
  discardAll: () => void;
}

function removeKey(
  editors: Record<string, InlineEditorEntry>,
  key: string,
): Record<string, InlineEditorEntry> {
  if (!(key in editors)) return editors;
  const next = { ...editors };
  delete next[key];
  return next;
}

export const useInlineEditorStore = create<InlineEditorStore>((set) => ({
  editors: {},
  open: (key, initialContent = "") =>
    set((state) => ({
      editors: { ...state.editors, [key]: { isOpen: true, content: initialContent } },
    })),
  setContent: (key, content) =>
    set((state) => {
      const entry = state.editors[key];
      if (!entry) return state;
      return { editors: { ...state.editors, [key]: { ...entry, content } } };
    }),
  close: (key) => set((state) => ({ editors: removeKey(state.editors, key) })),
  submitSuccess: (key) => set((state) => ({ editors: removeKey(state.editors, key) })),
  discardAll: () => set({ editors: {} }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test store/use-inline-editor-store.test.ts`
Expected: PASS（9 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/store/use-inline-editor-store.ts apps/web/store/use-inline-editor-store.test.ts
git commit -m "$(cat <<'EOF'
feat(comments): 新增 useInlineEditorStore 记录回复/编辑草稿

按 key 存储展开态和已输入内容，供留言板/评论区的回复、编辑
输入框跨路由导航保留使用。
EOF
)"
```

---

### Task 4: `useFriendLinksPausedStore` store

**Files:**
- Create: `apps/web/store/use-friend-links-paused-store.ts`
- Test: `apps/web/store/use-friend-links-paused-store.test.ts`

**Interfaces:**
- Produces: `useFriendLinksPausedStore` — Zustand store。State: `open: boolean`。Actions: `setOpen(open: boolean): void`、`reset(): void`（等价于 `setOpen(false)`）。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/store/use-friend-links-paused-store.test.ts`：

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useFriendLinksPausedStore } from "./use-friend-links-paused-store";

describe("useFriendLinksPausedStore", () => {
  beforeEach(() => {
    useFriendLinksPausedStore.setState({ open: false });
  });

  it("初始状态 open 为 false", () => {
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("setOpen(true) 展开", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    expect(useFriendLinksPausedStore.getState().open).toBe(true);
  });

  it("setOpen(false) 收起", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    useFriendLinksPausedStore.getState().setOpen(false);
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("reset() 把 open 置为 false", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    useFriendLinksPausedStore.getState().reset();
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test store/use-friend-links-paused-store.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 store**

创建 `apps/web/store/use-friend-links-paused-store.ts`：

```ts
import { create } from "zustand";

interface FriendLinksPausedStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** 导航守卫触发时调用 */
  reset: () => void;
}

export const useFriendLinksPausedStore = create<FriendLinksPausedStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  reset: () => set({ open: false }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test store/use-friend-links-paused-store.test.ts`
Expected: PASS（4 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/store/use-friend-links-paused-store.ts apps/web/store/use-friend-links-paused-store.test.ts
git commit -m "$(cat <<'EOF'
feat(friend-links): 新增 useFriendLinksPausedStore 记录展开态
EOF
)"
```

---

### Task 5: `InlineReplyEditor` 从不受控改为受控

**Files:**
- Modify: `apps/web/components/comments/inputs/inline-reply-editor.tsx`
- Modify: `apps/web/components/comments/inputs/inline-reply-editor.test.tsx`

**Interfaces:**
- Produces: `InlineReplyEditor` 新 props 签名 `{ value: string; onChange: (value: string) => void; placeholder: string; header?: ReactNode; isLoggedIn?: boolean; onLoginRequired?: () => void; onSubmit: (content: string) => Promise<boolean>; className?: string; }`——移除原来的 `initialValue`，新增必填的 `value`/`onChange`。

- [ ] **Step 1: 改测试为受控写法**

把 `apps/web/components/comments/inputs/inline-reply-editor.test.tsx` 整个文件内容替换为：

```tsx
// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineReplyEditor, type InlineReplyEditorProps } from "./inline-reply-editor";

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
      <textarea data-testid="textarea" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" disabled={isSubmitting} onClick={onSubmit}>
        发送
      </button>
    </div>
  ),
}));

/** 测试用受控外壳：真实调用方（CommentItem 等）从 store 读写 value，这里用本地 state 模拟同样的受控关系 */
function ControlledHarness({
  initialValue = "",
  ...props
}: Omit<InlineReplyEditorProps, "value" | "onChange"> & { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <InlineReplyEditor value={value} onChange={setValue} {...props} />;
}

describe("InlineReplyEditor", () => {
  it("渲染 value 作为内容", () => {
    render(
      <InlineReplyEditor
        value="草稿内容"
        onChange={vi.fn()}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("草稿内容");
  });

  it("value 为空字符串时内容为空", () => {
    render(
      <InlineReplyEditor
        value=""
        onChange={vi.fn()}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("");
  });

  it("输入时调用 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InlineReplyEditor
        value=""
        onChange={onChange}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    await user.type(screen.getByTestId("textarea"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("渲染传入的 header", () => {
    render(
      <InlineReplyEditor
        value=""
        onChange={vi.fn()}
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
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "  hello  ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("内容为空白时点击发送不调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "   ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("提交进行中 RichCommentInput 收到 isSubmitting=true", async () => {
    const user = userEvent.setup();
    let resolveSubmit!: (v: boolean) => void;
    const onSubmit = vi.fn(() => new Promise<boolean>((resolve) => (resolveSubmit = resolve)));
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "hello");
    await user.click(screen.getByText("发送"));

    expect(screen.getByText("发送")).toBeDisabled();
    resolveSubmit(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/comments/inputs/inline-reply-editor.test.tsx`
Expected: FAIL（组件还没导出 `InlineReplyEditorProps` 类型，`value`/`onChange` props 也还不存在）

- [ ] **Step 3: 修改组件实现**

把 `apps/web/components/comments/inputs/inline-reply-editor.tsx` 整个文件内容替换为：

```tsx
"use client";

import { useCallback, useState, type ReactNode } from "react";
import { RichCommentInput } from "./rich-comment-input";

export interface InlineReplyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  header?: ReactNode;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onSubmit: (content: string) => Promise<boolean>;
  className?: string;
}

/**
 * 内联回复/编辑输入框：封装「提交中状态 + RichCommentInput」，内容完全受控
 * （由调用方从 store 读写 value，这样组件卸载后草稿仍留在 store 里，重新挂载时能原样恢复）。
 * 本组件不负责收起自己——调用方决定「是否展开」，提交成功后调用方会把它从渲染树里移除。
 */
export function InlineReplyEditor({
  value,
  onChange,
  placeholder,
  header,
  isLoggedIn,
  onLoginRequired,
  onSubmit,
  className,
}: InlineReplyEditorProps) {
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
        onChange={onChange}
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

Run: `pnpm --filter web test components/comments/inputs/inline-reply-editor.test.tsx`
Expected: PASS（8 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/inputs/inline-reply-editor.tsx apps/web/components/comments/inputs/inline-reply-editor.test.tsx
git commit -m "$(cat <<'EOF'
refactor(comments): InlineReplyEditor 从不受控改为受控组件

value/onChange 由调用方持有，为后续接入 useInlineEditorStore
做准备——不受控时草稿只在组件内部，卸载即丢失。
EOF
)"
```

---

### Task 6: `NavigationRestoreGuard` 组件 + 挂载

**Files:**
- Create: `apps/web/app/providers/navigation-restore-guard.tsx`
- Create: `apps/web/app/providers/navigation-restore-guard.test.tsx`
- Modify: `apps/web/app/providers/global-modals.tsx`

**Interfaces:**
- Consumes: `useCommentModal`（`getState().targetType`/`isVisible`/`hide()`/`show()`/`close()`，from Task 1）、`useInlineEditorStore`（`getState().discardAll()`，from Task 3）、`useFriendLinksPausedStore`（`getState().reset()`，from Task 4）。
- Produces: `NavigationRestoreGuard` —— 无 props、不渲染任何内容的组件，只在根 layout 挂载一次。同文件导出 `useNavigationRestoreSlot`（内部用的单槽位 store，`{ pathname: string | null }`，仅供测试 `setState()` 复位，不对外提供给业务组件使用）。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/app/providers/navigation-restore-guard.test.tsx`：

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import type { ReactElement } from "react";
import { useCommentModal } from "@/store/use-comment-modal";
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
import { NavigationRestoreGuard, useNavigationRestoreSlot } from "./navigation-restore-guard";

const mockPathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

/** 模拟一次「前进导航」：改地址栏 + 改 mock 的 usePathname 返回值 + 重新渲染 */
function pushTo(rerender: (ui: ReactElement) => void, path: string) {
  window.history.pushState({}, "", path);
  mockPathname.value = path;
  act(() => {
    rerender(<NavigationRestoreGuard />);
  });
}

/** 模拟一次「后退/前进按钮」：改地址栏到目标路径 + 派发原生 popstate + 重新渲染让 usePathname 跟上 */
function popTo(rerender: (ui: ReactElement) => void, path: string) {
  window.history.pushState({}, "", path);
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  mockPathname.value = path;
  act(() => {
    rerender(<NavigationRestoreGuard />);
  });
}

describe("NavigationRestoreGuard", () => {
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null, isVisible: false });
    useInlineEditorStore.setState({ editors: {} });
    useFriendLinksPausedStore.setState({ open: false });
    useNavigationRestoreSlot.setState({ pathname: null });
    mockPathname.value = "/";
    window.history.pushState({}, "", "/");
  });

  it("前进导航时隐藏可见的评论弹窗", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");

    expect(useCommentModal.getState().isVisible).toBe(false);
    expect(useCommentModal.getState().targetType).toBe("article");
  });

  it("前进后精确后退回到原页面，恢复弹窗显示", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    expect(useCommentModal.getState().isVisible).toBe(false);

    popTo(rerender, "/");
    expect(useCommentModal.getState().isVisible).toBe(true);
    expect(useCommentModal.getState().targetType).toBe("article");
  });

  it("深度跳转（连续两次前进）后，原页面的弹窗状态作废", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    pushTo(rerender, "/moments");

    expect(useCommentModal.getState().targetType).toBeNull();
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("退回的不是原页面时，状态作废而不是恢复", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    popTo(rerender, "/some-other-page");

    expect(useCommentModal.getState().targetType).toBeNull();
  });

  it("深度跳转时同时清空草稿 store 和友邻展开 store", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useFriendLinksPausedStore.getState().setOpen(true);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    pushTo(rerender, "/moments");

    expect(useInlineEditorStore.getState().editors).toEqual({});
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("点导航栏链接跳回原路径（前进导航，不是后退）不恢复弹窗", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    // 这里用 pushTo 而不是 popTo：模拟点击导航栏链接跳回「/」，不是浏览器后退按钮
    pushTo(rerender, "/");

    expect(useCommentModal.getState().targetType).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test app/providers/navigation-restore-guard.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现组件**

创建 `apps/web/app/providers/navigation-restore-guard.tsx`：

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { useCommentModal } from "@/store/use-comment-modal";
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";

interface RestoreSlotStore {
  pathname: string | null;
}

/**
 * 全局单槽位：记着「最近一次前进导航离开的那个页面」，用于判断后退时是否应该恢复。
 * 只用 getState()/setState() 命令式读写，不作为 React hook 订阅——不会触发任何组件
 * 重渲染，用 Zustand 只是为了能像仓库里其他 store 一样在测试的 beforeEach 里 setState 复位。
 */
export const useNavigationRestoreSlot = create<RestoreSlotStore>(() => ({ pathname: null }));

function discardStaleState() {
  useCommentModal.getState().close();
  useInlineEditorStore.getState().discardAll();
  useFriendLinksPausedStore.getState().reset();
}

/** 全局挂载一次，不渲染任何内容 */
export function NavigationRestoreGuard() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const isFirstRenderRef = useRef(true);
  // popstate 处理函数里置位，pathname 变化的 effect 里读到即消费掉，
  // 避免同一次后退/前进导航被误判成一次新的前进导航
  const consumedByPopRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      consumedByPopRef.current = true;
      const currentPathname = window.location.pathname;
      const slotPathname = useNavigationRestoreSlot.getState().pathname;
      if (slotPathname !== null && slotPathname === currentPathname) {
        if (useCommentModal.getState().targetType !== null) {
          useCommentModal.getState().show();
        }
        useNavigationRestoreSlot.setState({ pathname: null });
      } else if (slotPathname !== null) {
        discardStaleState();
        useNavigationRestoreSlot.setState({ pathname: null });
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPathnameRef.current = pathname;
      return;
    }
    if (consumedByPopRef.current) {
      consumedByPopRef.current = false;
      prevPathnameRef.current = pathname;
      return;
    }
    // 走到这里说明是一次前进导航（Link 点击、router.push 等）
    if (useNavigationRestoreSlot.getState().pathname !== null) {
      discardStaleState();
    }
    useNavigationRestoreSlot.setState({ pathname: prevPathnameRef.current });
    if (useCommentModal.getState().isVisible) {
      useCommentModal.getState().hide();
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
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
import { NavigationRestoreGuard } from "./navigation-restore-guard";

export function GlobalModals() {
  return (
    <>
      <OAuthResultHandler />
      <NavigationRestoreGuard />
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

Run: `pnpm --filter web test app/providers/navigation-restore-guard.test.tsx`
Expected: PASS（6 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add apps/web/app/providers/navigation-restore-guard.tsx apps/web/app/providers/navigation-restore-guard.test.tsx apps/web/app/providers/global-modals.tsx
git commit -m "$(cat <<'EOF'
feat(navigation): 新增 NavigationRestoreGuard 统一导航守卫

前进导航自动隐藏/作废，精确后退到原页面才恢复；深度跳转
（连续两次前进）判定原状态整体作废。驱动评论弹窗、回复草稿、
友邻展开态三处的 hide/show/discard。
EOF
)"
```

---

### Task 7: 迁移 `comment-item.tsx` 到 `useInlineEditorStore`

**Files:**
- Modify: `apps/web/components/comments/parts/comment-item.tsx`
- Modify: `apps/web/components/comments/parts/comment-item.test.tsx`

**Interfaces:**
- Consumes: `useInlineEditorStore` from Task 3（`open`/`setContent`/`close`/`submitSuccess`）；`InlineReplyEditor` 新的 `value`/`onChange` props from Task 5。
- key 约定：回复框 `` `${targetType}-comment:${comment.id}:reply` ``，编辑框 `` `${targetType}-comment:${comment.id}:edit` ``。

- [ ] **Step 1: 改测试**

在 `apps/web/components/comments/parts/comment-item.test.tsx` 中：

1. 把第 49-67 行的 `vi.mock("../inputs/inline-reply-editor", ...)` 整块替换为：

```tsx
vi.mock("../inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    value,
    onChange,
    header,
    onSubmit,
  }: {
    value: string;
    onChange: (v: string) => void;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-reply-editor">
      {header}
      <textarea
        data-testid="inline-editor-value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={() => void onSubmit(value || "内联提交内容")}>
        提交
      </button>
    </div>
  ),
}));
```

2. 在文件顶部（`vi.mock("@/store/use-login-modal", ...)` 之后）新增一段真实使用 store 的 mock（不用假 store，直接引入真实模块，让测试断言真实的展开/持久化行为）：

```tsx
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

3. 在 `describe("CommentItem", ...)` 块内最前面新增：

```tsx
  beforeEach(() => {
    useInlineEditorStore.setState({ editors: {} });
  });
```

4. 把第 61 行（`<textarea data-testid="inline-editor-value" readOnly value={initialValue} />`，已在上面第 1 步一并替换，这里不需要重复处理）保持第 1 步替换后的版本。

5. 在文件末尾（最后一个 `it` 之后、`});` 之前）追加两个新用例，验证跨挂载恢复：

```tsx
  it("展开回复框输入草稿后卸载重新挂载，草稿仍在", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "回复" }));
    await user.type(screen.getByTestId("inline-editor-value"), "写了一半");
    unmount();

    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
    expect(screen.getByTestId("inline-editor-value")).toHaveValue("写了一半");
  });

  it("删除评论成功后清空该评论关联的回复/编辑草稿", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(true);
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onDelete={onDelete}
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "回复" }));
    await user.type(screen.getByTestId("inline-editor-value"), "草稿");

    await user.click(screen.getByRole("button", { name: "删除评论" }));
    await user.click(screen.getByRole("button", { name: "删除" }));

    await Promise.resolve();
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/comments/parts/comment-item.test.tsx`
Expected: FAIL（组件还没接入 store，草稿不会跨挂载保留，删除也不会清理）

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/comments/parts/comment-item.tsx` 中：

1. 新增 import：

```ts
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

2. 把：

```ts
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
```

改为：

```ts
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const replyKey = `${targetType}-comment:${comment.id}:reply`;
  const editKey = `${targetType}-comment:${comment.id}:edit`;
  const isReplying = useInlineEditorStore((s) => Boolean(s.editors[replyKey]?.isOpen));
  const isEditing = useInlineEditorStore((s) => Boolean(s.editors[editKey]?.isOpen));
  const replyContent = useInlineEditorStore((s) => s.editors[replyKey]?.content ?? "");
  const editContent = useInlineEditorStore((s) => s.editors[editKey]?.content ?? "");
  const {
    open: openEditor,
    setContent: setEditorContent,
    close: closeEditor,
    submitSuccess: editorSubmitSuccess,
  } = useInlineEditorStore();
```

3. 把 `handleReply`：

```ts
  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        setIsReplying(false);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      setIsEditing(false);
      setIsReplying(true);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [isReplying, userId, openLoginModal, onSubmitReply, onReply, comment.id, displayName]);
```

改为：

```ts
  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        closeEditor(replyKey);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      closeEditor(editKey);
      openEditor(replyKey);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [
    isReplying,
    userId,
    openLoginModal,
    onSubmitReply,
    onReply,
    comment.id,
    displayName,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
  ]);
```

4. 把 `handleDelete`：

```ts
  const handleDelete = useCallback(() => {
    return onDelete?.(comment.id) ?? false;
  }, [onDelete, comment.id]);
```

改为：

```ts
  const handleDelete = useCallback(() => {
    const result = onDelete?.(comment.id);
    result?.then((ok) => {
      if (ok) {
        closeEditor(replyKey);
        closeEditor(editKey);
      }
    });
    return result ?? false;
  }, [onDelete, comment.id, closeEditor, replyKey, editKey]);
```

5. 把 `handleEdit`：

```ts
  const handleEdit = useCallback(() => {
    if (!isOwnComment || !canEdit) return;
    if (onSubmitEditComment) {
      if (isEditing) {
        setIsEditing(false);
        return;
      }
      setIsReplying(false);
      setIsEditing(true);
      return;
    }
    onEditComment?.({
      type: "comment",
      id: comment.id,
      initialContent: pendingContent,
      pendingReview: Boolean(comment.moderation?.has_pending_revision),
    });
  }, [
    isOwnComment,
    canEdit,
    isEditing,
    onSubmitEditComment,
    onEditComment,
    comment,
    pendingContent,
  ]);
```

改为：

```ts
  const handleEdit = useCallback(() => {
    if (!isOwnComment || !canEdit) return;
    if (onSubmitEditComment) {
      if (isEditing) {
        closeEditor(editKey);
        return;
      }
      closeEditor(replyKey);
      openEditor(editKey, pendingContent);
      return;
    }
    onEditComment?.({
      type: "comment",
      id: comment.id,
      initialContent: pendingContent,
      pendingReview: Boolean(comment.moderation?.has_pending_revision),
    });
  }, [
    isOwnComment,
    canEdit,
    isEditing,
    onSubmitEditComment,
    onEditComment,
    comment,
    pendingContent,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
  ]);
```

6. 把 `handleReplySubmit`/`handleEditSubmit`：

```ts
  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(comment.id, undefined, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, comment.id],
  );
```

```ts
  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitEditComment?.(comment.id, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onSubmitEditComment, comment.id],
  );
```

分别改为：

```ts
  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(comment.id, undefined, content)) ?? false;
      if (ok) editorSubmitSuccess(replyKey);
      return ok;
    },
    [onSubmitReply, comment.id, editorSubmitSuccess, replyKey],
  );
```

```ts
  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitEditComment?.(comment.id, content)) ?? false;
      if (ok) editorSubmitSuccess(editKey);
      return ok;
    },
    [onSubmitEditComment, comment.id, editorSubmitSuccess, editKey],
  );
```

7. 渲染部分，把：

```tsx
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
```

改为：

```tsx
      {isEditing ? (
        <InlineReplyEditor
          value={editContent}
          onChange={(value) => setEditorContent(editKey, value)}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => closeEditor(editKey)}
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
```

8. 渲染部分，把：

```tsx
      {isReplying && (
        <InlineReplyEditor
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}
```

改为：

```tsx
      {isReplying && (
        <InlineReplyEditor
          value={replyContent}
          onChange={(value) => setEditorContent(replyKey, value)}
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={displayName} onCancel={() => closeEditor(replyKey)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test components/comments/parts/comment-item.test.tsx`
Expected: PASS（全部用例，含新增的 2 个）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/parts/comment-item.tsx apps/web/components/comments/parts/comment-item.test.tsx
git commit -m "$(cat <<'EOF'
fix(comments): comment-item 回复/编辑草稿迁移到 useInlineEditorStore

isReplying/isEditing 及已输入内容原来是组件内 useState，跳转
返回后丢失。删除评论成功后同步清理关联草稿。
EOF
)"
```

---

### Task 8: 迁移 `guestbook-item.tsx` 到 `useInlineEditorStore`

**Files:**
- Modify: `apps/web/components/guestbook/guestbook-item.tsx`
- Modify: `apps/web/components/guestbook/guestbook-item.test.tsx`

**Interfaces:**
- Consumes: `useInlineEditorStore` from Task 3；`InlineReplyEditor` 新 props from Task 5。
- key 约定：回复框 `` `guestbook:${item.id}:reply` ``，编辑框 `` `guestbook:${item.id}:edit` ``。

- [ ] **Step 1: 改测试**

在 `apps/web/components/guestbook/guestbook-item.test.tsx` 中：

1. 把第 54-72 行的 `vi.mock("@/components/comments/inputs/inline-reply-editor", ...)` 整块替换为：

```tsx
vi.mock("@/components/comments/inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    value,
    onChange,
    header,
    onSubmit,
  }: {
    value: string;
    onChange: (v: string) => void;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-editor">
      {header}
      <textarea
        data-testid="inline-editor-value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={() => void onSubmit(value || "内联提交内容")}>
        保存
      </button>
    </div>
  ),
}));
```

2. 在文件顶部新增 import：

```tsx
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

3. 在 `describe("GuestbookItem", ...)` 块最前面新增：

```tsx
  beforeEach(() => {
    useInlineEditorStore.setState({ editors: {} });
  });
```

4. 第 330-360 行"中风险留言：公开显示旧正文，编辑器初始正文为 pending_content"这条用例里，`await userEvent.click(screen.getByRole("button", { name: "保存" }));` 之后的断言不变（因为 mock 已经改成用 `value` 渲染，`value` 初始就是 `pending_content`，逻辑等价）。

5. 在文件末尾（`describe("作者编辑", ...)` 块的最后一个 `it` 之后，即整个文件倒数第二个 `});` 之前）追加两个新用例：

```tsx
  it("展开回复框输入草稿后卸载重新挂载，草稿仍在", async () => {
    const { unmount } = render(
      <GuestbookItem item={mockItem} onSubmitReply={vi.fn().mockResolvedValue(true)} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    await userEvent.type(screen.getByTestId("inline-editor-value"), "写了一半");
    unmount();

    render(<GuestbookItem item={mockItem} onSubmitReply={vi.fn().mockResolvedValue(true)} />);

    expect(screen.getByTestId("inline-editor")).toBeTruthy();
    expect(screen.getByTestId("inline-editor-value")).toHaveValue("写了一半");
  });

  it("删除留言成功后清空该留言关联的回复/编辑草稿", async () => {
    const onDelete = vi.fn().mockResolvedValue(true);
    render(
      <GuestbookItem
        item={mockItem}
        currentUserId={1}
        onDelete={onDelete}
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    await userEvent.type(screen.getByTestId("inline-editor-value"), "草稿");

    await userEvent.click(screen.getByRole("button", { name: "删除留言" }));
    await userEvent.click(screen.getByRole("button", { name: "删除" }));

    await Promise.resolve();
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/guestbook/guestbook-item.test.tsx`
Expected: FAIL

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/guestbook/guestbook-item.tsx` 中：

1. 新增 import：

```ts
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

2. 把：

```ts
  const displayName = getThreadDisplayName(item.user);
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
```

改为：

```ts
  const displayName = getThreadDisplayName(item.user);
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const replyKey = `guestbook:${item.id}:reply`;
  const editKey = `guestbook:${item.id}:edit`;
  const isReplying = useInlineEditorStore((s) => Boolean(s.editors[replyKey]?.isOpen));
  const isEditing = useInlineEditorStore((s) => Boolean(s.editors[editKey]?.isOpen));
  const replyContent = useInlineEditorStore((s) => s.editors[replyKey]?.content ?? "");
  const editContent = useInlineEditorStore((s) => s.editors[editKey]?.content ?? "");
  const {
    open: openEditor,
    setContent: setEditorContent,
    close: closeEditor,
    submitSuccess: editorSubmitSuccess,
  } = useInlineEditorStore();
```

3. 把 `handleReply`：

```ts
  const handleReply = useCallback(() => {
    if (!canInteract) return;
    if (isReplying) {
      setIsReplying(false);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    setIsEditing(false);
    setIsReplying(true);
  }, [canInteract, isReplying, userId, openLoginModal]);
```

改为：

```ts
  const handleReply = useCallback(() => {
    if (!canInteract) return;
    if (isReplying) {
      closeEditor(replyKey);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    closeEditor(editKey);
    openEditor(replyKey);
  }, [canInteract, isReplying, userId, openLoginModal, closeEditor, openEditor, replyKey, editKey]);
```

4. 把：

```ts
  const handleDelete = useCallback(() => onDelete?.(item.id) ?? false, [onDelete, item.id]);
```

改为：

```ts
  const handleDelete = useCallback(() => {
    const result = onDelete?.(item.id);
    result?.then((ok) => {
      if (ok) {
        closeEditor(replyKey);
        closeEditor(editKey);
      }
    });
    return result ?? false;
  }, [onDelete, item.id, closeEditor, replyKey, editKey]);
```

5. 把 `handleToggleEditor`：

```ts
  const handleToggleEditor = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    setIsReplying(false);
    setIsEditing(true);
  }, [isEditing]);
```

改为：

```ts
  const handleToggleEditor = useCallback(() => {
    if (isEditing) {
      closeEditor(editKey);
      return;
    }
    closeEditor(replyKey);
    openEditor(editKey, editInitialContent);
  }, [isEditing, closeEditor, openEditor, replyKey, editKey, editInitialContent]);
```

> 注意：`editInitialContent` 目前在源文件里定义在 `handleToggleEditor` 之后（`const editInitialContent = item.moderation?.pending_content ?? item.content;`）。需要把这一行**移到 `handleToggleEditor` 定义之前**（放在 `handleDeleteReply` 之后即可），否则会在赋值前引用。

6. 把 `handleReplySubmit`/`handleEditSubmit`：

```ts
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
```

改为：

```ts
  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(item.id, undefined, content)) ?? false;
      if (ok) editorSubmitSuccess(replyKey);
      return ok;
    },
    [onSubmitReply, item.id, editorSubmitSuccess, replyKey],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onEdit?.(item.id, content)) ?? false;
      if (ok) editorSubmitSuccess(editKey);
      return ok;
    },
    [onEdit, item.id, editorSubmitSuccess, editKey],
  );
```

7. 渲染部分，把：

```tsx
      {isEditing ? (
        <InlineReplyEditor
          initialValue={editInitialContent}
          placeholder="编辑留言正文…"
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => setIsEditing(false)}
              editing
              pendingReview={Boolean(item.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
```

改为：

```tsx
      {isEditing ? (
        <InlineReplyEditor
          value={editContent}
          onChange={(value) => setEditorContent(editKey, value)}
          placeholder="编辑留言正文…"
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => closeEditor(editKey)}
              editing
              pendingReview={Boolean(item.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
```

8. 渲染部分，把：

```tsx
      {isReplying && (
        <InlineReplyEditor
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}
```

改为：

```tsx
      {isReplying && (
        <InlineReplyEditor
          value={replyContent}
          onChange={(value) => setEditorContent(replyKey, value)}
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={displayName} onCancel={() => closeEditor(replyKey)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test components/guestbook/guestbook-item.test.tsx`
Expected: PASS（全部用例，含新增的 2 个）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/guestbook/guestbook-item.tsx apps/web/components/guestbook/guestbook-item.test.tsx
git commit -m "$(cat <<'EOF'
fix(guestbook): guestbook-item 回复/编辑草稿迁移到 useInlineEditorStore

同 comment-item，跳转返回后回复/编辑输入框及已输入内容能够
原样恢复；删除留言成功后同步清理关联草稿。
EOF
)"
```

---

### Task 9: 迁移 `comment-replies.tsx` 的 `ReplyItem` 到 `useInlineEditorStore`

**Files:**
- Modify: `apps/web/components/comments/parts/comment-replies.tsx`
- Modify: `apps/web/components/comments/parts/comment-replies.test.tsx`

**Interfaces:**
- Consumes: `useInlineEditorStore` from Task 3；`InlineReplyEditor` 新 props from Task 5。
- key 约定：某条回复自己的回复框 `` `${targetType}-reply:${reply.id}:reply` ``，编辑框 `` `${targetType}-reply:${reply.id}:edit` ``。

> 注意：`comment-replies.tsx` 里同时存在 `CommentReplies` 组件自己的 `isOpen`（展开态，Task 7/8 已经迁移到 `useCommentRepliesStore`，本任务不动）和 `ReplyItem` 组件的 `isReplying`/`isEditing`（本任务要迁移的对象）——两者是完全独立的 store，不要混用 key。

- [ ] **Step 1: 改测试**

在 `apps/web/components/comments/parts/comment-replies.test.tsx` 中：

1. 把第 85-106 行的 `vi.mock("../inputs/inline-reply-editor", ...)` 整块替换为：

```tsx
vi.mock("../inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    value,
    onChange,
    placeholder,
    header,
    onSubmit,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-reply-editor">
      {header}
      <span data-testid="inline-editor-placeholder">{placeholder}</span>
      <textarea
        data-testid="inline-editor-value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={() => void onSubmit(value || "内联提交内容")}>
        提交
      </button>
    </div>
  ),
}));
```

2. 在文件顶部新增 import：

```tsx
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

3. 找到已有的 `beforeEach`：

```ts
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    useCommentRepliesStore.setState({ openKeys: new Set() });
  });
```

改为同时复位新 store：

```ts
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    useCommentRepliesStore.setState({ openKeys: new Set() });
    useInlineEditorStore.setState({ editors: {} });
  });
```

4. 第 306-328 行"点击回复内的回复按钮展开内联回复框，提交时调用 onSubmitReply"用例里 `expect(screen.getByTestId("inline-editor-placeholder")).toHaveTextContent("请输入你的回复内容");` 这一断言不变，其余逻辑因为 mock 改成受控写法而自然兼容。

5. 第 1096-1121 行"作者点击编辑按钮后内联展示编辑器，替换正文显示"用例里 `expect(screen.getByTestId("inline-editor-value")).toHaveValue("回复 1");` 这一断言不变。

6. 在 `describe("作者编辑入口", ...)` 块的最后一个 `it` 之后（整个文件倒数第二个 `});` 之前）追加：

```ts
  describe("回复内联输入框跨挂载保留草稿", () => {
    it("展开回复框输入草稿后卸载重新挂载，草稿仍在", async () => {
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
      await waitFor(() => screen.getByText("回复 1"));

      await user.click(screen.getAllByText("回复")[0]);
      await user.type(screen.getByTestId("inline-editor-value"), "写了一半");
      unmount();

      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));
      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
        />,
      );
      await waitFor(() => screen.getByText("回复 1"));

      expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
      expect(screen.getByTestId("inline-editor-value")).toHaveValue("写了一半");
    });

    it("删除回复成功后清空该回复关联的回复/编辑草稿", async () => {
      const user = userEvent.setup();
      const onDeleteReply = vi.fn().mockResolvedValue(true);
      vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

      render(
        <CommentReplies
          commentId={1}
          targetType="article"
          replyCount={1}
          currentUserId={1}
          onSubmitReply={vi.fn().mockResolvedValue(true)}
          onDeleteReply={onDeleteReply}
        />,
      );
      await user.click(screen.getByText(/展开 1 条回复/));
      await waitFor(() => screen.getByText("回复 1"));

      await user.click(screen.getAllByText("回复")[0]);
      await user.type(screen.getByTestId("inline-editor-value"), "草稿");

      await user.click(screen.getByRole("button", { name: "删除回复" }));
      await user.click(screen.getByRole("button", { name: "删除" }));

      await Promise.resolve();
      expect(useInlineEditorStore.getState().editors).toEqual({});
    });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/comments/parts/comment-replies.test.tsx`
Expected: FAIL（新增的两个用例失败；既有用例应仍通过）

- [ ] **Step 3: 修改组件实现**

在 `apps/web/components/comments/parts/comment-replies.tsx` 中，修改的是 `ReplyItem` 组件（不是 `CommentReplies`）：

1. 新增 import：

```ts
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
```

2. 把 `ReplyItem` 内部：

```ts
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const { toggleReplyLike } = useCommentLike(targetType);
  const isOwnReply = currentUserId != null && currentUserId === reply.from_user_id;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
```

改为：

```ts
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const { toggleReplyLike } = useCommentLike(targetType);
  const isOwnReply = currentUserId != null && currentUserId === reply.from_user_id;
  const replyKey = `${targetType}-reply:${reply.id}:reply`;
  const editKey = `${targetType}-reply:${reply.id}:edit`;
  const isReplying = useInlineEditorStore((s) => Boolean(s.editors[replyKey]?.isOpen));
  const isEditing = useInlineEditorStore((s) => Boolean(s.editors[editKey]?.isOpen));
  const replyContent = useInlineEditorStore((s) => s.editors[replyKey]?.content ?? "");
  const editContent = useInlineEditorStore((s) => s.editors[editKey]?.content ?? "");
  const {
    open: openEditor,
    setContent: setEditorContent,
    close: closeEditor,
    submitSuccess: editorSubmitSuccess,
  } = useInlineEditorStore();
```

3. 把 `handleReply`：

```ts
  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        setIsReplying(false);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      setIsEditing(false);
      setIsReplying(true);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName });
  }, [isReplying, userId, openLoginModal, onSubmitReply, onReply, commentId, reply.id, fromName]);
```

改为：

```ts
  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        closeEditor(replyKey);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      closeEditor(editKey);
      openEditor(replyKey);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName });
  }, [
    isReplying,
    userId,
    openLoginModal,
    onSubmitReply,
    onReply,
    commentId,
    reply.id,
    fromName,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
  ]);
```

4. 把 `handleDelete`：

```ts
  const handleDelete = useCallback(() => {
    return onDeleteReply?.(reply.id) ?? false;
  }, [onDeleteReply, reply.id]);
```

改为：

```ts
  const handleDelete = useCallback(() => {
    const result = onDeleteReply?.(reply.id);
    result?.then((ok) => {
      if (ok) {
        closeEditor(replyKey);
        closeEditor(editKey);
      }
    });
    return result ?? false;
  }, [onDeleteReply, reply.id, closeEditor, replyKey, editKey]);
```

5. 把 `handleEdit`：

```ts
  const handleEdit = useCallback(() => {
    if (!isOwnReply || !canEdit) return;
    if (onSubmitEditReply) {
      if (isEditing) {
        setIsEditing(false);
        return;
      }
      setIsReplying(false);
      setIsEditing(true);
      return;
    }
    onEditReply?.({
      type: "reply",
      id: reply.id,
      commentId,
      parentReplyId: reply.parent_reply_id,
      initialContent: pendingContent,
      pendingReview: Boolean(reply.moderation?.has_pending_revision),
    });
  }, [
    isOwnReply,
    canEdit,
    isEditing,
    onSubmitEditReply,
    onEditReply,
    reply,
    commentId,
    pendingContent,
  ]);
```

改为：

```ts
  const handleEdit = useCallback(() => {
    if (!isOwnReply || !canEdit) return;
    if (onSubmitEditReply) {
      if (isEditing) {
        closeEditor(editKey);
        return;
      }
      closeEditor(replyKey);
      openEditor(editKey, pendingContent);
      return;
    }
    onEditReply?.({
      type: "reply",
      id: reply.id,
      commentId,
      parentReplyId: reply.parent_reply_id,
      initialContent: pendingContent,
      pendingReview: Boolean(reply.moderation?.has_pending_revision),
    });
  }, [
    isOwnReply,
    canEdit,
    isEditing,
    onSubmitEditReply,
    onEditReply,
    reply,
    commentId,
    pendingContent,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
  ]);
```

6. 把 `handleReplySubmit`/`handleEditSubmit`：

```ts
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
```

改为：

```ts
  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(commentId, reply.id, content)) ?? false;
      if (ok) editorSubmitSuccess(replyKey);
      return ok;
    },
    [onSubmitReply, commentId, reply.id, editorSubmitSuccess, replyKey],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok =
        (await onSubmitEditReply?.(reply.id, reply.parent_reply_id, commentId, content)) ?? false;
      if (ok) editorSubmitSuccess(editKey);
      return ok;
    },
    [onSubmitEditReply, reply.id, reply.parent_reply_id, commentId, editorSubmitSuccess, editKey],
  );
```

7. 渲染部分，把：

```tsx
      {isReplying && (
        <InlineReplyEditor
          placeholder="请输入你的回复内容"
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
```

改为：

```tsx
      {isReplying && (
        <InlineReplyEditor
          value={replyContent}
          onChange={(value) => setEditorContent(replyKey, value)}
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={fromName} onCancel={() => closeEditor(replyKey)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
        />
      )}
      {isEditing && (
        <InlineReplyEditor
          value={editContent}
          onChange={(value) => setEditorContent(editKey, value)}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => closeEditor(editKey)}
              editing
              pendingReview={Boolean(reply.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
        />
      )}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test components/comments/parts/comment-replies.test.tsx`
Expected: PASS（全部用例，含新增的 2 个）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/comments/parts/comment-replies.tsx apps/web/components/comments/parts/comment-replies.test.tsx
git commit -m "$(cat <<'EOF'
fix(comments): ReplyItem 回复/编辑草稿迁移到 useInlineEditorStore

回复线程里每条回复自己的回复/编辑输入框，与 CommentReplies
本身的展开态是两个独立 store，互不影响。
EOF
)"
```

---

### Task 10: 迁移 `friend-links-paused-section.tsx` 到 `useFriendLinksPausedStore`

**Files:**
- Modify: `apps/web/components/friend-links/friend-links-paused-section.tsx`
- Create: `apps/web/components/friend-links/friend-links-paused-section.test.tsx`
- Modify: `apps/web/components/friend-links/friend-links-page.test.tsx`

**Interfaces:**
- Consumes: `useFriendLinksPausedStore` from Task 4。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/components/friend-links/friend-links-paused-section.test.tsx`：

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
import { FriendLinksPausedSection } from "./friend-links-paused-section";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./friend-links-list", () => ({
  FriendLinksList: ({ links }: { links: FriendLinkItemResp[] }) => (
    <div data-testid="links-list" data-count={links.length} />
  ),
}));

const pausedLink: FriendLinkItemResp = {
  id: 2,
  name: "Blog B",
  site: "https://b.com",
  seq: 1,
  status: 2,
  created_at: "",
  updated_at: "",
};

describe("FriendLinksPausedSection", () => {
  beforeEach(() => {
    useFriendLinksPausedStore.setState({ open: false });
  });

  it("links 为空时不渲染任何内容", () => {
    const { container } = render(<FriendLinksPausedSection links={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("默认收起", () => {
    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "展开暂别友邻 · 1" })).toBeTruthy();
    expect(screen.queryByTestId("links-list")).toBeNull();
  });

  it("点击后展开，显示链接列表", async () => {
    const user = userEvent.setup();
    render(<FriendLinksPausedSection links={[pausedLink]} />);

    await user.click(screen.getByRole("button", { name: "展开暂别友邻 · 1" }));

    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
    expect(screen.getByTestId("links-list")).toBeTruthy();
  });

  it("store 里 open=true 时挂载即为展开状态", () => {
    useFriendLinksPausedStore.setState({ open: true });
    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
    expect(screen.getByTestId("links-list")).toBeTruthy();
  });

  it("展开后卸载重新挂载，展开态保留", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FriendLinksPausedSection links={[pausedLink]} />);

    await user.click(screen.getByRole("button", { name: "展开暂别友邻 · 1" }));
    unmount();

    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test components/friend-links/friend-links-paused-section.test.tsx`
Expected: FAIL（组件目前还是用本地 `useState`，跟 store 无关，`store 里 open=true 时挂载即为展开状态`和跨挂载那条会失败）

- [ ] **Step 3: 修改组件实现**

把 `apps/web/components/friend-links/friend-links-paused-section.tsx` 整个文件内容替换为：

```tsx
"use client";

import { useId } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
import { FriendLinksList } from "./friend-links-list";

interface FriendLinksPausedSectionProps {
  links: FriendLinkItemResp[];
}

export function FriendLinksPausedSection({ links }: FriendLinksPausedSectionProps) {
  const open = useFriendLinksPausedStore((s) => s.open);
  const setOpen = useFriendLinksPausedStore((s) => s.setOpen);
  const panelId = useId();

  if (links.length === 0) return null;

  return (
    <section className="mt-7 border-t border-dashed border-border pt-4">
      <Button
        type="button"
        variant="ghost"
        className="group flex h-auto w-full justify-between rounded-lg px-3 py-2 text-left text-muted-foreground hover:text-foreground data-[pressed]:scale-100"
        aria-label={`${open ? "收起" : "展开"}暂别友邻 · ${links.length}`}
        aria-expanded={open}
        aria-controls={panelId}
        onPress={() => setOpen(!open)}
      >
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="text-sm font-semibold">暂别友邻 · {links.length}</span>
          <span className="text-xs font-normal text-muted-foreground">
            这些站点暂时无法访问，先收在这里。
          </span>
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-out group-hover:bg-muted">
          <SvgIcon
            name="chevron-down"
            size={16}
            className={cn(
              "transition-transform duration-200 ease-out",
              open ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </span>
      </Button>

      {open && (
        <div id={panelId} className="mt-3">
          <FriendLinksList links={links} />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test components/friend-links/friend-links-paused-section.test.tsx`
Expected: PASS（5 个用例全绿）

- [ ] **Step 5: 更新 `friend-links-page.test.tsx` 的 store 复位，运行确认不受影响**

在 `apps/web/components/friend-links/friend-links-page.test.tsx` 顶部新增 import：

```tsx
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
```

在 `describe("FriendLinksPage", ...)` 块最前面新增：

```tsx
  beforeEach(() => {
    useFriendLinksPausedStore.setState({ open: false });
  });
```

Run: `pnpm --filter web test components/friend-links/friend-links-page.test.tsx`
Expected: PASS（原有全部用例不受影响）

- [ ] **Step 6: 提交**

```bash
git add apps/web/components/friend-links/friend-links-paused-section.tsx \
  apps/web/components/friend-links/friend-links-paused-section.test.tsx \
  apps/web/components/friend-links/friend-links-page.test.tsx
git commit -m "$(cat <<'EOF'
fix(friend-links): 暂别友邻展开态迁移到 useFriendLinksPausedStore

跳转返回后展开态能够原样恢复；深度跳转后由导航守卫重置。
EOF
)"
```

---

### Task 11: 全量验证

**Files:** 无新增/修改文件，仅运行检查。

- [ ] **Step 1: 全量类型检查**

Run: `pnpm --filter web check-types`
Expected: 无报错

- [ ] **Step 2: 全量 lint**

Run: `pnpm --filter web lint`
Expected: 无报错

- [ ] **Step 3: 全量测试**

Run: `pnpm --filter web test`
Expected: 全部通过

- [ ] **Step 4: 生产构建**

Run: `pnpm --filter web build`
Expected: 构建成功（若 `.next` 目录残留导致 `ENOTEMPTY` 报错，先 `rm -rf apps/web/.next` 再重试）

- [ ] **Step 5: 浏览器手动复现验证**

需要 `apps/web/.env.local` 指向的后端 `API_BASE_URL` 可访问（本地跑 Go 后端 `blog-backend` 的 `make run`，数据库/Redis 按其 README 配置）。用 preview 工具启动生产模式（`.claude/launch.json` 若没有 `web-start` 配置，先按 `runtimeArgs: ["--filter", "web", "start"]`、`port: 3000` 添加一个），逐一走三个场景：

1. **弹窗前进关闭/后退恢复**：首页打开一篇文章的评论弹窗，展开一条回复 → 点弹窗内某条评论作者头像跳到 `/users/{id}` → 断言弹窗此时不可见 → 点浏览器后退 → 断言弹窗重新显示且回复仍展开 → 再从首页前进跳到另一个页面（深度跳转）→ 从那个页面后退回到刚才跳转经过的页面 → 断言弹窗不会诡异地重新出现。
2. **草稿持久化**：留言板某条留言点"回复"，输入一段文字但不提交 → 点用户头像跳到详情页 → 后退回留言板 → 断言回复框仍展开且内容还在；同样流程测一遍"编辑"入口。文章/碎语评论区重复验证一次。
3. **友邻展开态**：友邻页展开"暂别友邻" → 跳到别的页面 → 后退回友邻页 → 断言仍是展开状态。

Expected: 三个场景均符合预期；额外验证"点导航栏链接跳回原页面（不是后退按钮）"不会误触发恢复。

- [ ] **Step 6: 提交（若前序步骤发现并修复了遗漏，在此处补一个收尾 commit；若无遗漏则跳过，不产生空提交）**
