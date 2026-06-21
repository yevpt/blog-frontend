# 首页右栏底部按钮统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一套「双等宽扁平描边按钮」统一首页右栏「碎语」「最近来访」两模块的底部 CTA 行，去掉旧的渐变 / 阴影 / 胶囊样式。

**Architecture:** 新增共享组件 `sidebar-section-footer.tsx`（布局容器 `SidebarSectionFooter` + 带 `tone` 的按钮 `SidebarFooterButton`），延续已有的 `SidebarSectionHeader` / `SidebarSectionAction` 粒度。两模块改用该组件，删除各自手写 className。

**Tech Stack:** React + TypeScript + TailwindCSS、`@repo/ui` 的 `Button`/`cn`、`@repo/icons` 的 `SvgIcon`、Vitest + Testing Library（jsdom）。

参考 spec：`docs/superpowers/specs/2026-06-21-sidebar-footer-buttons-design.md`

---

## 关键约定（实现前必读）

- 文案一律走 `t()` key，**不硬编码中文**。现有 key 及其值：
  - `snippet.postNew` → "发表碎语"，`snippet.viewMore` → "查看更多"
  - `sidebar.joinQQ` → "入驻 QQ 群"，`sidebar.viewMore` → "查看更多"
- 图标全部已存在于 `@repo/icons` sprite：`plus`、`qq`、`arrow-forward`。统一 `SvgIcon` `size={12}`。
- `Button size="sm"` 已内置 `h-8 rounded-md px-3 text-xs`，复用它，只追加 `flex-1`、tone 配色、`gap-1`。
- 主按钮图标**前置**，「查看更多」箭头**后置**。
- 工作区已有未提交的标题统一改动（同一区域），本计划在当前工作区继续，不新开分支。

---

## File Structure

- `apps/web/components/sidebar/sidebar-section-footer.tsx`（新建）— 导出 `SidebarSectionFooter`（布局）与 `SidebarFooterButton`（按钮）。
- `apps/web/components/sidebar/sidebar-section-footer.test.tsx`（新建）— 组件测试。
- `apps/web/components/sidebar/index.ts`（改）— 追加导出。
- `apps/web/components/snippets/snippets-section.tsx`（改）— 底部行换用新组件。
- `apps/web/components/snippets/snippets-section.test.tsx`（改）— 底部断言适配。
- `apps/web/components/sidebar/recent-visitors.tsx`（改）— 底部行换用新组件。
- `apps/web/components/sidebar/sidebar.test.tsx`（改）— 来访底部断言适配。

---

## Task 1: 共享组件 `SidebarSectionFooter` + `SidebarFooterButton`

**Files:**
- Create: `apps/web/components/sidebar/sidebar-section-footer.tsx`
- Test: `apps/web/components/sidebar/sidebar-section-footer.test.tsx`

- [ ] **Step 1: 写失败测试**

`apps/web/components/sidebar/sidebar-section-footer.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SidebarSectionFooter, SidebarFooterButton } from "./sidebar-section-footer";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    className,
    variant,
    size,
    onPress,
    href,
    ...props
  }: {
    children: ReactNode;
    className?: string;
    variant?: string;
    size?: string;
    onPress?: () => void;
    href?: string;
    [key: string]: unknown;
  }) =>
    href !== undefined ? (
      <a href={href} className={className} data-variant={variant} data-size={size} {...props}>
        {children}
      </a>
    ) : (
      <button
        type="button"
        className={className}
        data-variant={variant}
        data-size={size}
        onClick={onPress}
        {...props}
      >
        {children}
      </button>
    ),
}));

describe("SidebarSectionFooter", () => {
  it("渲染子节点于横向容器", () => {
    render(
      <SidebarSectionFooter>
        <span>左</span>
        <span>右</span>
      </SidebarSectionFooter>,
    );
    expect(screen.getByText("左")).toBeTruthy();
    expect(screen.getByText("右")).toBeTruthy();
  });
});

describe("SidebarFooterButton", () => {
  it("tone=primary 使用淡主色底样式且等宽", () => {
    render(<SidebarFooterButton tone="primary">发表</SidebarFooterButton>);
    const cls = screen.getByRole("button", { name: "发表" }).className;
    expect(cls).toContain("flex-1");
    expect(cls).toContain("bg-primary/10");
    expect(cls).toContain("text-primary");
  });

  it("tone=ghost 使用透明描边样式且等宽", () => {
    render(<SidebarFooterButton tone="ghost">查看更多</SidebarFooterButton>);
    const cls = screen.getByRole("button", { name: "查看更多" }).className;
    expect(cls).toContain("flex-1");
    expect(cls).toContain("border-border");
  });

  it("点击触发 onPress", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <SidebarFooterButton tone="primary" onPress={onPress}>
        发表
      </SidebarFooterButton>,
    );
    await user.click(screen.getByRole("button", { name: "发表" }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("传 href 时渲染为链接", () => {
    render(
      <SidebarFooterButton tone="ghost" href="/snippets">
        查看更多
      </SidebarFooterButton>,
    );
    const link = screen.getByRole("link", { name: "查看更多" });
    expect(link.getAttribute("href")).toBe("/snippets");
  });

  it("透传自定义 className", () => {
    render(
      <SidebarFooterButton tone="primary" className="custom-x">
        发表
      </SidebarFooterButton>,
    );
    expect(screen.getByRole("button", { name: "发表" }).className).toContain("custom-x");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- sidebar-section-footer`
