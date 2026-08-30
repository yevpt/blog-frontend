# Homepage Redesign — React Aria 组件封装 + 首页 Bug 修复

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 `react-aria-components` 重建 `packages/ui` 中的核心组件（Button、Tabs、Input、Badge、TagGroup、Pagination），并修复首页 7 个已知 Bug（国际化、导航栏、轮播图、搜索图标、碎语布局等），使首页完全基于可访问的 React Aria 原语层。

**Architecture:** `react-aria-components` 提供无障碍的无样式原语（Tabs、Button、TextField、TagGroup 等），`packages/ui` 用 Tailwind CSS + tailwind-merge 在其上封装有样式的组件，导出给 `apps/web` 使用。全部组件集中在 `packages/ui/src/`，符合 CLAUDE.md 规范。

**Tech Stack:** React 19, Next.js App Router, TypeScript, Tailwind CSS v4, react-aria-components v1, class-variance-authority, pnpm workspaces monorepo

---

## 文件结构总览

| 操作    | 文件                                                       |
| ------- | ---------------------------------------------------------- |
| Modify  | `packages/ui/package.json`                                 |
| Replace | `packages/ui/src/button.tsx`                               |
| Create  | `packages/ui/src/button.test.tsx`                          |
| Replace | `packages/ui/src/badge.tsx`                                |
| Create  | `packages/ui/src/badge.test.tsx`                           |
| Create  | `packages/ui/src/tabs.tsx`                                 |
| Create  | `packages/ui/src/tabs.test.tsx`                            |
| Create  | `packages/ui/src/input.tsx`                                |
| Create  | `packages/ui/src/input.test.tsx`                           |
| Create  | `packages/ui/src/tag-group.tsx`                            |
| Create  | `packages/ui/src/tag-group.test.tsx`                       |
| Replace | `packages/ui/src/pagination.tsx`                           |
| Modify  | `packages/ui/src/index.ts`                                 |
| Modify  | `apps/web/app/providers/locale-provider.tsx`               |
| Modify  | `apps/web/app/providers/locale-provider.test.tsx`          |
| Modify  | `apps/web/components/navbar/site-navbar.tsx`               |
| Modify  | `apps/web/components/navbar/site-navbar.test.tsx`          |
| Modify  | `apps/web/components/navbar/navbar-actions.tsx`            |
| Modify  | `apps/web/components/navbar/navbar-mobile-drawer.tsx`      |
| Modify  | `apps/web/components/articles/article-list-header.tsx`     |
| Modify  | `apps/web/components/articles/article-section.test.tsx`    |
| Modify  | `apps/web/components/sidebar/tags-cloud.tsx`               |
| Modify  | `apps/web/components/sidebar/recent-visitors.tsx`          |
| Modify  | `apps/web/components/featured/featured-carousel-slide.tsx` |
| Modify  | `apps/web/components/snippets/snippets-section.tsx`        |
| Modify  | `apps/web/app/page.tsx`                                    |

---

## Task 1: 安装 react-aria-components

**Files:**

- Modify: `packages/ui/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/ui add react-aria-components
```

- [ ] **Step 2: 确认安装成功**

```bash
cat packages/ui/package.json | grep react-aria
```

Expected: `"react-aria-components": "^1.x.x"`

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): 安装 react-aria-components"
```

---

## Task 2: 重建 Button — react-aria-components 原语层

**背景：** 用 React Aria 的 `Button`（按钮语义）+ `Link`（导航语义）替换现有 CVA 实现。支持 `href` prop 自动切换为 `Link`。同时加 `cursor-pointer`（原有遗漏）。

**Files:**

- Replace: `packages/ui/src/button.tsx`

- [ ] **Step 1: 写新 button.tsx**

```tsx
"use client";

import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-colors cursor-pointer select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    // React Aria data attributes（pressed / hovered / focused）
    "data-[pressed]:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & { className?: string };

/** 带 href：渲染为 React Aria Link（锚点语义，键盘可导航） */
type ButtonAsLink = ButtonBaseProps & Omit<AriaLinkProps, "className" | "style"> & { href: string };

