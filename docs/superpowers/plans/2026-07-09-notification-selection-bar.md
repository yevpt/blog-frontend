# 消息中心批量选择悬浮栏优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给消息中心批量选择悬浮栏加上"全选/反选"，并把它从 `sticky` 贴底改造成真正的 `fixed` 悬浮卡片，配套响应式内部布局。

**Architecture:** `NotificationSelectionBar` 组件重构为受控展示组件（新增 `allSelected`/`onToggleSelectAll`/`onInvertSelect` props，内部渲染三态全选 checkbox + 响应式按钮组，定位改为 `fixed`）；`notifications-page.tsx` 承担全选/反选的状态派生与悬浮 Dock 避让逻辑。两个文件改动分两个任务，组件先行（先定义好 props 接口），页面后接入。

**Tech Stack:** React + TypeScript，Tailwind CSS，`@repo/ui`（`Button`、`cn`），`@repo/icons`（`SvgIcon`），Vitest + Testing Library。

## Global Constraints

- 全选/反选范围仅限当前已加载到虚拟列表中的消息（`n.items`），不触发额外分页请求。
- 悬浮栏 `bottom-5 md:bottom-6`、`z-40`，与站内 `float-dock`（`site-float-dock.tsx`）的贴底节奏和层级保持一致，不进入 `z-[200]+` 的弹层区间。
- 移动端安全区用 `pb-[env(safe-area-inset-bottom)]`（项目首次引入，仅此组件使用）。
- 内部布局响应式断点用 `sm`（640px），不是 `md`。
- 视觉质感对齐 `apps/web/components/float-dock/float-dock-styles.ts` 中 `floatDockOrbClass` 的 `ring` + `backdrop-blur-xl` + 暗色模式 `--glass-bdr`/`--glass-ring` CSS 变量做法（定义于 `packages/styles/src/base.css:165-190`）。
- 改 Hook/组件/页面必须有对应 `*.test.tsx`（仓库强制要求）。

---

### Task 1: 重构 `NotificationSelectionBar` 组件

**Files:**

- Modify: `apps/web/components/notifications/notification-selection-bar.tsx`
- Test: `apps/web/components/notifications/notification-selection-bar.test.tsx`

**Interfaces:**

- Produces：新的 `NotificationSelectionBarProps`：

```ts
interface NotificationSelectionBarProps {
  count: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onInvertSelect: () => void;
  onMarkRead: () => void;
  onCancel: () => void;
}
```

Task 2 会以这个接口调用组件。

- [ ] **Step 1: 改写测试文件，覆盖新增的全选三态与反选行为**

把 `apps/web/components/notifications/notification-selection-bar.test.tsx` 整个替换为：

```tsx
import type { ComponentProps } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationSelectionBar from "./notification-selection-bar";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("@repo/ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, isDisabled, ...p }: any) => (
    <button onClick={onPress} disabled={isDisabled} {...p}>
      {children}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function renderBar(over: Partial<ComponentProps<typeof NotificationSelectionBar>> = {}) {
  return render(
    <NotificationSelectionBar
      count={0}
      allSelected={false}
      onToggleSelectAll={vi.fn()}
      onInvertSelect={vi.fn()}
      onMarkRead={vi.fn()}
      onCancel={vi.fn()}
      {...over}
    />,
  );
}

describe("NotificationSelectionBar", () => {
  it("显示已选数量并触发标记已读", () => {
    const onMarkRead = vi.fn();
    renderBar({ count: 2, onMarkRead });
    expect(screen.getByText(/已选 2 条/)).toBeTruthy();
    fireEvent.click(screen.getByText("标记已读"));
    expect(onMarkRead).toHaveBeenCalled();
  });

  it("count 为 0 时标记已读禁用", () => {
    renderBar({ count: 0 });
    expect(screen.getByText("标记已读").closest("button")?.disabled).toBe(true);
  });

  it("点击取消触发 onCancel", () => {
    const onCancel = vi.fn();
    renderBar({ onCancel });
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("未选中任何一条时全选 checkbox 为未选中且非半选", () => {
    renderBar({ count: 0, allSelected: false });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(false);
  });

  it("部分选中时全选 checkbox 呈半选态", () => {
    renderBar({ count: 1, allSelected: false });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(true);
  });

  it("全部选中时全选 checkbox 呈勾选态", () => {
    renderBar({ count: 3, allSelected: true });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);
  });

  it("点击全选 checkbox 触发 onToggleSelectAll", () => {
    const onToggleSelectAll = vi.fn();
    renderBar({ onToggleSelectAll });
    fireEvent.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onToggleSelectAll).toHaveBeenCalled();
  });

  it("点击反选按钮触发 onInvertSelect", () => {
    const onInvertSelect = vi.fn();
    renderBar({ count: 1, onInvertSelect });
    fireEvent.click(screen.getByText("反选"));
    expect(onInvertSelect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- notification-selection-bar.test.tsx`