Expected: FAIL（模块 `./sidebar-section-footer` 不存在 / 导入报错）

- [ ] **Step 3: 实现组件**

`apps/web/components/sidebar/sidebar-section-footer.tsx`：

```tsx
import type { ReactNode } from "react";
import { Button, cn, type ButtonProps } from "@repo/ui";

interface SidebarSectionFooterProps {
  children: ReactNode;
}

/** 侧栏区块底部 CTA 行：双等宽按钮横向排列，无顶部分隔线 */
export function SidebarSectionFooter({ children }: SidebarSectionFooterProps) {
  return <div className="flex gap-2 px-4 py-3">{children}</div>;
}

type SidebarFooterButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  /** primary=主操作（淡主色底）；ghost=次操作（透明描边） */
  tone: "primary" | "ghost";
};

const TONE_CLASSES: Record<SidebarFooterButtonProps["tone"], string> = {
  primary: "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
  ghost: "border border-border text-(--fg2) hover:bg-accent hover:text-foreground",
};

/** 底部 CTA 按钮：扁平描边、等宽（flex-1），按 tone 切换主/次样式 */
export function SidebarFooterButton({
  tone,
  className,
  children,
  ...props
}: SidebarFooterButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("flex-1 gap-1 font-medium", TONE_CLASSES[tone], className)}
      {...props}
    >
      {children}
    </Button>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- sidebar-section-footer`
Expected: PASS（6 个用例全过）

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/sidebar/sidebar-section-footer.tsx apps/web/components/sidebar/sidebar-section-footer.test.tsx
git commit -m "feat(web): 新增侧栏底部 CTA 共享组件 SidebarSectionFooter"
```

---

## Task 2: 从 sidebar index 导出

**Files:**
- Modify: `apps/web/components/sidebar/index.ts`

- [ ] **Step 1: 追加导出**

在 `apps/web/components/sidebar/index.ts` 末尾追加：

```ts
export { SidebarSectionFooter, SidebarFooterButton } from "./sidebar-section-footer";
```

- [ ] **Step 2: 类型检查通过**

Run: `pnpm --filter web check-types`
Expected: PASS（无报错）

- [ ] **Step 3: 提交**

```bash
git add apps/web/components/sidebar/index.ts
git commit -m "feat(web): 导出 SidebarSectionFooter 与 SidebarFooterButton"
```

---

## Task 3: 碎语模块底部改用新组件

**Files:**
- Modify: `apps/web/components/snippets/snippets-section.tsx`（底部按钮行，原 93-108 行）
- Test: `apps/web/components/snippets/snippets-section.test.tsx`

- [ ] **Step 1: 更新测试断言**

在 `snippets-section.test.tsx` 的 `vi.mock("@repo/ui", ...)` 中确保 `Button` 透传 `className`（当前 mock 已 `{...props}` 透传，无需改）。新增/替换底部相关用例——把原「发表碎语和查看更多按钮存在」用例（约 218-222 行）替换为：

```tsx
  it("底部渲染发表碎语（主操作）与查看更多（次操作）", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByRole("button", { name: /发表碎语/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /查看更多/ })).toBeTruthy();
    // 主操作前置 plus 图标、查看更多后置 arrow-forward 图标
    expect(screen.getByTestId("icon-plus")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-forward")).toBeTruthy();
  });
```

> 说明：现有 `@repo/icons` mock 把 `SvgIcon` 渲染成 `data-testid={`icon-${name}`}`，故按钮内图标会被并入按钮可访问名，`name: /发表碎语/` 用正则匹配。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- snippets-section`
Expected: FAIL（`icon-plus` / `icon-arrow-forward` 不存在）

- [ ] **Step 3: 改实现**

在 `snippets-section.tsx`：

3a. 顶部 import 增加 `SidebarSectionFooter, SidebarFooterButton`，与现有 sidebar 导入合并：

```tsx
import {
  SidebarSectionAction,
  SidebarSectionFooter,
  SidebarFooterButton,
  SidebarSectionHeader,
} from "@/components/sidebar";
```

3b. 把原底部按钮行（`<div className="flex gap-2 border-t border-border/40 px-4 py-3">...</div>` 整块，含两个 `<Button>`）替换为：