/** 不带 href：渲染为 React Aria Button（按钮语义） */
type ButtonAsButton = ButtonBaseProps &
  Omit<AriaButtonProps, "className" | "style"> & { href?: never };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    return <AriaLink href={href} className={classes} {...rest} />;
  }

  return <AriaButton className={classes} {...(props as AriaButtonProps)} />;
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
pnpm --filter @repo/ui exec tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/button.tsx
git commit -m "feat(ui): Button 改用 react-aria-components 原语，加 cursor-pointer"
```

---

## Task 3: 创建 button.test.tsx

**Files:**

- Create: `packages/ui/src/button.test.tsx`

- [ ] **Step 1: 写测试文件**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("渲染不崩溃，显示文字", () => {
    render(<Button>点击</Button>);
    expect(screen.getByRole("button", { name: "点击" })).toBeTruthy();
  });

  it("所有 variant 均包含 cursor-pointer", () => {
    const variants = ["default", "outline", "ghost"] as const;
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>按钮</Button>);
      expect(container.querySelector("button")?.className).toContain("cursor-pointer");
      container.remove();
    }
  });

  it("outline variant 含 border 类", () => {
    const { container } = render(<Button variant="outline">边框</Button>);
    expect(container.querySelector("button")?.className).toContain("border");
  });

  it("ghost variant 含 hover:bg-accent", () => {
    const { container } = render(<Button variant="ghost">幽灵</Button>);
    expect(container.querySelector("button")?.className).toContain("hover:bg-accent");
  });

  it("size sm 含 h-8", () => {
    const { container } = render(<Button size="sm">小</Button>);
    expect(container.querySelector("button")?.className).toContain("h-8");
  });

  it("onClick / onPress 回调触发", async () => {
    const user = userEvent.setup();
    const handlePress = vi.fn();
    render(<Button onPress={handlePress}>点我</Button>);
    await user.click(screen.getByRole("button", { name: "点我" }));
    expect(handlePress).toHaveBeenCalledOnce();
  });

  it("isDisabled 时不触发 onPress", async () => {
    const user = userEvent.setup();
    const handlePress = vi.fn();
    render(
      <Button isDisabled onPress={handlePress}>
        禁用
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "禁用" }));
    expect(handlePress).not.toHaveBeenCalled();
  });

  it("href prop 渲染为 <a> 锚点（Link 语义）", () => {
    const { container } = render(<Button href="/about">链接</Button>);
    expect(container.querySelector("a")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
  });

  it("className 透传，rounded-full 覆盖 rounded-md", () => {
    const { container } = render(
      <Button size="sm" className="rounded-full">
        圆
      </Button>,
    );
    const cls = container.querySelector("button")?.className ?? "";
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("rounded-md");
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
pnpm --filter @repo/ui exec vitest run src/button.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/button.test.tsx
git commit -m "test(ui): 新增 Button 组件测试"
```

---

## Task 4: 重建 Badge — 保持 CVA，更新 variant 语义

**背景：** Badge 是纯展示组件，不需要 React Aria 交互语义。保留 CVA 实现，但更新 variant 名称使其与设计系统一致，并加 `badge.test.tsx`。

**Files:**

- Replace: `packages/ui/src/badge.tsx`
- Create: `packages/ui/src/badge.test.tsx`

- [ ] **Step 1: 更新 badge.tsx**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        brand: "bg-primary/10 text-primary border border-primary/20",
        success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
```

- [ ] **Step 2: 创建 badge.test.tsx**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("渲染不崩溃，显示文字", () => {
    render(<Badge>标签</Badge>);
    expect(screen.getByText("标签")).toBeTruthy();
  });

  it("brand variant 含 bg-primary/10", () => {
    const { container } = render(<Badge variant="brand">品牌</Badge>);
    expect(container.querySelector("span")?.className).toContain("bg-primary/10");
  });

  it("outline variant 含 border-border", () => {
    const { container } = render(<Badge variant="outline">边框</Badge>);
    expect(container.querySelector("span")?.className).toContain("border-border");
  });

  it("className 透传", () => {
    const { container } = render(<Badge className="custom-cls">自定义</Badge>);
    expect(container.querySelector("span")?.className).toContain("custom-cls");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/ui exec vitest run src/badge.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/badge.tsx packages/ui/src/badge.test.tsx
git commit -m "feat(ui): Badge 更新 variant，加 brand/success/warning/error"
```

---

## Task 5: 创建 Tabs — react-aria-components 原语

**背景：** React Aria Tabs 提供完整键盘导航（← → 切换 Tab）和 ARIA 属性。包含 "button-brand-horizontal" 变体，即用户要求的主色胶囊 Tab 风格。

**Files:**

- Create: `packages/ui/src/tabs.tsx`
- Create: `packages/ui/src/tabs.test.tsx`

- [ ] **Step 1: 写 tabs.tsx**