Expected: FAIL — 现有组件没有 `allSelected`/`onToggleSelectAll`/`onInvertSelect` props，也没有 `role="checkbox" name="全选"` 的元素。

- [ ] **Step 3: 重写组件实现**

把 `apps/web/components/notifications/notification-selection-bar.tsx` 整个替换为：

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface NotificationSelectionBarProps {
  count: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onInvertSelect: () => void;
  onMarkRead: () => void;
  onCancel: () => void;
}

interface SelectAllCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}

/** 全选三态 checkbox：indeterminate 是 DOM 属性，需要 ref 手动同步 */
function SelectAllCheckbox({ checked, indeterminate, onChange }: SelectAllCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="全选"
      className="h-4 w-4 cursor-pointer accent-primary"
    />
  );
}

export default function NotificationSelectionBar({
  count,
  allSelected,
  onToggleSelectAll,
  onInvertSelect,
  onMarkRead,
  onCancel,
}: NotificationSelectionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-40 pb-[env(safe-area-inset-bottom)] md:bottom-6">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl px-4 py-3",
            "ring-1 shadow-sm backdrop-blur-xl",
            "ring-border/50 bg-background/85 text-foreground",
            "dark:ring-[color:var(--glass-bdr)] dark:bg-card/90",
            "dark:shadow-[0_0_0_1px_var(--glass-ring),0_4px_20px_rgba(0,0,0,0.4)]",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <label className="flex items-center gap-2 text-sm">
            <SelectAllCheckbox
              checked={allSelected}
              indeterminate={count > 0 && !allSelected}
              onChange={onToggleSelectAll}
            />
            <span className="text-muted-foreground">已选 {count} 条</span>
          </label>
          <span className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant={null}
              size={null}
              onPress={onInvertSelect}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
            >
              反选
            </Button>
            <Button
              type="button"
              variant={null}
              size={null}
              isDisabled={count === 0}
              onPress={onMarkRead}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <SvgIcon name="check" size={15} />
              标记已读
            </Button>
            <Button
              type="button"
              variant={null}
              size={null}
              onPress={onCancel}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
            >
              取消
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- notification-selection-bar.test.tsx`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-selection-bar.tsx apps/web/components/notifications/notification-selection-bar.test.tsx
git commit -m "feat(notifications): 悬浮选择栏支持全选/反选并改为 fixed 定位"
```

---

### Task 2: `notifications-page.tsx` 接入全选/反选与悬浮 Dock 避让

**Files:**

- Modify: `apps/web/components/notifications/notifications-page.tsx`
- Test: `apps/web/components/notifications/notifications-page.test.tsx`

**Interfaces:**

- Consumes：Task 1 产出的 `NotificationSelectionBarProps`（`allSelected`、`onToggleSelectAll`、`onInvertSelect`）。
- Consumes：`FloatDockPageAnchor` 已有的 `enabled?: boolean` prop（`apps/web/components/float-dock/float-dock-page-anchor.tsx:10`）。

- [ ] **Step 1: 扩展页面测试的 mock 并新增用例**

在 `apps/web/components/notifications/notifications-page.test.tsx` 中，把现有的

```tsx
vi.mock("./notification-selection-bar", () => ({ default: () => <div data-testid="bar" /> }));
```

替换为：

```tsx
vi.mock("./notification-selection-bar", () => ({
  default: ({
    count,
    allSelected,
    onToggleSelectAll,
    onInvertSelect,
    onMarkRead,
    onCancel,
  }: {
    count: number;
    allSelected: boolean;
    onToggleSelectAll: () => void;
    onInvertSelect: () => void;
    onMarkRead: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="bar">
      <span data-testid="bar-count">{count}</span>
      <span data-testid="bar-all-selected">{String(allSelected)}</span>
      <button type="button" onClick={onToggleSelectAll}>
        切换全选
      </button>
      <button type="button" onClick={onInvertSelect}>
        反选
      </button>
      <button type="button" onClick={onMarkRead}>
        标记已读
      </button>
      <button type="button" onClick={onCancel}>
        取消
      </button>
    </div>
  ),
}));
```

并在文件里紧挨着新增一个 mock（放在其它 `vi.mock` 调用旁边即可）：

```tsx
vi.mock("@/components/float-dock", () => ({
  FloatDockPageAnchor: ({ enabled }: { enabled?: boolean }) => (
    <div data-testid="float-dock-anchor" data-enabled={String(enabled)} />
  ),
}));
```

然后在 `describe("NotificationsPage", ...)` 块末尾（最后一个 `it` 之后、闭合 `});` 之前）新增三个用例：

```tsx
it("进入批量选择后悬浮 Dock 被禁用", () => {
  hook.items = [listItem()];
  render(<NotificationsPage />);
  expect(screen.getByTestId("float-dock-anchor").dataset.enabled).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
  expect(screen.getByTestId("float-dock-anchor").dataset.enabled).toBe("false");
});

it("点击全选选中所有已加载消息，再次点击清空", () => {
  hook.items = [listItem({ id: 1 }), listItem({ id: 2 })];
  render(<NotificationsPage />);
  fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
  expect(screen.getByTestId("bar-count").textContent).toBe("0");
  fireEvent.click(screen.getByText("切换全选"));
  expect(screen.getByTestId("bar-count").textContent).toBe("2");
  expect(screen.getByTestId("bar-all-selected").textContent).toBe("true");
  fireEvent.click(screen.getByText("切换全选"));
  expect(screen.getByTestId("bar-count").textContent).toBe("0");
});

it("反选翻转当前选中集合", () => {
  hook.items = [listItem({ id: 1 }), listItem({ id: 2 }), listItem({ id: 3 })];
  render(<NotificationsPage />);
  fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
  fireEvent.click(screen.getByText("切换全选"));
  expect(screen.getByTestId("bar-count").textContent).toBe("3");
  fireEvent.click(screen.getByText("反选"));
  expect(screen.getByTestId("bar-count").textContent).toBe("0");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- notifications-page.test.tsx`
Expected: FAIL —页面还没有 `float-dock-anchor` 测试桩的 `data-enabled` 输出，也没有"切换全选"/"反选"按钮对应的处理函数。

- [ ] **Step 3: 实现页面逻辑**

在 `apps/web/components/notifications/notifications-page.tsx` 中，`toggleSelect`/`exitSelect` 函数之后新增：

```tsx
const allSelected = n.items.length > 0 && selected.size === n.items.length;

function toggleSelectAll() {
  setSelected(allSelected ? new Set() : new Set(n.items.map((item) => item.id)));
}

function invertSelect() {
  setSelected((cur) => {
    const next = new Set<number>();
    for (const item of n.items) {
      if (!cur.has(item.id)) next.add(item.id);
    }
    return next;
  });
}
```

把

```tsx
<FloatDockPageAnchor layout={NOTIFICATIONS_FLOAT_DOCK_LAYOUT} />
```

改为

```tsx
<FloatDockPageAnchor layout={NOTIFICATIONS_FLOAT_DOCK_LAYOUT} enabled={!selecting} />
```

把 `<main>` 的 `className` 从

```tsx
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pt-[4.75rem] pb-8 md:pt-20">
```

改为

```tsx
      <main
        className={cn(
          "mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pt-[4.75rem] pb-8 md:pt-20",
          selecting && "pb-24",
        )}
      >
```

把

```tsx
{
  selecting && (
    <NotificationSelectionBar count={selected.size} onMarkRead={batchRead} onCancel={exitSelect} />
  );
}
```

改为

```tsx
{
  selecting && (
    <NotificationSelectionBar
      count={selected.size}
      allSelected={allSelected}
      onToggleSelectAll={toggleSelectAll}
      onInvertSelect={invertSelect}
      onMarkRead={batchRead}
      onCancel={exitSelect}
    />
  );
}
```

（`cn` 已经在文件顶部从 `@repo/ui` 引入，无需新增 import。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- notifications-page.test.tsx`
Expected: PASS（全部用例，含新增 3 个）

- [ ] **Step 5: 跑一遍 notifications 目录全部测试防回归**

Run: `pnpm --filter web test -- apps/web/components/notifications`
Expected: PASS（`notification-selection-bar`、`notifications-page`、`notification-card`、`notification-virtual-list` 等全部通过）

- [ ] **Step 6: 提交**

```bash
git add apps/web/components/notifications/notifications-page.tsx apps/web/components/notifications/notifications-page.test.tsx
git commit -m "feat(notifications): 页面接入全选/反选并在选择模式下避让悬浮 Dock"
```