```tsx
        <SidebarSectionFooter>
          <SidebarFooterButton tone="primary">
            <SvgIcon name="plus" size={12} />
            {t("snippet.postNew")}
          </SidebarFooterButton>
          <SidebarFooterButton tone="ghost">
            {t("snippet.viewMore")}
            <SvgIcon name="arrow-forward" size={12} />
          </SidebarFooterButton>
        </SidebarSectionFooter>
```

3c. 若 `Button` 在文件内已无其它用处，从 `@repo/ui` 的 import 中移除 `Button`（保留其它仍被使用的导入）。检查全文件确认无残留 `<Button` 后再删。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- snippets-section`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/snippets/snippets-section.tsx apps/web/components/snippets/snippets-section.test.tsx
git commit -m "refactor(web): 碎语底部改用 SidebarSectionFooter 双等宽按钮"
```

---

## Task 4: 最近来访模块底部改用新组件

**Files:**
- Modify: `apps/web/components/sidebar/recent-visitors.tsx`（底部按钮行，原 37-44 行）
- Test: `apps/web/components/sidebar/sidebar.test.tsx`（`RecentVisitors` 的底部用例）

- [ ] **Step 1: 更新测试断言**

在 `sidebar.test.tsx` 的 `@repo/ui` mock 中，`Button` 已透传 `{...props}`（含 `className`），无需改。把原「两个底部按钮（入驻 QQ 群 / 查看更多）存在」用例（约 139-143 行）替换为：

```tsx
  it("底部渲染入驻 QQ 群（主操作）与查看更多（次操作）", () => {
    render(<RecentVisitors visitors={mockVisitors} />);
    expect(screen.getByRole("button", { name: /入驻 QQ 群/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /查看更多/ })).toBeTruthy();
    expect(screen.getByTestId("icon-qq")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-forward")).toBeTruthy();
  });
```

> 说明：`sidebar.test.tsx` 已 mock `@repo/icons` 的 `SvgIcon` 为 `data-testid={`icon-${name}`}`（约 26-30 行），可直接断言图标。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test -- sidebar.test`
Expected: FAIL（`icon-qq` / `icon-arrow-forward` 不存在）

- [ ] **Step 3: 改实现**

在 `recent-visitors.tsx`：

3a. 顶部 import：增加 `SvgIcon`，并把 sidebar 导入补上新组件：

```tsx
import { SvgIcon } from "@repo/icons";
import {
  SidebarFooterButton,
  SidebarSectionFooter,
  SidebarSectionHeader,
} from "@/components/sidebar";
```

3b. 把原底部行（`<div className="flex gap-2 px-4 pb-[15px]">...</div>`，含两个 `<Button>`）替换为：

```tsx
      <SidebarSectionFooter>
        <SidebarFooterButton tone="primary">
          <SvgIcon name="qq" size={12} />
          {t("sidebar.joinQQ")}
        </SidebarFooterButton>
        <SidebarFooterButton tone="ghost">
          {t("sidebar.viewMore")}
          <SvgIcon name="arrow-forward" size={12} />
        </SidebarFooterButton>
      </SidebarSectionFooter>
```

3c. 从 `@repo/ui` import 中移除不再使用的 `Button`（确认全文件无 `<Button` 残留）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test -- sidebar.test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/sidebar/recent-visitors.tsx apps/web/components/sidebar/sidebar.test.tsx
git commit -m "refactor(web): 最近来访底部改用 SidebarSectionFooter 双等宽按钮"
```

---

## Task 5: 整体验证

**Files:** 无（仅校验）

- [ ] **Step 1: 跑 web 全量测试**

Run: `pnpm --filter web test`
Expected: PASS（无失败用例）

- [ ] **Step 2: 类型检查 + lint**

Run: `pnpm -r --if-present check-types && pnpm -r --if-present lint`
Expected: 全部 Done，无 error

- [ ] **Step 3: 浏览器视觉确认（可选但推荐）**

启动 dev server，打开首页，确认碎语 / 来访两模块底部按钮：等宽、扁平描边、主操作淡主色底、hover 浮出底色、无渐变 / 阴影 / 胶囊。两模块视觉对齐。

---

## Self-Review

- **Spec coverage：** 共享组件（Task 1）、导出（Task 2）、碎语底部（Task 3）、来访底部（Task 4）、图标复用（Task 3/4 用 plus/qq/arrow-forward）、i18n 复用现有 key（Task 3/4）、测试（各 Task + Task 5）——spec 各节均有对应任务。范围外项（不动卡片主体、不改 @repo/ui Button）在实现步骤中未触碰。
- **Placeholder 扫描：** 无 TBD/TODO，所有代码步骤含完整代码与命令。
- **类型一致性：** `SidebarFooterButton` 的 `tone: "primary" | "ghost"`、`SidebarSectionFooter` 的 children-only props 在 Task 1 定义后，Task 3/4 调用方式与之一致；图标名 `plus`/`qq`/`arrow-forward` 全程一致。
```