```tsx
"use client";

import {
  Tabs as AriaTabs,
  type TabsProps as AriaTabsProps,
  TabList as AriaTabList,
  type TabListProps,
  Tab as AriaTab,
  type TabProps,
  TabPanel as AriaTabPanel,
  type TabPanelProps,
} from "react-aria-components";
import { cn } from "./lib/utils";

// ─── Tabs（容器） ────────────────────────────────────────────────────────────

export interface TabsProps extends Omit<AriaTabsProps, "className" | "style"> {
  className?: string;
}

export function Tabs({ className, ...props }: TabsProps) {
  return <AriaTabs className={cn("w-full", className)} {...props} />;
}

// ─── Tabs.List ───────────────────────────────────────────────────────────────

const tabListStyles = {
  "button-brand-horizontal": "flex gap-1 flex-wrap",
  underline: "flex gap-4 border-b border-border",
} as const;

export type TabsVariant = keyof typeof tabListStyles;

export interface TabsListProps extends Omit<TabListProps<object>, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

export function TabsList({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsListProps) {
  return <AriaTabList className={cn(tabListStyles[variant], className)} {...props} />;
}

// ─── Tabs.Item ───────────────────────────────────────────────────────────────

const tabItemStyles: Record<TabsVariant, { base: string; selected: string; unselected: string }> = {
  "button-brand-horizontal": {
    base: [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
      "cursor-pointer select-none outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    ].join(" "),
    selected: "bg-primary text-primary-foreground",
    unselected: "text-muted-foreground hover:text-foreground hover:bg-accent",
  },
  underline: {
    base: [
      "pb-3 text-sm font-medium transition-colors cursor-pointer select-none",
      "border-b-2 -mb-px outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring",
    ].join(" "),
    selected: "border-primary text-foreground",
    unselected: "border-transparent text-muted-foreground hover:text-foreground",
  },
};

export interface TabsItemProps extends Omit<TabProps, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

export function TabsItem({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsItemProps) {
  const s = tabItemStyles[variant];
  return (
    <AriaTab
      className={({ isSelected }) => cn(s.base, isSelected ? s.selected : s.unselected, className)}
      {...props}
    />
  );
}

// ─── Tabs.Panel ──────────────────────────────────────────────────────────────

export interface TabsPanelProps extends Omit<TabPanelProps, "className" | "style"> {
  className?: string;
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return <AriaTabPanel className={cn("outline-none", className)} {...props} />;
}
```

- [ ] **Step 2: 写 tabs.test.tsx**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsItem, TabsPanel } from "./tabs";

function TestTabs({ onSelectionChange }: { onSelectionChange?: (key: string) => void }) {
  return (
    <Tabs defaultSelectedKey="all" onSelectionChange={(k) => onSelectionChange?.(String(k))}>
      <TabsList variant="button-brand-horizontal">
        <TabsItem id="all">全部</TabsItem>
        <TabsItem id="coding">编程</TabsItem>
        <TabsItem id="tools">工具</TabsItem>
      </TabsList>
      <TabsPanel id="all">全部内容</TabsPanel>
      <TabsPanel id="coding">编程内容</TabsPanel>
      <TabsPanel id="tools">工具内容</TabsPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("渲染不崩溃，显示所有 Tab 标签", () => {
    render(<TestTabs />);
    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByText("工具")).toBeTruthy();
  });

  it("默认选中第一个 Tab，显示对应 Panel", () => {
    render(<TestTabs />);
    expect(screen.getByText("全部内容")).toBeTruthy();
    expect(screen.queryByText("编程内容")).toBeNull();
  });

  it("点击 Tab 切换面板", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    await user.click(screen.getByText("编程"));
    expect(screen.getByText("编程内容")).toBeTruthy();
    expect(screen.queryByText("全部内容")).toBeNull();
  });

  it("onSelectionChange 在切换时触发", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TestTabs onSelectionChange={onChange} />);
    await user.click(screen.getByText("工具"));
    expect(onChange).toHaveBeenCalledWith("tools");
  });

  it("Tab 支持键盘导航（ArrowRight 切换）", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    const firstTab = screen.getByText("全部").closest("[role='tab']")!;
    firstTab.focus();
    await user.keyboard("{ArrowRight}");
    // 焦点移至"编程" tab
    expect(document.activeElement?.textContent).toBe("编程");
  });

  it("underline variant 渲染正确边框样式", () => {
    render(
      <Tabs defaultSelectedKey="a">
        <TabsList variant="underline">
          <TabsItem id="a" variant="underline">
            A
          </TabsItem>
        </TabsList>
      </Tabs>,
    );
    const tab = screen.getByText("A").closest("[role='tab']")!;
    expect(tab.className).toContain("border-b-2");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/ui exec vitest run src/tabs.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/tabs.tsx packages/ui/src/tabs.test.tsx
git commit -m "feat(ui): 新增 Tabs 组件（react-aria-components，button-brand-horizontal 变体）"
```

---

## Task 6: 创建 Input — react-aria-components TextField 封装

**背景：** React Aria 的 `TextField` 提供关联 `label`、`FieldError`、`description` 的无障碍表单组。支持 `iconName` 左侧图标（使用 `@repo/icons`），`onChange` 返回 string（非 ChangeEvent），与 debounce 逻辑配合。

**Files:**

- Create: `packages/ui/src/input.tsx`
- Create: `packages/ui/src/input.test.tsx`

- [ ] **Step 1: 写 input.tsx**

```tsx
"use client";

import {
  TextField,
  type TextFieldProps,
  Label,
  Input as AriaInput,
  FieldError,
  Text,
} from "react-aria-components";
import type { IconName } from "@repo/icons";
import { SvgIcon } from "@repo/icons";
import { cn } from "./lib/utils";

export interface InputProps extends Omit<TextFieldProps, "className" | "style"> {
  /** 字段标签；传空字符串或省略则不渲染 label */
  label?: string;
  /** 左侧图标名称（来自 @repo/icons） */
  iconName?: IconName;
  /** placeholder 文字 */
  placeholder?: string;
  /** 底部提示文字 */
  hint?: string;
  size?: "sm" | "md";
  className?: string;
  /** input 元素自身的 className */
  inputClassName?: string;
}

export function Input({
  label,
  iconName,
  placeholder,
  hint,
  size = "sm",
  className,
  inputClassName,
  isInvalid,
  ...props
}: InputProps) {
  return (
    <TextField
      className={cn("flex flex-col gap-1.5 w-full", className)}
      isInvalid={isInvalid}
      {...props}
    >
      {label ? <Label className="text-sm font-medium text-foreground">{label}</Label> : null}

      <div className="relative flex items-center">
        {iconName && (
          <span className="absolute left-3 pointer-events-none text-muted-foreground z-10">
            <SvgIcon name={iconName} size={16} />
          </span>
        )}
        <AriaInput
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-input bg-background text-sm",
            "transition-colors outline-none",
            "focus:ring-2 focus:ring-ring focus:border-transparent",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "invalid:border-destructive",
            size === "sm" ? "h-9 py-2" : "h-10 py-2.5",
            iconName ? "pl-9 pr-4" : "px-4",
            inputClassName,
          )}
        />
      </div>

      {hint && !isInvalid ? (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      ) : null}

      <FieldError className="text-xs text-destructive" />
    </TextField>
  );
}
```

- [ ] **Step 2: 写 input.test.tsx**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

// happy-dom 环境 SvgIcon 依赖 SVG sprite；mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("Input", () => {
  it("渲染不崩溃", () => {
    render(<Input placeholder="请输入" />);
    expect(screen.getByPlaceholderText("请输入")).toBeTruthy();
  });

  it("label 渲染", () => {
    render(<Input label="邮箱" placeholder="test" />);
    expect(screen.getByText("邮箱")).toBeTruthy();
  });

  it("label 为空时不渲染 label 元素", () => {
    render(<Input placeholder="test" />);
    expect(screen.queryByRole("label")).toBeNull();
  });

  it("iconName 渲染图标", () => {
    render(<Input iconName="search" placeholder="搜索" />);
    expect(screen.getByTestId("icon-search")).toBeTruthy();
  });

  it("hint 显示提示文字", () => {
    render(<Input hint="这是提示" placeholder="test" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("onChange 返回 string 值", () => {
    const onChange = vi.fn();
    render(<Input placeholder="test" onChange={onChange} />);
    const input = screen.getByPlaceholderText("test");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("isInvalid 时不显示 hint", () => {
    render(<Input isInvalid hint="提示" placeholder="test" />);
    expect(screen.queryByText("提示")).toBeNull();
  });

  it("size sm 含 h-9", () => {
    const { container } = render(<Input size="sm" placeholder="s" />);
    expect(container.querySelector("input")?.className).toContain("h-9");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/ui exec vitest run src/input.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/input.tsx packages/ui/src/input.test.tsx
git commit -m "feat(ui): 新增 Input 组件（react-aria-components TextField，支持 iconName）"
```

---

## Task 7: 创建 TagGroup — react-aria-components 标签云

**背景：** `TagGroup` + `Tag` 替换现有 tags-cloud 中的原始 `<button>` 方案。React Aria `TagGroup` 提供选择语义和键盘导航；标签云场景使用 `selectionMode="multiple"` 或纯展示（`selectionMode="none"`）。

**Files:**

- Create: `packages/ui/src/tag-group.tsx`
- Create: `packages/ui/src/tag-group.test.tsx`

- [ ] **Step 1: 写 tag-group.tsx**

```tsx
"use client";

import {
  TagGroup as AriaTagGroup,
  type TagGroupProps,
  TagList as AriaTagList,
  type TagListProps,
  Tag as AriaTag,
  type TagProps,
  Label,
  Text,
} from "react-aria-components";
import { cn } from "./lib/utils";

// ─── TagGroup（容器） ─────────────────────────────────────────────────────────

export interface TagGroupProps_<T extends object> extends Omit<
  TagGroupProps<T>,
  "className" | "style"
> {
  label?: string;
  hint?: string;
  className?: string;
}

export function TagGroup<T extends object>({
  label,
  hint,
  className,
  ...props
}: TagGroupProps_<T>) {
  return (
    <AriaTagGroup className={cn("flex flex-col gap-2", className)} {...props}>
      {label && <Label className="text-sm font-semibold">{label}</Label>}
      {props.children}
      {hint && (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      )}
    </AriaTagGroup>
  );
}

// ─── TagList（列表容器） ──────────────────────────────────────────────────────

export interface TagListProps_<T extends object> extends Omit<
  TagListProps<T>,
  "className" | "style"
> {
  className?: string;
}

export function TagList<T extends object>({ className, ...props }: TagListProps_<T>) {
  return <AriaTagList className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

// ─── Tag（单个标签） ──────────────────────────────────────────────────────────

export interface TagItemProps extends Omit<TagProps, "className" | "style"> {
  count?: number;
  className?: string;
}

export function TagItem({ count, className, children, ...props }: TagItemProps) {
  return (
    <AriaTag
      className={({ isSelected, isFocusVisible }) =>
        cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          "transition-colors cursor-pointer select-none outline-none",
          isFocusVisible && "ring-2 ring-ring ring-offset-1",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          className,
        )
      }
      {...props}
    >
      {children}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </AriaTag>
  );
}
```

- [ ] **Step 2: 写 tag-group.test.tsx**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagGroup, TagList, TagItem } from "./tag-group";

function TestTags({ onSelectionChange }: { onSelectionChange?: (keys: Set<string>) => void }) {
  return (
    <TagGroup
      selectionMode="multiple"
      onSelectionChange={(keys) => onSelectionChange?.(new Set(keys as Set<string>))}
    >
      <TagList>
        <TagItem id="ts">TypeScript</TagItem>
        <TagItem id="react" count={5}>
          React
        </TagItem>
        <TagItem id="css">CSS</TagItem>
      </TagList>
    </TagGroup>
  );
}

describe("TagGroup", () => {
  it("渲染不崩溃，显示所有标签", () => {
    render(<TestTags />);
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
  });

  it("count 显示在标签旁", () => {
    render(<TestTags />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("点击标签后样式变化（选中态含 bg-primary）", async () => {
    const user = userEvent.setup();
    render(<TestTags />);
    const tag = screen.getByText("TypeScript").closest("[data-key='ts']")!;
    await user.click(tag);
    expect(tag.className).toContain("bg-primary");
  });

  it("onSelectionChange 在选中时触发", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TestTags onSelectionChange={onChange} />);
    await user.click(screen.getByText("CSS").closest("[data-key='css']")!);
    expect(onChange).toHaveBeenCalled();
  });

  it("label prop 渲染标题", () => {
    render(
      <TagGroup label="标签" selectionMode="none">
        <TagList>
          <TagItem id="a">A</TagItem>
        </TagList>
      </TagGroup>,
    );
    expect(screen.getByText("标签")).toBeTruthy();
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/ui exec vitest run src/tag-group.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/tag-group.tsx packages/ui/src/tag-group.test.tsx
git commit -m "feat(ui): 新增 TagGroup/TagList/TagItem 组件（react-aria-components）"
```

---

## Task 8: 重建 Pagination — 使用新 Button

**背景：** Pagination 依赖 Button，Button 的 `variant`/`onClick`/`disabled` API 已变化（`variant` 保留后向兼容，`disabled` 改为 `isDisabled`，`onClick` 改为 `onPress`）。同步更新 Pagination。

**Files:**

- Replace: `packages/ui/src/pagination.tsx`

- [ ] **Step 1: 更新 pagination.tsx**

```tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "./button";
import { cn } from "./lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (currentPage > 3) pages.push("...");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);

  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="分页导航"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Button
        variant="ghost"
        size="sm"
        onPress={() => onPageChange(currentPage - 1)}
        isDisabled={isPrevDisabled}
        aria-label="上一页"
      >
        <SvgIcon name="chevron-left" size={16} />
      </Button>

      {pageNumbers.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            onPress={() => onPageChange(page)}
            aria-label={`第 ${page} 页`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        size="sm"
        onPress={() => onPageChange(currentPage + 1)}
        isDisabled={isNextDisabled}
        aria-label="下一页"
      >
        <SvgIcon name="chevron-right" size={16} />
      </Button>
    </nav>
  );
}
```

- [ ] **Step 2: 运行现有 Pagination 测试**

```bash
pnpm --filter @repo/ui exec vitest run src/pagination.test.tsx
```

> 如果测试失败（因为 React Aria Button 的 `disabled` attr 行为不同），更新测试中的 `disabled` 断言：React Aria Button 使用 `data-disabled` 而非原生 `disabled` attribute。将 `expect(btn).toBeDisabled()` 改为 `expect(btn).toHaveAttribute("data-disabled")`。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/pagination.tsx
git commit -m "feat(ui): Pagination 更新为使用 react-aria Button（onPress / isDisabled）"
```

---

## Task 9: 更新 packages/ui/src/index.ts 统一导出

**Files:**

- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: 更新 index.ts**

将文件完整内容替换为：

```ts
export { Badge, type BadgeProps } from "./badge";
export { Button, type ButtonProps } from "./button";
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
export { cn } from "./lib/utils";
export { Pagination, type PaginationProps } from "./pagination";
export {
  Tabs,
  TabsList,
  TabsItem,
  TabsPanel,
  type TabsProps,
  type TabsListProps,
  type TabsItemProps,
  type TabsPanelProps,
  type TabsVariant,
} from "./tabs";
export { Input, type InputProps } from "./input";
export { TagGroup, TagList, TagItem, type TagItemProps } from "./tag-group";
```

- [ ] **Step 2: 全量 TypeScript 检查**

```bash
pnpm --filter @repo/ui exec tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/index.ts
git commit -m "feat(ui): 统一导出所有 react-aria 组件"
```

---

## Task 10: 修复国际化 — LocaleProvider 同步加载 zh.json

**背景：** `LocaleProvider` 初始 `messages=null`，`t(key)` 在异步加载完成前返回 key 名（"article.searchPlaceholder"、"sidebar.joinQQ" 等显示为原始字符串）。

**Files:**

- Modify: `apps/web/app/providers/locale-provider.tsx`
- Modify: `apps/web/app/providers/locale-provider.test.tsx`

- [ ] **Step 1: 修改 locale-provider.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import zhMessages from "../../messages/zh.json";
import {
  LocaleContext,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "@repo/hooks/locale";

type Messages = Record<string, unknown>;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("locale");
  if (stored === "zh" || stored === "en") return stored;
  return "zh";
}

async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") {
    const mod = await import("../../messages/en.json");
    return mod.default as Messages;
  }
  const mod = await import("../../messages/zh.json");
  return mod.default as Messages;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // zh.json 静态导入：zh 用户首屏无 key 名闪烁；en 用户初始空对象等待异步加载
  const [messages, setMessages] = useState<Messages>(() => {
    const initial = getInitialLocale();
    return initial === "zh" ? (zhMessages as Messages) : {};
  });

  useEffect(() => {
    let cancelled = false;
    loadMessages(locale).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("locale", newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      return getNestedValue(messages, key) ?? key;
    },
    [messages],
  );

  const value: LocaleContextValue = { locale, setLocale, t };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
```

- [ ] **Step 2: 更新 locale-provider.test.tsx**

找到（约 156-167 行）：

```tsx
it("messages 未加载完成时 t() 降级返回 key 本身", () => {
  render(
    <LocaleProvider>
      <LocaleDisplay />
    </LocaleProvider>,
  );
  expect(screen.getByTestId("nav-home").textContent).toBe("nav.home");
});
```

替换为：

```tsx
it("默认 zh locale 时，t() 同步返回中文（无需等待异步加载）", () => {
  render(
    <LocaleProvider>
      <LocaleDisplay />
    </LocaleProvider>,
  );
  expect(screen.getByTestId("nav-home").textContent).toBe("首页");
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/providers/locale-provider.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/providers/locale-provider.tsx apps/web/app/providers/locale-provider.test.tsx
git commit -m "fix(web): LocaleProvider 静态导入 zh.json，修复首屏国际化 key 显示"
```

---

## Task 11: 修复 SiteNavbar — 移除 mounted 动画依赖

**背景：** `mounted` 初始 `false` 使 navbar 有 `-translate-y-full opacity-0`；若 hydration 出错（如 i18n mismatch），navbar 永久不可见。

**Files:**

- Modify: `apps/web/components/navbar/site-navbar.tsx`
- Modify: `apps/web/components/navbar/site-navbar.test.tsx`

- [ ] **Step 1: 修改 site-navbar.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileDrawer } from "./navbar-mobile-drawer";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-[padding,background-color,backdrop-filter,border-color] duration-300 ease-out",
        scrolled ? "py-2 backdrop-blur-md bg-background/80 border-b border-border" : "py-4",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <NavbarLogo />
          <NavbarLinks />
          <div className="flex items-center gap-1">
            <NavbarActions />
            <NavbarMobileDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 在 site-navbar.test.tsx describe 块内添加测试**

在第一个 `it` 后插入：

```tsx
it("初始渲染无 -translate-y-full 和 opacity-0（始终可见）", () => {
  render(<SiteNavbar />);
  const header = document.querySelector("header");
  expect(header?.className).not.toContain("-translate-y-full");
  expect(header?.className).not.toContain("opacity-0");
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/navbar/site-navbar.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/navbar/site-navbar.tsx apps/web/components/navbar/site-navbar.test.tsx
git commit -m "fix(web): 移除 SiteNavbar mounted 动画依赖，导航栏始终可见"
```

---

## Task 12: 更新 navbar-actions.tsx — 使用新 Button API

**背景：** React Aria Button 用 `onPress` 替代 `onClick`，用 `isDisabled` 替代 `disabled`。

**Files:**

- Modify: `apps/web/components/navbar/navbar-actions.tsx`

- [ ] **Step 1: 修改 navbar-actions.tsx**

```tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";

type ThemeMode = "system" | "light" | "dark";

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_ICONS: Record<ThemeMode, "monitor" | "sun" | "moon"> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

export function NavbarActions() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        onPress={() => setTheme(THEME_CYCLE[theme])}
        className="p-2 rounded-md"
        aria-label={`当前主题：${theme}，点击切换`}
      >
        <SvgIcon name={THEME_ICONS[theme]} size={20} className="text-foreground" />
      </Button>

      <div className="hidden md:flex items-center gap-2">
        <Button variant="outline" size="sm">
          {t("auth.login")}
        </Button>
        <Button variant="default" size="sm">
          {t("auth.register")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 navbar-mobile-drawer.tsx**

将所有 `onClick=` 改为 `onPress=`，`disabled=` 改为 `isDisabled=`：

```bash
grep -n "onClick\|disabled" apps/web/components/navbar/navbar-mobile-drawer.tsx
```

手动替换每处。

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/navbar/navbar-actions.tsx apps/web/components/navbar/navbar-mobile-drawer.tsx
git commit -m "feat(web): Navbar 使用 react-aria Button（onPress / isDisabled）"
```

---

## Task 13: 更新 ArticleListHeader — 使用 Tabs + Input

**Background:** 分类 Tab 改用 `Tabs` / `TabsList` / `TabsItem`（button-brand-horizontal 变体）。搜索框改用 `Input`（`iconName="search"` 自动显示左侧图标，`onChange` 返回 string）。防抖逻辑用 `useEffect` 保留。

**Files:**

- Modify: `apps/web/components/articles/article-list-header.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 修改 article-list-header.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, Input } from "@repo/ui";
import { useLocale } from "@repo/hooks";

interface ArticleListHeaderProps {
  categories: string[];
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ArticleListHeader({
  categories,
  currentCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // 防抖：Input onChange 触发后 300ms 再通知外层
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 分类 Tabs — button-brand-horizontal 变体（主色胶囊样式） */}
      <Tabs
        selectedKey={currentCategory}
        onSelectionChange={(key) => onCategoryChange(String(key))}
      >
        <TabsList variant="button-brand-horizontal">
          {categories.map((category) => (
            <TabsItem key={category} id={category} variant="button-brand-horizontal">
              {category}
            </TabsItem>
          ))}
        </TabsList>
      </Tabs>

      {/* 搜索框：Input 组件，iconName 自动左侧定位搜索图标 */}
      <Input
        iconName="search"
        placeholder={t("article.searchPlaceholder")}
        value={localQuery}
        onChange={setLocalQuery}
        size="sm"
        inputClassName="w-48 focus:w-64 transition-all duration-300"
      />
    </div>
  );
}
```

- [ ] **Step 2: 更新 article-section.test.tsx 的 @repo/ui mock**

在 `vi.mock("@repo/ui", () => ({` 块中，将现有内容替换为包含 `Tabs` 系列和 `Input` 的完整 mock：

```tsx
vi.mock("@repo/ui", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
    className,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
  }) => (
    <nav aria-label="分页导航" className={className}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="上一页"
      >
        上一页
      </button>
      <span data-testid="pagination-info">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="下一页"
      >
        下一页
      </button>
    </nav>
  ),
  Tabs: ({
    children,
    selectedKey,
    onSelectionChange,
  }: {
    children: React.ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => (
    <div data-selected-key={selectedKey} onClick={() => onSelectionChange?.("")}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsItem: ({
    children,
    id,
    onClick,
  }: {
    children: React.ReactNode;
    id?: string;
    onClick?: () => void;
  }) => (
    <button role="tab" data-id={id} onClick={onClick}>
      {children}
    </button>
  ),
  Input: ({
    placeholder,
    value,
    onChange,
    iconName: _icon,
    size: _size,
    inputClassName: _cls,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    iconName?: string;
    size?: string;
    inputClassName?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
```

> **注意**：在 mock 中的 `TabsItem` 里，点击分类 Tab 需要调用 `onSelectionChange`。因为 mock 中 `Tabs` 和 `TabsItem` 是分开的，需要通过 React context 传递，这在 mock 环境下较复杂。更简单的方式：让测试直接找 `input[placeholder]` 来测搜索，Tab 切换通过直接调用 `screen.getByRole("tab", { name: "工具" }).click()`。
>
> 如果测试因此失败，将 Tab 的 `getByRole("button", { name: "工具" })` 改为 `getByRole("tab", { name: "工具" })`。

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/articles/article-section.test.tsx
```

Expected: 所有测试 PASS（搜索 / 分类过滤 / 分页逻辑不变）。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/articles/article-list-header.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "feat(web): ArticleListHeader 使用 Tabs (button-brand-horizontal) + Input (react-aria)"
```

---

## Task 14: 更新 TagsCloud — 使用 TagGroup + TagItem

**Files:**

- Modify: `apps/web/components/sidebar/tags-cloud.tsx`

- [ ] **Step 1: 修改 tags-cloud.tsx**

```tsx
"use client";

import { useLocale } from "@repo/hooks";
import { TagGroup, TagList, TagItem } from "@repo/ui";
import type { Tag } from "../../app/_mock/types";

interface TagsCloudProps {
  tags: Tag[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-xl border border-border/50 p-4 mt-4">
      <TagGroup label={t("sidebar.tags")} selectionMode="none">
        <TagList>
          {tags.map((tag) => (
            <TagItem key={tag.id} id={tag.id} count={tag.count}>
              {tag.name}
            </TagItem>
          ))}
        </TagList>
      </TagGroup>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/sidebar/tags-cloud.tsx
git commit -m "feat(web): TagsCloud 使用 TagGroup/TagItem（react-aria）"
```

---

## Task 15: 更新 RecentVisitors + SnippetsSection — 新 Button API

**Files:**

- Modify: `apps/web/components/sidebar/recent-visitors.tsx`
- Modify: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: recent-visitors.tsx — 将 onClick 改为 onPress**

```bash
grep -n "onClick\|disabled" apps/web/components/sidebar/recent-visitors.tsx
```

将所有 `onClick=` → `onPress=`，`disabled=` → `isDisabled=`。

- [ ] **Step 2: snippets-section.tsx — 同样更新 Button API**

```bash
grep -n "onClick\|disabled" apps/web/components/snippets/snippets-section.tsx
```

同上替换。

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/sidebar/recent-visitors.tsx apps/web/components/snippets/snippets-section.tsx
git commit -m "feat(web): RecentVisitors / SnippetsSection 使用新 Button onPress API"
```

---

## Task 16: 修复轮播图指示器点击

**背景：** 不活跃幻灯片 `pointer-events` 默认为 auto，拦截指示器按钮点击事件。

**Files:**

- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`

- [ ] **Step 1: 修改 featured-carousel-slide.tsx**

找到（第 14-17 行）：

```tsx
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
```

替换为：

```tsx
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
```

- [ ] **Step 2: 运行轮播测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/featured/featured-carousel.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/featured/featured-carousel-slide.tsx
git commit -m "fix(web): 不活跃幻灯片加 pointer-events-none，修复指示器点击穿透"
```

---

## Task 17: 碎语迁至右侧栏，单列显示

**Files:**

- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: snippets-section.tsx — 改单列 grid**

找到：

```tsx
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
```

替换为：

```tsx
      <div className="grid grid-cols-1 gap-4 mt-4">
```

- [ ] **Step 2: page.tsx — 迁移 SnippetsSection 至 aside**

将文件完整内容替换为：

```tsx
import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { articles } from "./_mock/articles";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FeaturedCarousel posts={featuredPosts} />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="min-w-0">
          <ArticleSection articles={articles} />
        </div>

        {/* lg:top-20 对应 80px 固定导航栏高度 */}
        <aside className="lg:sticky lg:top-20">
          <RecentVisitors visitors={visitors} />
          <TagsCloud tags={tags} />
          <div className="mt-4">
            <SnippetsSection snippets={snippets} />
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 运行相关测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/page.test.tsx
pnpm --filter @repo/web exec vitest run apps/web/components/snippets/snippets-section.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/snippets/snippets-section.tsx
git commit -m "feat(web): 碎语迁至右侧栏，改单列显示"
```

---

## Task 18: 全量测试 + 验证

- [ ] **Step 1: 运行全量测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm test
```

Expected: 所有包测试 PASS。若失败，优先检查：

1. `@repo/ui` mock 是否覆盖新增的 `Tabs`、`Input`、`TagGroup`
2. React Aria Button 的 `isDisabled` / `data-disabled` 断言方式

- [ ] **Step 2: 启动开发服务器目视验证**

```bash
pnpm --filter @repo/web dev
```

| 检查项   | 预期                                      |
| -------- | ----------------------------------------- |
| 导航栏   | 立即可见（无闪烁），滚动后毛玻璃效果正常  |
| 主题切换 | 点击循环切换 system/light/dark            |
| 分类 Tab | 主色胶囊样式，活跃项白字，键盘 ← → 可切换 |
| 搜索框   | 左侧显示搜索图标，focus 时展宽            |
| 轮播图   | 点击底部水滴可切换幻灯片                  |
| 国际化   | 全部显示中文（无 key 名）                 |
| 右侧栏   | 最近来访 → 标签云 → 碎语（单列）          |
| 所有按钮 | hover 显示 cursor-pointer                 |

---

## 注意事项

### Pagination.test.tsx 中的 disabled 断言

React Aria 的 `Button` 被禁用时，DOM 上是 `data-disabled="true"` 而非原生 `disabled` attribute。若 `pagination.test.tsx` 中有 `.toBeDisabled()` 断言，需改为：

```tsx
expect(prevBtn).toHaveAttribute("data-disabled");
```

### ArticleSection 测试中的 Tabs 点击

Mock 中 `TabsItem` 是独立的 `<button role="tab">`，不会自动调用 Tabs 的 `onSelectionChange`。如果分类过滤测试失败，用以下方式重写：通过 `fireEvent.click` 直接点击 tab 后验证组件状态，或在 mock 的 `TabsItem` 中通过回调 prop 传递 `onSelectionChange`。

### Tag 的 id prop

`TagItem` 使用 React Aria 的 `id` prop 作为唯一标识（非 HTML attribute）。测试中找 tag 用 `screen.getByText("TypeScript")` 即可。
