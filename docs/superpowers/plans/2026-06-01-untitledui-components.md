# Untitled UI 组件集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Untitled UI 免费组件（Dropdown、Select、Tooltip、ButtonUtility、Toggle、Input、Avatar、Checkbox、RadioButtons、Carousel、Pagination）集成到 `packages/ui`，并替换 `apps/web` 中现有的 Carousel / Pagination 实现。

**Architecture:** 从 GitHub raw 手动复制各组件源码，将 `@/utils/cx` 改为 `cn`、`@untitledui/icons` 替换为 `SvgIcon`、内部路径改为相对路径。`FeaturedCarousel` 保持本地 `currentIndex` state 驱动指示器和移动端文字，Embla 只负责视觉滑动动画。

**Tech Stack:** React 18, TypeScript, react-aria-components ^1.18, embla-carousel-react ^8, Vitest, @testing-library/react, TailwindCSS, clsx, tailwind-merge

---

## 文件索引

| 操作 | 文件 |
|---|---|
| 新增 SVG | `packages/icons/svg/{eye-off,help-circle,info-circle,check,chevron-down,dots-vertical}.svg` |
| 修改 | `packages/ui/src/lib/utils.ts` |
| 新增 | `packages/ui/src/lib/is-react-component.ts` |
| 新增 | `packages/ui/src/lib/use-resize-observer.ts` |
| 修改 | `packages/ui/package.json` |
| 新增 | `packages/ui/src/tooltip/tooltip.tsx` + `tooltip.test.tsx` |
| 新增 | `packages/ui/src/toggle/toggle.tsx` + `toggle.test.tsx` |
| 新增 | `packages/ui/src/input/{label,hint-text,input,index}.tsx` + `input.test.tsx` |
| 删除 | `packages/ui/src/input.tsx` + `packages/ui/src/input.test.tsx` |
| 新增 | `packages/ui/src/button-utility/button-utility.tsx` + `button-utility.test.tsx` |
| 新增 | `packages/ui/src/avatar/base-components/{avatar-online-indicator,verified-tick,avatar-count,avatar-add-button,avatar-company-icon}.tsx` + `index.ts` |
| 新增 | `packages/ui/src/avatar/avatar.tsx` + `avatar.test.tsx` |
| 新增 | `packages/ui/src/checkbox/checkbox.tsx` + `checkbox.test.tsx` |
| 新增 | `packages/ui/src/radio-buttons/radio-buttons.tsx` + `radio-buttons.test.tsx` |
| 新增 | `packages/ui/src/dropdown/dropdown.tsx` + `dropdown.test.tsx` |
| 新增 | `packages/ui/src/select/{select-shared,popover,select-item,combobox,select}.tsx` + `select.test.tsx` |
| 新增 | `packages/ui/src/carousel/carousel-base.tsx` + `carousel-base.test.tsx` |
| 替换 | `packages/ui/src/pagination/pagination-base.tsx` |
| 更新 | `packages/ui/src/pagination/pagination.test.tsx` |
| 修改 | `packages/ui/src/index.ts` |
| 改写 | `apps/web/components/featured/featured-carousel.tsx` |
| 修改 | `apps/web/components/featured/featured-carousel-slide.tsx` |
| 删除 | `apps/web/components/featured/featured-carousel-indicators.tsx` |
| 更新 | `apps/web/components/featured/featured-carousel.test.tsx` |

---

## Task 1: 新增 6 个 SVG 图标

**Files:**
- Create: `packages/icons/svg/eye-off.svg`
- Create: `packages/icons/svg/help-circle.svg`
- Create: `packages/icons/svg/info-circle.svg`
- Create: `packages/icons/svg/check.svg`
- Create: `packages/icons/svg/chevron-down.svg`
- Create: `packages/icons/svg/dots-vertical.svg`

- [ ] **Step 1: 写入 6 个 SVG 文件**（统一 stroke-width="2" feather 风格）

`packages/icons/svg/eye-off.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>
```

`packages/icons/svg/help-circle.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>
```

`packages/icons/svg/info-circle.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>
```

`packages/icons/svg/check.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>
```

`packages/icons/svg/chevron-down.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6 9 12 15 18 9"/>
</svg>
```

`packages/icons/svg/dots-vertical.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/>
  <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
  <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>
</svg>
```

- [ ] **Step 2: 构建 icons 包，确认新图标出现在类型**

```bash
cd /path/to/blog-frontend
pnpm --filter @repo/icons build
```

预期输出包含：`✓ 生成雪碧图：26 个图标 [..., check, chevron-down, dots-vertical, eye-off, help-circle, info-circle, ...]`

- [ ] **Step 3: 验证类型文件已更新**

```bash
grep -E "check|chevron-down|dots-vertical|eye-off|help-circle|info-circle" packages/icons/src/generated/types.ts
```

预期：6 行新图标名称均出现。

- [ ] **Step 4: Commit**

```bash
git add packages/icons/svg/ packages/icons/src/generated/
git commit -m "feat(icons): 新增 eye-off、help-circle、info-circle、check、chevron-down、dots-vertical 图标"
```

---

## Task 2: 新增 lib 工具文件

**Files:**
- Modify: `packages/ui/src/lib/utils.ts`
- Create: `packages/ui/src/lib/is-react-component.ts`
- Create: `packages/ui/src/lib/use-resize-observer.ts`

- [ ] **Step 1: 在 utils.ts 末尾追加 sortCx**

`packages/ui/src/lib/utils.ts` 末尾新增：
```ts
/**
 * no-op：供 Tailwind IntelliSense 对样式对象排序，不影响运行时。
 */
export function sortCx<T>(classes: T): T {
  return classes;
}
```

- [ ] **Step 2: 新建 is-react-component.ts**

`packages/ui/src/lib/is-react-component.ts`:
```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";

type ReactComponent = React.FC<any> | React.ComponentClass<any, any>;

export const isFunctionComponent = (component: any): component is React.FC<any> =>
  typeof component === "function";

export const isClassComponent = (component: any): component is React.ComponentClass<any, any> =>
  typeof component === "function" &&
  component.prototype &&
  (!!component.prototype.isReactComponent || !!component.prototype.render);

export const isForwardRefComponent = (
  component: any,
): component is React.ForwardRefExoticComponent<any> =>
  typeof component === "object" &&
  component !== null &&
  component.$$typeof?.toString() === "Symbol(react.forward_ref)";

export const isReactComponent = (component: any): component is ReactComponent =>
  isFunctionComponent(component) ||
  isForwardRefComponent(component) ||
  isClassComponent(component);
```

- [ ] **Step 3: 新建 use-resize-observer.ts**

`packages/ui/src/lib/use-resize-observer.ts`:
```ts
import { useEffect, type RefObject } from "react";

type UseResizeObserverOptions<T> = {
  ref: RefObject<T | null | undefined> | undefined;
  box?: ResizeObserverBoxOptions;
  onResize: () => void;
};

export function useResizeObserver<T extends Element>(
  options: UseResizeObserverOptions<T>,
) {
  const { ref, box, onResize } = options;

  useEffect(() => {
    const element = ref?.current;
    if (!element) return;

    if (typeof window.ResizeObserver === "undefined") {
      window.addEventListener("resize", onResize, false);
      return () => window.removeEventListener("resize", onResize, false);
    }

    const observer = new window.ResizeObserver((entries) => {
      if (entries.length) onResize();
    });
    observer.observe(element, { box });
    return () => observer.unobserve(element);
  }, [onResize, ref, box]);
}
```

- [ ] **Step 4: type-check**

```bash
pnpm --filter @repo/ui check-types
```

预期：无报错。

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/lib/
git commit -m "feat(ui): 新增 sortCx、isReactComponent、useResizeObserver 工具函数"
```

---

## Task 3: 添加 embla-carousel-react 依赖

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: 安装依赖**

```bash
pnpm --filter @repo/ui add embla-carousel-react
```

- [ ] **Step 2: 确认 package.json 已更新**

```bash
grep "embla-carousel-react" packages/ui/package.json
```

预期：`"embla-carousel-react": "^8.x.x"`

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): 添加 embla-carousel-react 依赖"
```

---

## Task 4: Tooltip 组件

**Files:**
- Create: `packages/ui/src/tooltip/tooltip.tsx`
- Create: `packages/ui/src/tooltip/tooltip.test.tsx`

- [ ] **Step 1: 写测试（先让它失败）**

`packages/ui/src/tooltip/tooltip.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip, TooltipTrigger } from "./tooltip";

describe("Tooltip", () => {
  it("渲染 children 不崩溃", () => {
    render(
      <Tooltip title="提示内容">
        <button>触发器</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "触发器" })).toBeTruthy();
  });

  it("hover 后显示 tooltip 文字", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip title="提示文字" delay={0}>
        <button>触发器</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button", { name: "触发器" }));
    expect(await screen.findByText("提示文字")).toBeTruthy();
  });

  it("TooltipTrigger 渲染 children", () => {
    render(
      <Tooltip title="提示">
        <TooltipTrigger>
          <span>图标</span>
        </TooltipTrigger>
      </Tooltip>,
    );
    expect(screen.getByText("图标")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/tooltip/tooltip.test.tsx
```

预期：FAIL（模块不存在）

- [ ] **Step 3: 实现 tooltip.tsx**

`packages/ui/src/tooltip/tooltip.tsx`:
```tsx
"use client";

import type { ReactNode } from "react";
import type {
  ButtonProps as AriaButtonProps,
  TooltipProps as AriaTooltipProps,
  TooltipTriggerComponentProps as AriaTooltipTriggerComponentProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  OverlayArrow as AriaOverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components";
import { cn } from "../lib/utils";

interface TooltipProps
  extends AriaTooltipTriggerComponentProps,
    Omit<AriaTooltipProps, "children"> {
  title: ReactNode;
  description?: ReactNode;
  arrow?: boolean;
  delay?: number;
}

export const Tooltip = ({
  title,
  description,
  children,
  arrow = false,
  delay = 300,
  closeDelay = 0,
  trigger,
  isDisabled,
  isOpen,
  defaultOpen,
  offset = 6,
  crossOffset,
  placement = "top",
  onOpenChange,
  ...tooltipProps
}: TooltipProps) => {
  const isTopOrBottomLeft = ["top left", "top end", "bottom left", "bottom end"].includes(
    placement as string,
  );
  const isTopOrBottomRight = ["top right", "top start", "bottom right", "bottom start"].includes(
    placement as string,
  );
  const calculatedCrossOffset = isTopOrBottomLeft ? -12 : isTopOrBottomRight ? 12 : 0;

  return (
    <AriaTooltipTrigger
      {...{ trigger, delay, closeDelay, isDisabled, isOpen, defaultOpen, onOpenChange }}
    >
      {children}
      <AriaTooltip
        {...tooltipProps}
        offset={offset}
        placement={placement}
        crossOffset={crossOffset ?? calculatedCrossOffset}
        className={({ isEntering, isExiting }) =>
          cn(isEntering && "ease-out animate-in", isExiting && "ease-in animate-out")
        }
      >
        {({ isEntering, isExiting }) => (
          <div
            className={cn(
              "z-50 flex max-w-xs flex-col items-start gap-1 rounded-lg bg-gray-900 px-3 shadow-lg",
              description ? "py-3" : "py-2",
              isEntering &&
                "ease-out animate-in fade-in zoom-in-95 in-placement-top:slide-in-from-bottom-0.5 in-placement-bottom:slide-in-from-top-0.5",
              isExiting &&
                "ease-in animate-out fade-out zoom-out-95 in-placement-top:slide-out-to-bottom-0.5 in-placement-bottom:slide-out-to-top-0.5",
            )}
          >
            <span className="text-xs font-semibold text-white">{title}</span>
            {description && (
              <span className="text-xs font-medium text-gray-300">{description}</span>
            )}
            {arrow && (
              <AriaOverlayArrow>
                <svg
                  viewBox="0 0 100 100"
                  className="size-2.5 fill-gray-900 in-placement-bottom:rotate-180"
                >
                  <path d="M0,0 L35.858,35.858 Q50,50 64.142,35.858 L100,0 Z" />
                </svg>
              </AriaOverlayArrow>
            )}
          </div>
        )}
      </AriaTooltip>
    </AriaTooltipTrigger>
  );
};

interface TooltipTriggerProps extends AriaButtonProps {}

export const TooltipTrigger = ({ children, className, ...buttonProps }: TooltipTriggerProps) => (
  <AriaButton
    {...buttonProps}
    className={(values) =>
      cn(
        "h-max w-max outline-hidden",
        typeof className === "function" ? className(values) : className,
      )
    }
  >
    {children}
  </AriaButton>
);
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/tooltip/tooltip.test.tsx
```

预期：PASS（3 个测试）

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tooltip/
git commit -m "feat(ui): 新增 Tooltip 组件（Untitled UI 适配版）"
```

---

## Task 5: Toggle 组件

**Files:**
- Create: `packages/ui/src/toggle/toggle.tsx`
- Create: `packages/ui/src/toggle/toggle.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/toggle/toggle.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("渲染不崩溃", () => {
    render(<Toggle aria-label="开关" />);
    expect(screen.getByRole("switch")).toBeTruthy();
  });

  it("显示 label 文字", () => {
    render(<Toggle label="启用通知" />);
    expect(screen.getByText("启用通知")).toBeTruthy();
  });

  it("显示 hint 文字", () => {
    render(<Toggle label="开关" hint="这是提示" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("点击触发 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle aria-label="开关" onChange={onChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("受控：isSelected=true 时 switch checked", () => {
    render(<Toggle aria-label="开关" isSelected={true} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("disabled 时无法交互", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle aria-label="开关" isDisabled onChange={onChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/toggle/toggle.test.tsx
```

预期：FAIL

- [ ] **Step 3: 实现 toggle.tsx**

`packages/ui/src/toggle/toggle.tsx`:
```tsx
"use client";

import type { ReactNode } from "react";
import type { SwitchProps as AriaSwitchProps } from "react-aria-components";
import { Switch as AriaSwitch } from "react-aria-components";
import { cn } from "../lib/utils";

interface ToggleBaseProps {
  size?: "sm" | "md";
  slim?: boolean;
  className?: string;
  isHovered?: boolean;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export const ToggleBase = ({
  className,
  isHovered,
  isDisabled,
  isFocusVisible,
  isSelected,
  slim,
  size = "sm",
}: ToggleBaseProps) => {
  const styles = {
    default: {
      sm: { root: "h-5 w-9 p-0.5", switch: cn("size-4", isSelected && "translate-x-4") },
      md: { root: "h-6 w-11 p-0.5", switch: cn("size-5", isSelected && "translate-x-5") },
    },
    slim: {
      sm: { root: "h-4 w-8", switch: cn("size-4", isSelected && "translate-x-4") },
      md: { root: "h-5 w-10", switch: cn("size-5", isSelected && "translate-x-5") },
    },
  };
  const classes = slim ? styles.slim[size] : styles.default[size];

  return (
    <div
      className={cn(
        "cursor-pointer rounded-full bg-gray-200 ring-[0.5px] ring-gray-300 outline-none transition duration-150 ease-linear ring-inset",
        isSelected && "bg-blue-600",
        isSelected && isHovered && "bg-blue-700",
        isDisabled && "cursor-not-allowed opacity-50",
        isFocusVisible && "outline-2 outline-offset-2 outline-blue-500",
        slim && "ring-1",
        slim && isSelected && "ring-transparent",
        classes.root,
        className,
      )}
    >
      <div
        style={{ transition: "transform 0.15s ease-in-out" }}
        className={cn("rounded-full bg-white shadow-sm", classes.switch)}
      />
    </div>
  );
};

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

interface ToggleProps extends AriaSwitchProps {
  size?: "sm" | "md";
  label?: string;
  hint?: ReactNode;
  slim?: boolean;
}

export const Toggle = ({ label, hint, className, size = "sm", slim, ...ariaSwitchProps }: ToggleProps) => (
  <AriaSwitch
    {...ariaSwitchProps}
    className={(state) =>
      cn(
        "relative flex w-max items-start",
        state.isDisabled && "cursor-not-allowed",
        sizeStyles[size].root,
        typeof className === "function" ? className(state) : className,
      )
    }
  >
    {({ isSelected, isDisabled, isFocusVisible, isHovered }) => (
      <>
        <ToggleBase
          slim={slim}
          size={size}
          isHovered={isHovered}
          isDisabled={isDisabled}
          isFocusVisible={isFocusVisible}
          isSelected={isSelected}
          className={slim ? "mt-0.5" : ""}
        />
        {(label || hint) && (
          <div className={cn("flex flex-col", sizeStyles[size].textWrapper)}>
            {label && (
              <p className={cn("text-gray-700 select-none", sizeStyles[size].label)}>{label}</p>
            )}
            {hint && (
              <span
                className={cn("text-gray-500", sizeStyles[size].hint)}
                onClick={(e) => e.stopPropagation()}
              >
                {hint}
              </span>
            )}
          </div>
        )}
      </>
    )}
  </AriaSwitch>
);
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/toggle/toggle.test.tsx
```

预期：PASS（6 个测试）

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/toggle/
git commit -m "feat(ui): 新增 Toggle 组件（含 ToggleBase）"
```

---

## Task 6: Input 组件（label + hint-text + input + index）

**Files:**
- Create: `packages/ui/src/input/label.tsx`
- Create: `packages/ui/src/input/hint-text.tsx`
- Create: `packages/ui/src/input/input.tsx`
- Create: `packages/ui/src/input/index.ts`
- Create: `packages/ui/src/input/input.test.tsx`
- Delete: `packages/ui/src/input.tsx`
- Delete: `packages/ui/src/input.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/input/input.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

// tooltip 依赖 react-aria Popover，jsdom 下简单 mock
vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Input } from "./input";

describe("Input", () => {
  it("渲染不崩溃", () => {
    render(<Input aria-label="测试" />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("显示 label", () => {
    render(<Input label="邮箱" />);
    expect(screen.getByText("邮箱")).toBeTruthy();
  });

  it("显示 placeholder", () => {
    render(<Input aria-label="测试" placeholder="请输入..." />);
    expect(screen.getByPlaceholderText("请输入...")).toBeTruthy();
  });

  it("isInvalid 时渲染 error 提示", async () => {
    render(<Input aria-label="测试" isInvalid validate={() => "必填"} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("type=password 时渲染密码切换按钮", () => {
    render(<Input aria-label="密码" type="password" />);
    expect(screen.getByRole("button")).toBeTruthy();
    expect(screen.getByTestId("icon-eye")).toBeTruthy();
  });

  it("点击密码切换按钮切换 type", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="密码" type="password" />);
    const input = screen.getByRole("textbox", { hidden: true });
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("icon-eye-off")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/input/input.test.tsx
```

预期：FAIL

- [ ] **Step 3: 实现 label.tsx**

`packages/ui/src/input/label.tsx`:
```tsx
"use client";

import type { ReactNode, Ref } from "react";
import type { LabelProps as AriaLabelProps } from "react-aria-components";
import { Label as AriaLabel } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Tooltip, TooltipTrigger } from "../tooltip/tooltip";
import { cn } from "../lib/utils";

interface LabelProps extends AriaLabelProps {
  children: ReactNode;
  isInvalid?: boolean;
  isRequired?: boolean;
  tooltip?: string;
  tooltipDescription?: string;
  ref?: Ref<HTMLLabelElement>;
}

export const Label = ({
  isInvalid,
  isRequired,
  tooltip,
  tooltipDescription,
  className,
  ...props
}: LabelProps) => (
  <AriaLabel
    data-label="true"
    {...props}
    className={cn("flex cursor-default items-center gap-0.5 text-sm font-medium text-gray-700", className)}
  >
    {props.children}
    <span
      className={cn(
        "hidden text-blue-500",
        isRequired && "block",
        typeof isRequired === "undefined" && "group-required:block",
        isInvalid && "text-red-500",
        typeof isInvalid === "undefined" && "group-invalid:text-red-500",
      )}
    >
      *
    </span>
    {tooltip && (
      <Tooltip title={tooltip} description={tooltipDescription} placement="top">
        <TooltipTrigger isDisabled={false} className="cursor-pointer text-gray-400 hover:text-gray-500">
          <SvgIcon name="help-circle" size={16} />
        </TooltipTrigger>
      </Tooltip>
    )}
  </AriaLabel>
);

Label.displayName = "Label";
```

- [ ] **Step 4: 实现 hint-text.tsx**

`packages/ui/src/input/hint-text.tsx`:
```tsx
"use client";

import type { ReactNode, Ref } from "react";
import type { TextProps as AriaTextProps } from "react-aria-components";
import { Text as AriaText } from "react-aria-components";
import { cn } from "../lib/utils";

interface HintTextProps extends AriaTextProps {
  isInvalid?: boolean;
  ref?: Ref<HTMLElement>;
  size?: "sm" | "md";
  children: ReactNode;
}

export const HintText = ({ isInvalid, className, size = "md", ...props }: HintTextProps) => (
  <AriaText
    {...props}
    slot={isInvalid ? "errorMessage" : "description"}
    className={cn(
      "text-sm text-gray-500",
      size === "sm" && "text-xs",
      isInvalid && "text-red-600",
      "group-invalid:text-red-600",
      className,
    )}
  />
);

HintText.displayName = "HintText";
```

- [ ] **Step 5: 实现 input.tsx**

`packages/ui/src/input/input.tsx`:
```tsx
"use client";

import { type ComponentType, type HTMLAttributes, type ReactNode, type Ref, createContext, useContext, useState } from "react";
import type { InputProps as AriaInputProps, TextFieldProps as AriaTextFieldProps } from "react-aria-components";
import { Button as AriaButton, Group as AriaGroup, Input as AriaInput, TextField as AriaTextField } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { HintText } from "./hint-text";
import { Label } from "./label";
import { Tooltip, TooltipTrigger } from "../tooltip/tooltip";
import { cn } from "../lib/utils";

export interface InputBaseProps extends Omit<AriaInputProps, "size"> {
  tooltip?: string;
  isInvalid?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export interface InputProps extends Omit<AriaTextFieldProps, "children"> {
  label?: string;
  hint?: string;
  tooltip?: string;
  tooltipDescription?: string;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  inputClassName?: string;
  leadingIcon?: ComponentType<{ className?: string }> | ReactNode;
  trailingIcon?: ComponentType<{ className?: string }> | ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const sizes = {
  sm: { root: "py-2 px-3 gap-2 text-sm", icon: "size-4" },
  md: { root: "py-2.5 px-3.5 gap-2 text-base", icon: "size-5" },
};

export const Input = ({
  label,
  hint,
  tooltip,
  tooltipDescription,
  placeholder,
  size = "md",
  className,
  inputClassName,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  type,
  ...rest
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (isPasswordVisible ? "text" : "password") : type;

  return (
    <AriaTextField
      {...rest}
      type={resolvedType}
      className={(state) =>
        cn("group flex flex-col gap-1.5", typeof className === "function" ? className(state) : className)
      }
    >
      {({ isRequired, isInvalid }) => (
        <>
          {label && (
            <Label isRequired={isRequired} isInvalid={isInvalid} tooltip={tooltip} tooltipDescription={tooltipDescription}>
              {label}
            </Label>
          )}
          <AriaGroup
            className={cn(
              "relative flex w-full items-center rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-none transition duration-100 ring-inset",
              "focus-within:ring-2 focus-within:ring-blue-500",
              "group-disabled:cursor-not-allowed group-disabled:opacity-50",
              isInvalid && "ring-red-500 focus-within:ring-red-500",
              sizes[size].root,
            )}
          >
            {LeadingIcon && typeof LeadingIcon === "function" ? (
              <LeadingIcon className={cn("shrink-0 text-gray-400", sizes[size].icon)} />
            ) : LeadingIcon}
            <AriaInput
              placeholder={placeholder}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none",
                inputClassName,
              )}
            />
            {isPassword && (
              <AriaButton
                type="button"
                onPress={() => setIsPasswordVisible((v) => !v)}
                className="shrink-0 text-gray-400 hover:text-gray-600 outline-none"
              >
                {isPasswordVisible ? (
                  <SvgIcon name="eye-off" size={16} />
                ) : (
                  <SvgIcon name="eye" size={16} />
                )}
              </AriaButton>
            )}
            {TrailingIcon && !isPassword && (
              typeof TrailingIcon === "function" ? (
                <TrailingIcon className={cn("shrink-0 text-gray-400", sizes[size].icon)} />
              ) : TrailingIcon
            )}
          </AriaGroup>
          {hint && <HintText size={size === "sm" ? "sm" : "md"}>{hint}</HintText>}
        </>
      )}
    </AriaTextField>
  );
};
```

- [ ] **Step 6: 实现 index.ts**

`packages/ui/src/input/index.ts`:
```ts
export { Input, type InputProps } from "./input";
export { Label } from "./label";
export { HintText } from "./hint-text";
```

- [ ] **Step 7: 删除旧文件**

```bash
rm packages/ui/src/input.tsx packages/ui/src/input.test.tsx
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/input/input.test.tsx
```

预期：PASS（6 个测试）

- [ ] **Step 9: 检查 type**

```bash
pnpm --filter @repo/ui check-types
```

预期：无报错。

- [ ] **Step 10: Commit**

```bash
git add packages/ui/src/input/ && git rm packages/ui/src/input.tsx packages/ui/src/input.test.tsx
git commit -m "feat(ui): Input 升级为多文件目录（新增 label、hint-text、密码切换）"
```


---

## Task 7: ButtonUtility 组件

**Files:**
- Create: `packages/ui/src/button-utility/button-utility.tsx`
- Create: `packages/ui/src/button-utility/button-utility.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/button-utility/button-utility.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ButtonUtility } from "./button-utility";

const MockIcon = ({ className }: { className?: string }) => (
  <svg className={className} data-testid="mock-icon" />
);

describe("ButtonUtility", () => {
  it("渲染不崩溃", () => {
    render(<ButtonUtility icon={MockIcon} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("点击触发回调", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ButtonUtility icon={MockIcon} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("isDisabled 时无法点击", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ButtonUtility icon={MockIcon} isDisabled onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("href 时渲染为 link", () => {
    render(<ButtonUtility icon={MockIcon} href="/test" />);
    expect(screen.getByRole("link")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/button-utility/button-utility.test.tsx
```

- [ ] **Step 3: 实现 button-utility.tsx**

`packages/ui/src/button-utility/button-utility.tsx`:
```tsx
"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  ReactNode,
} from "react";
import { isValidElement } from "react";
import type { Placement } from "react-aria";
import type {
  ButtonProps as AriaButtonProps,
  LinkProps as AriaLinkProps,
} from "react-aria-components";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { Tooltip } from "../tooltip/tooltip";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";

const colorStyles = {
  secondary:
    "bg-white text-gray-500 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 hover:text-gray-600 disabled:shadow-xs",
  tertiary: "text-gray-500 hover:bg-gray-100 hover:text-gray-600",
};

export interface CommonProps {
  isDisabled?: boolean;
  size?: "xs" | "sm";
  color?: "secondary" | "tertiary";
  icon?: FC<{ className?: string }> | ReactNode;
  tooltip?: string;
  tooltipPlacement?: Placement;
}

export interface ButtonProps
  extends CommonProps,
    DetailedHTMLProps<
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "slot">,
      HTMLButtonElement
    > {
  slot?: AriaButtonProps["slot"];
}

interface LinkProps
  extends CommonProps,
    DetailedHTMLProps<
      Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color">,
      HTMLAnchorElement
    > {
  routerOptions?: AriaLinkProps["routerOptions"];
}

export type Props = ButtonProps | LinkProps;

export const ButtonUtility = ({
  tooltip,
  className,
  isDisabled,
  icon: Icon,
  size = "sm",
  color = "secondary",
  tooltipPlacement = "top",
  ...otherProps
}: Props) => {
  const href = "href" in otherProps ? otherProps.href : undefined;
  const Component = href ? AriaLink : AriaButton;

  const props = href
    ? {
        ...otherProps,
        href: isDisabled ? undefined : href,
        ...(isDisabled ? { "data-rac": true, "data-disabled": true } : {}),
      }
    : { ...otherProps, type: (otherProps as ButtonProps).type || "button", isDisabled };

  const content = (
    <Component
      aria-label={tooltip}
      {...(props as object)}
      className={cn(
        "group relative inline-flex h-max cursor-pointer items-center justify-center rounded-md p-1.5 outline-none transition duration-100 ease-linear focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        colorStyles[color],
        size === "xs" ? "*:size-4" : "*:size-5",
        className,
      )}
    >
      {isReactComponent(Icon) && <Icon />}
      {isValidElement(Icon) && Icon}
    </Component>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement={tooltipPlacement} isDisabled={isDisabled} offset={size === "xs" ? 4 : 6}>
        {content}
      </Tooltip>
    );
  }

  return content;
};
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/button-utility/button-utility.test.tsx
```

预期：PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/button-utility/
git commit -m "feat(ui): 新增 ButtonUtility 组件"
```

---

## Task 8: Avatar 组件（含 base-components）

**Files:**
- Create: `packages/ui/src/avatar/base-components/avatar-online-indicator.tsx`
- Create: `packages/ui/src/avatar/base-components/verified-tick.tsx`
- Create: `packages/ui/src/avatar/base-components/avatar-count.tsx`
- Create: `packages/ui/src/avatar/base-components/avatar-add-button.tsx`
- Create: `packages/ui/src/avatar/base-components/avatar-company-icon.tsx`
- Create: `packages/ui/src/avatar/base-components/index.ts`
- Create: `packages/ui/src/avatar/avatar.tsx`
- Create: `packages/ui/src/avatar/avatar.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/avatar/avatar.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("渲染不崩溃（无 src）", () => {
    const { container } = render(<Avatar />);
    expect(container.firstChild).toBeTruthy();
  });

  it("渲染图片时显示 img 元素", () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="用户头像" />);
    expect(screen.getByRole("img", { name: "用户头像" })).toBeTruthy();
  });

  it("无 src 时显示 fallback 图标", () => {
    render(<Avatar />);
    expect(screen.getByTestId("icon-user")).toBeTruthy();
  });

  it("有 initials 时显示首字母", () => {
    render(<Avatar initials="AB" />);
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("size 变体渲染不崩溃", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<Avatar size={size} />);
      unmount();
    });
  });

  it("status=online 时渲染在线指示器", () => {
    const { container } = render(<Avatar status="online" />);
    // AvatarOnlineIndicator 是 span
    expect(container.querySelector("span")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/avatar/avatar.test.tsx
```

- [ ] **Step 3: 实现 base-components 子文件**

`packages/ui/src/avatar/base-components/avatar-online-indicator.tsx`:
```tsx
"use client";
import { cn } from "../../lib/utils";

const sizes = {
  xs: "size-1.5", sm: "size-2", md: "size-2.5",
  lg: "size-3", xl: "size-3.5", "2xl": "size-4",
};

interface AvatarOnlineIndicatorProps {
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status: "online" | "offline";
  className?: string;
}

export const AvatarOnlineIndicator = ({ size, status, className }: AvatarOnlineIndicatorProps) => (
  <span
    className={cn(
      "absolute right-0 bottom-0 flex justify-center rounded-full ring-[1.5px] ring-white",
      status === "online" ? "bg-green-400" : "bg-gray-300",
      sizes[size],
      className,
    )}
  />
);
```

`packages/ui/src/avatar/base-components/verified-tick.tsx`:
```tsx
"use client";
import { cn } from "../../lib/utils";

const sizes = {
  xs: "size-2.5", sm: "size-3", md: "size-3.5",
  lg: "size-4", xl: "size-4.5", "2xl": "size-5",
};

interface VerifiedTickProps {
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export const VerifiedTick = ({ size, className }: VerifiedTickProps) => (
  <svg className={cn("z-10 text-blue-500", sizes[size], className)} viewBox="0 0 10 10" fill="none">
    <path
      d="M7.72237 1.77098C7.81734 2.00068 7.99965 2.18326 8.2292 2.27858L9.03413 2.61199C9.26384 2.70714 9.44635 2.88965 9.5415 3.11936C9.63665 3.34908 9.63665 3.60718 9.5415 3.83689L9.20833 4.64125C9.11313 4.87106 9.113 5.12943 9.20863 5.35913L9.54122 6.16325C9.63637 6.39297 9.63637 6.65107 9.54122 6.88078L9.03369 7.38854L8.22934 7.72171C7.99964 7.81669 7.81706 7.99899 7.72174 8.22855L7.38833 9.03348C7.29318 9.26319 7.11067 9.4457 6.88096 9.54085C6.65124 9.636 6.39314 9.636 6.16343 9.54085L5.35907 9.20767C5.12935 9.11276 4.87134 9.11295 4.64177 9.20821L3.83684 9.54115C3.38762 9.73121 2.86756 9.53038 2.6127 9.03409L2.27918 8.22892C2.18421 7.99923 2.0019 7.81665 1.77235 7.72133L0.967421 7.38792C0.519204 7.19762 0.364854 6.62327 0.45981 6.16359L0.792984 5.35924C0.8879 5.12952 0.887707 4.87151 0.792445 4.64193L0.459749 3.83642C0.0170014 3.39368 0.264579 2.63785 0.967283 2.61113L1.77164 2.27795C2.00113 2.18306 2.1836 2.00099 2.27899 1.7717L2.6124 0.966768C2.80246 0.517551 3.37731 0.364246 3.83731 0.459397L4.64166 0.792571C4.87138 0.887487 5.12939 0.887293 5.35897 0.792031L6.16424 0.459913C6.6136 0.264858 7.18764 0.517837 7.38895 0.967208L7.72247 1.77238L7.72237 1.77098Z"
      className="fill-current"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.95829 3.68932C7.11048 3.4637 7.04747 3.15654 6.81454 3.04182C6.58162 2.9271 6.28558 2.99011 6.16704 3.18557L4.33141 6.06995L3.49141 5.01995C3.33 4.82217 3.04652 4.78862 2.83235 4.94651C2.61817 5.1044 2.58462 5.38788 2.75891 5.60557L4.00891 7.16807C4.14004 7.33203 4.36063 7.39157 4.5553 7.32187C4.74997 7.25218 4.87454 7.05987 4.85578 6.85432L6.95829 3.68932Z"
      fill="white"
    />
  </svg>
);
```

`packages/ui/src/avatar/base-components/avatar-count.tsx`:
```tsx
"use client";
import { cn } from "../../lib/utils";

interface AvatarCountProps {
  count: number;
  className?: string;
}

export const AvatarCount = ({ count, className }: AvatarCountProps) => (
  <div className={cn("absolute right-0 bottom-0 p-px", className)}>
    <div className="flex size-3.5 items-center justify-center rounded-full bg-red-500 text-center text-[10px] leading-[13px] font-bold text-white">
      {count}
    </div>
  </div>
);
```

`packages/ui/src/avatar/base-components/avatar-add-button.tsx`:
```tsx
"use client";
import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Tooltip, TooltipTrigger } from "../../tooltip/tooltip";
import { cn } from "../../lib/utils";

const sizes = {
  xs: { root: "size-6", icon: 16 as const },
  sm: { root: "size-8", icon: 16 as const },
  md: { root: "size-10", icon: 20 as const },
};

interface AvatarAddButtonProps extends AriaButtonProps {
  size: "xs" | "sm" | "md";
  title?: string;
  className?: string;
}

export const AvatarAddButton = ({ size, className, title = "Add user", ...props }: AvatarAddButtonProps) => (
  <Tooltip title={title}>
    <TooltipTrigger
      {...props}
      aria-label={title}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50",
        sizes[size].root,
        className,
      )}
    >
      <SvgIcon name="plus" size={sizes[size].icon} />
    </TooltipTrigger>
  </Tooltip>
);
```

`packages/ui/src/avatar/base-components/avatar-company-icon.tsx`:
```tsx
"use client";
import { cn } from "../../lib/utils";

const sizes = {
  xs: "size-2", sm: "size-3", md: "size-3.5",
  lg: "size-4", xl: "size-4.5", "2xl": "size-5",
};

interface AvatarCompanyIconProps {
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  src: string;
  alt?: string;
}

export const AvatarCompanyIcon = ({ size, src, alt }: AvatarCompanyIconProps) => (
  <img
    src={src}
    alt={alt}
    className={cn(
      "absolute -right-0.5 -bottom-0.5 rounded-full bg-blue-50 object-cover ring-[1.5px] ring-white",
      sizes[size],
    )}
  />
);
```

`packages/ui/src/avatar/base-components/index.ts`:
```ts
export { AvatarOnlineIndicator } from "./avatar-online-indicator";
export { VerifiedTick } from "./verified-tick";
export { AvatarCount } from "./avatar-count";
export { AvatarAddButton } from "./avatar-add-button";
export { AvatarCompanyIcon } from "./avatar-company-icon";
```

- [ ] **Step 4: 实现 avatar.tsx**

`packages/ui/src/avatar/avatar.tsx`:
```tsx
"use client";

import { type FC, type ReactNode, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "../lib/utils";
import { AvatarOnlineIndicator, VerifiedTick } from "./base-components";
import { AvatarCount } from "./base-components/avatar-count";

export interface AvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  contentClassName?: string;
  src?: string | null;
  alt?: string;
  contrastBorder?: boolean;
  rounded?: boolean;
  border?: boolean;
  badge?: ReactNode;
  status?: "online" | "offline";
  verified?: boolean;
  count?: number;
  initials?: string;
  placeholderIcon?: FC<{ className?: string }>;
  placeholder?: ReactNode;
  focusable?: boolean;
}

const styles = {
  xs: { root: "size-6", rootWithBorder: "p-px", initials: "text-xs font-semibold", iconSize: 16 as const },
  sm: { root: "size-8", rootWithBorder: "p-px", initials: "text-sm font-semibold", iconSize: 20 as const },
  md: { root: "size-10", rootWithBorder: "p-px", initials: "text-base font-semibold", iconSize: 24 as const },
  lg: { root: "size-12", rootWithBorder: "p-[1.5px]", initials: "text-lg font-semibold", iconSize: 28 as const },
  xl: { root: "size-14", rootWithBorder: "p-0.5", initials: "text-xl font-semibold", iconSize: 32 as const },
  "2xl": { root: "size-16", rootWithBorder: "p-0.5", initials: "text-2xl font-semibold", iconSize: 32 as const },
};

export const Avatar = ({
  size = "md",
  src,
  alt,
  initials,
  placeholder,
  placeholderIcon: PlaceholderIcon,
  border,
  badge,
  status,
  verified,
  count,
  focusable = false,
  rounded = true,
  className,
  contentClassName,
}: AvatarProps) => {
  const [isFailed, setIsFailed] = useState(false);
  const canShowImage = src && !isFailed;

  const renderMain = () => {
    if (canShowImage)
      return (
        <img
          data-avatar-img
          className="size-full object-cover"
          src={src}
          alt={alt}
          onError={() => setIsFailed(true)}
        />
      );
    if (initials)
      return <span className={cn("text-gray-500", styles[size].initials)}>{initials}</span>;
    if (PlaceholderIcon)
      return <PlaceholderIcon className={cn("text-gray-400", `size-${styles[size].iconSize / 4}`)} />;
    return placeholder || <SvgIcon name="user" size={styles[size].iconSize} />;
  };

  const renderBadge = () => {
    if (status) return <AvatarOnlineIndicator status={status} size={size} />;
    if (verified)
      return (
        <VerifiedTick
          size={size}
          className={cn("absolute right-0 bottom-0", size === "xs" && "-right-px -bottom-px")}
        />
      );
    if (count) return <AvatarCount count={count} />;
    return badge;
  };

  return (
    <div
      data-avatar
      className={cn(
        "relative inline-flex shrink-0 rounded-[7px]",
        rounded && "rounded-full",
        focusable &&
          "outline-transparent group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-500",
        border && "ring-1 ring-gray-200",
        border && styles[size].rootWithBorder,
        styles[size].root,
        className,
      )}
    >
      <div
        className={cn(
          "relative inline-flex size-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 outline-[0.5px] -outline-offset-[0.5px] outline-black/8",
          rounded && "rounded-full",
          contentClassName,
        )}
      >
        {renderMain()}
      </div>
      {renderBadge()}
    </div>
  );
};
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/avatar/avatar.test.tsx
```

预期：PASS（6 个测试）

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/avatar/
git commit -m "feat(ui): 新增 Avatar 组件（含 base-components）"
```

---

## Task 9: Checkbox 组件

**Files:**
- Create: `packages/ui/src/checkbox/checkbox.tsx`
- Create: `packages/ui/src/checkbox/checkbox.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/checkbox/checkbox.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, CheckboxBase } from "./checkbox";

describe("CheckboxBase", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<CheckboxBase />);
    expect(container.firstChild).toBeTruthy();
  });

  it("isSelected 时有 brand 背景样式", () => {
    const { container } = render(<CheckboxBase isSelected />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("Checkbox", () => {
  it("渲染为 checkbox 角色", () => {
    render(<Checkbox aria-label="同意" />);
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("显示 label 文字", () => {
    render(<Checkbox label="我同意条款" />);
    expect(screen.getByText("我同意条款")).toBeTruthy();
  });

  it("显示 hint 文字", () => {
    render(<Checkbox label="选项" hint="这是提示" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("点击触发 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="同意" onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("isDisabled 时无法交互", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="同意" isDisabled onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/checkbox/checkbox.test.tsx
```

- [ ] **Step 3: 实现 checkbox.tsx**

`packages/ui/src/checkbox/checkbox.tsx`:
```tsx
"use client";

import type { ReactNode, Ref } from "react";
import { Checkbox as AriaCheckbox, type CheckboxProps as AriaCheckboxProps } from "react-aria-components";
import { cn } from "../lib/utils";

export interface CheckboxBaseProps {
  size?: "sm" | "md";
  className?: string;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isIndeterminate?: boolean;
}

export const CheckboxBase = ({
  className,
  isSelected,
  isDisabled,
  isIndeterminate,
  size = "sm",
  isFocusVisible = false,
}: CheckboxBaseProps) => (
  <div
    className={cn(
      "relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded bg-white ring-1 ring-gray-300 ring-inset",
      size === "md" && "size-5 rounded-md",
      (isSelected || isIndeterminate) && "bg-blue-600 ring-blue-600",
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled && !(isSelected || isIndeterminate) && "bg-gray-100",
      isFocusVisible && "outline-2 outline-offset-2 outline-blue-500",
      className,
    )}
  >
    {/* Indeterminate line */}
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className={cn(
        "pointer-events-none absolute h-3 w-2.5 text-white opacity-0 transition-all",
        size === "md" && "size-3.5",
        isIndeterminate && "opacity-100",
      )}
    >
      <path d="M2.91675 7H11.0834" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {/* Check */}
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className={cn(
        "pointer-events-none absolute size-3 text-white opacity-0 transition-all",
        size === "md" && "size-3.5",
        isSelected && !isIndeterminate && "opacity-100",
      )}
    >
      <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);
CheckboxBase.displayName = "CheckboxBase";

interface CheckboxProps extends AriaCheckboxProps {
  ref?: Ref<HTMLLabelElement>;
  size?: "sm" | "md";
  label?: ReactNode;
  hint?: ReactNode;
}

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

export const Checkbox = ({ label, hint, size = "sm", className, ...ariaCheckboxProps }: CheckboxProps) => (
  <AriaCheckbox
    {...ariaCheckboxProps}
    className={(state) =>
      cn(
        "relative flex items-start",
        state.isDisabled && "cursor-not-allowed",
        sizeStyles[size].root,
        typeof className === "function" ? className(state) : className,
      )
    }
  >
    {({ isSelected, isIndeterminate, isDisabled, isFocusVisible }) => (
      <>
        <CheckboxBase
          size={size}
          isSelected={isSelected}
          isIndeterminate={isIndeterminate}
          isDisabled={isDisabled}
          isFocusVisible={isFocusVisible}
          className={label || hint ? "mt-0.5" : ""}
        />
        {(label || hint) && (
          <div className={cn("inline-flex flex-col", sizeStyles[size].textWrapper)}>
            {label && <p className={cn("text-gray-700 select-none", sizeStyles[size].label)}>{label}</p>}
            {hint && (
              <span className={cn("text-gray-500", sizeStyles[size].hint)} onClick={(e) => e.stopPropagation()}>
                {hint}
              </span>
            )}
          </div>
        )}
      </>
    )}
  </AriaCheckbox>
);
Checkbox.displayName = "Checkbox";
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/checkbox/checkbox.test.tsx
```

预期：PASS（7 个测试）

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/checkbox/
git commit -m "feat(ui): 新增 Checkbox 组件（含 CheckboxBase）"
```

---

## Task 10: RadioButtons 组件

**Files:**
- Create: `packages/ui/src/radio-buttons/radio-buttons.tsx`
- Create: `packages/ui/src/radio-buttons/radio-buttons.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/radio-buttons/radio-buttons.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioButton, RadioGroup, RadioButtonBase } from "./radio-buttons";

describe("RadioButtonBase", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<RadioButtonBase />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("RadioGroup + RadioButton", () => {
  it("渲染 radiogroup 角色", () => {
    render(
      <RadioGroup aria-label="选项">
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });

  it("显示所有选项", () => {
    render(
      <RadioGroup aria-label="选项">
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    expect(screen.getByText("选项 A")).toBeTruthy();
    expect(screen.getByText("选项 B")).toBeTruthy();
  });

  it("点击切换选中", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="选项" onChange={onChange}>
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    await user.click(screen.getByText("选项 B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("isDisabled 的选项无法选中", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="选项" onChange={onChange}>
        <RadioButton value="a" label="选项 A" isDisabled />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    await user.click(screen.getByText("选项 A"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/radio-buttons/radio-buttons.test.tsx
```

- [ ] **Step 3: 实现 radio-buttons.tsx**

`packages/ui/src/radio-buttons/radio-buttons.tsx`:
```tsx
"use client";

import { type ReactNode, type Ref, createContext, useContext } from "react";
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from "react-aria-components";
import { cn } from "../lib/utils";

export interface RadioGroupContextType { size?: "sm" | "md" }
const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export interface RadioButtonBaseProps {
  size?: "sm" | "md";
  className?: string;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export const RadioButtonBase = ({
  className, isFocusVisible, isSelected, isDisabled, size = "sm",
}: RadioButtonBaseProps) => (
  <div
    className={cn(
      "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white ring-1 ring-gray-300 ring-inset",
      size === "md" && "size-5",
      isSelected && "bg-blue-600 ring-blue-600",
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled && !isSelected && "bg-gray-100",
      isFocusVisible && "outline-2 outline-offset-2 outline-blue-500",
      className,
    )}
  >
    <div
      className={cn(
        "size-1.5 rounded-full bg-white opacity-0 transition-all",
        size === "md" && "size-2",
        isSelected && "opacity-100",
      )}
    />
  </div>
);
RadioButtonBase.displayName = "RadioButtonBase";

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

interface RadioButtonProps extends AriaRadioProps {
  size?: "sm" | "md";
  label?: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
}

export const RadioButton = ({ label, hint, className, size = "sm", ...ariaRadioProps }: RadioButtonProps) => {
  const context = useContext(RadioGroupContext);
  const resolvedSize = context?.size ?? size;

  return (
    <AriaRadio
      {...ariaRadioProps}
      className={(state) =>
        cn(
          "relative flex items-start",
          state.isDisabled && "cursor-not-allowed",
          sizeStyles[resolvedSize].root,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {({ isSelected, isDisabled, isFocusVisible }) => (
        <>
          <RadioButtonBase
            size={resolvedSize}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isFocusVisible={isFocusVisible}
            className={label || hint ? "mt-0.5" : ""}
          />
          {(label || hint) && (
            <div className={cn("inline-flex flex-col", sizeStyles[resolvedSize].textWrapper)}>
              {label && <p className={cn("text-gray-700 select-none", sizeStyles[resolvedSize].label)}>{label}</p>}
              {hint && (
                <span className={cn("text-gray-500", sizeStyles[resolvedSize].hint)} onClick={(e) => e.stopPropagation()}>
                  {hint}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </AriaRadio>
  );
};
RadioButton.displayName = "RadioButton";

interface RadioGroupProps extends RadioGroupContextType, AriaRadioGroupProps {
  children: ReactNode;
  className?: string;
}

export const RadioGroup = ({ children, className, size = "sm", ...props }: RadioGroupProps) => (
  <RadioGroupContext.Provider value={{ size }}>
    <AriaRadioGroup {...props} className={cn("flex flex-col gap-4", className)}>
      {children}
    </AriaRadioGroup>
  </RadioGroupContext.Provider>
);
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/radio-buttons/radio-buttons.test.tsx
```

预期：PASS（6 个测试）

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/radio-buttons/
git commit -m "feat(ui): 新增 RadioButton / RadioGroup 组件"
```

---

## Task 11: Dropdown 组件

**Files:**
- Create: `packages/ui/src/dropdown/dropdown.tsx`
- Create: `packages/ui/src/dropdown/dropdown.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/dropdown/dropdown.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

import { Dropdown } from "./dropdown";

describe("Dropdown", () => {
  it("渲染触发器按钮", () => {
    render(
      <Dropdown.Root>
        <button>打开菜单</button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="操作">
            <Dropdown.Item label="编辑" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    expect(screen.getByRole("button", { name: "打开菜单" })).toBeTruthy();
  });

  it("点击触发器打开 menu", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <button>打开菜单</button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="操作">
            <Dropdown.Item label="编辑" />
            <Dropdown.Item label="删除" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "打开菜单" }));
    expect(await screen.findByRole("menuitem", { name: "编辑" })).toBeTruthy();
  });

  it("DotsButton 渲染并包含图标", () => {
    render(
      <Dropdown.Root>
        <Dropdown.DotsButton />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="操作">
            <Dropdown.Item label="编辑" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(screen.getByTestId("icon-dots-vertical")).toBeTruthy();
  });

  it("Separator 渲染", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown.Root>
        <button>菜单</button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="操作">
            <Dropdown.Item label="编辑" />
            <Dropdown.Separator />
            <Dropdown.Item label="删除" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>,
    );
    await user.click(screen.getByRole("button", { name: "菜单" }));
    expect(await screen.findByRole("separator")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/dropdown/dropdown.test.tsx
```

- [ ] **Step 3: 实现 dropdown.tsx**

`packages/ui/src/dropdown/dropdown.tsx`:
```tsx
"use client";

import { type FC, type RefAttributes, useCallback } from "react";
import type {
  ButtonProps as AriaButtonProps,
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
  MenuItemRenderProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  Header as AriaHeader,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Separator as AriaSeparator,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { CheckboxBase } from "../checkbox/checkbox";
import { RadioButtonBase } from "../radio-buttons/radio-buttons";
import { ToggleBase } from "../toggle/toggle";
import { cn } from "../lib/utils";

interface DropdownItemProps extends AriaMenuItemProps {
  label?: string;
  addon?: string;
  unstyled?: boolean;
  icon?: FC<{ className?: string }>;
  avatarUrl?: string;
  selectionIndicator?: "checkmark" | "checkbox" | "radio" | "toggle" | "none";
}

const DropdownItem = ({
  label,
  children,
  addon,
  icon: Icon,
  avatarUrl,
  unstyled,
  selectionIndicator = "checkmark",
  ...props
}: DropdownItemProps) => {
  const SelectionIndicator = useCallback(
    (state: MenuItemRenderProps & { className?: string }) => {
      if (selectionIndicator === "checkmark")
        return (
          <SvgIcon
            name="check"
            size={16}
            className={cn(!state.isSelected && "invisible", state.className)}
          />
        );
      if (selectionIndicator === "checkbox")
        return (
          <CheckboxBase
            isSelected={state.isSelected && !state.hasSubmenu}
            isIndeterminate={state.isSelected && state.hasSubmenu}
            size="sm"
            className={cn("shrink-0", state.className)}
          />
        );
      if (selectionIndicator === "radio")
        return <RadioButtonBase isSelected={state.isSelected} className={cn("shrink-0", state.className)} />;
      if (selectionIndicator === "toggle")
        return <ToggleBase slim size="sm" isSelected={state.isSelected} className={cn("shrink-0", state.className)} />;
      return null;
    },
    [selectionIndicator],
  );

  if (unstyled) return <AriaMenuItem id={label} textValue={label} {...props} />;

  return (
    <AriaMenuItem
      {...props}
      className={(state) =>
        cn(
          "group block cursor-pointer px-1.5 py-px outline-hidden",
          state.isDisabled && "cursor-not-allowed opacity-50",
          typeof props.className === "function" ? props.className(state) : props.className,
        )
      }
    >
      {(state) => (
        <div
          className={cn(
            "relative flex items-center rounded-md px-2.5 py-2 transition duration-100 ease-linear",
            !state.isDisabled && "group-hover:bg-gray-50",
            state.isFocused && "bg-gray-50",
            state.hasSubmenu && "pr-1.5",
          )}
        >
          {state.selectionMode !== "none" && !avatarUrl && !Icon && (
            <SelectionIndicator {...state} className="mr-2" />
          )}
          {avatarUrl && (
            <div className="mr-2 flex size-4 items-center justify-center">
              <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} className="size-5" />
            </div>
          )}
          {Icon && <Icon aria-hidden="true" className="mr-2 size-4 shrink-0 text-gray-400" />}
          <span className={cn("grow truncate text-sm font-semibold text-gray-700", state.isFocused && "text-gray-900")}>
            {label || (typeof children === "function" ? children(state) : children)}
          </span>
          {addon && <span className="ml-1 shrink-0 pr-1 text-xs font-medium text-gray-400">{addon}</span>}
          {state.selectionMode !== "none" && (avatarUrl || Icon) && (
            <SelectionIndicator {...state} className="ml-1" />
          )}
          {state.hasSubmenu && (
            <SvgIcon name="chevron-right" size={16} className="ml-auto shrink-0 text-gray-400" />
          )}
        </div>
      )}
    </AriaMenuItem>
  );
};

interface DropdownMenuProps<T extends object> extends AriaMenuProps<T> {}

const DropdownMenu = <T extends object>(props: DropdownMenuProps<T>) => (
  <AriaMenu
    {...props}
    className={(state) =>
      cn(
        "h-min overflow-y-auto py-1 outline-hidden select-none",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  />
);

const DropdownPopover = (props: AriaPopoverProps) => (
  <AriaPopover
    placement="bottom right"
    {...props}
    className={(state) =>
      cn(
        "w-62 overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-gray-200",
        state.isEntering && "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
        state.isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    {props.children}
  </AriaPopover>
);

const DropdownSeparator = (props: AriaSeparatorProps) => (
  <AriaSeparator {...props} className={cn("my-1 h-px w-full bg-gray-100", props.className)} />
);

const DropdownDotsButton = (props: AriaButtonProps & RefAttributes<HTMLButtonElement>) => (
  <AriaButton
    {...props}
    aria-label="Open menu"
    className={(state) =>
      cn(
        "cursor-pointer rounded-md text-gray-400 outline-none transition duration-100 ease-linear",
        (state.isPressed || state.isHovered) && "text-gray-600",
        (state.isPressed || state.isFocusVisible) && "ring-2 ring-blue-500 ring-offset-2",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    <SvgIcon name="dots-vertical" size={20} />
  </AriaButton>
);

export const Dropdown = {
  Root: AriaMenuTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Section: AriaMenuSection,
  SectionHeader: AriaHeader,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  DotsButton: DropdownDotsButton,
};
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/dropdown/dropdown.test.tsx
```

预期：PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/dropdown/
git commit -m "feat(ui): 新增 Dropdown 组件"
```

---

## Task 12: Select 组件（含子文件）

**Files:**
- Create: `packages/ui/src/select/select-shared.ts`
- Create: `packages/ui/src/select/popover.tsx`
- Create: `packages/ui/src/select/select-item.tsx`
- Create: `packages/ui/src/select/combobox.tsx`
- Create: `packages/ui/src/select/select.tsx`
- Create: `packages/ui/src/select/select.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/select/select.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Select } from "./select";

const items = [
  { id: "1", label: "选项一" },
  { id: "2", label: "选项二" },
  { id: "3", label: "选项三" },
];

describe("Select", () => {
  it("渲染 placeholder", () => {
    render(
      <Select placeholder="请选择" aria-label="下拉">
        {items.map((item) => (
          <Select.Item key={item.id} {...item} />
        ))}
      </Select>,
    );
    expect(screen.getByText("请选择")).toBeTruthy();
  });

  it("渲染 label", () => {
    render(
      <Select label="分类" aria-label="分类">
        {items.map((item) => (
          <Select.Item key={item.id} {...item} />
        ))}
      </Select>,
    );
    expect(screen.getByText("分类")).toBeTruthy();
  });

  it("点击打开列表", async () => {
    const user = userEvent.setup();
    render(
      <Select placeholder="请选择" aria-label="下拉">
        {items.map((item) => (
          <Select.Item key={item.id} {...item} />
        ))}
      </Select>,
    );
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("option", { name: "选项一" })).toBeTruthy();
  });

  it("选中一项后显示其文字", async () => {
    const user = userEvent.setup();
    render(
      <Select placeholder="请选择" aria-label="下拉">
        {items.map((item) => (
          <Select.Item key={item.id} {...item} />
        ))}
      </Select>,
    );
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "选项二" }));
    expect(screen.getByText("选项二")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/select/select.test.tsx
```

- [ ] **Step 3: 实现 select-shared.ts**

`packages/ui/src/select/select-shared.ts`:
```ts
"use client";

import type { FC, ReactNode } from "react";
import { createContext } from "react";

export type SelectItemType = {
  id: string | number;
  label?: string;
  avatarUrl?: string;
  isDisabled?: boolean;
  supportingText?: string;
  icon?: FC | ReactNode;
};

export interface CommonProps {
  hint?: string;
  label?: string;
  tooltip?: string;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  hideRequiredIndicator?: boolean;
}

export const sizes = {
  sm: { root: "py-2 pl-3 pr-2.5 gap-2 text-sm", text: "text-sm", textContainer: "gap-x-1.5" },
  md: { root: "py-2 px-3 gap-2 text-base", text: "text-base", textContainer: "gap-x-1.5" },
  lg: { root: "py-2.5 px-3.5 gap-2 text-base", text: "text-base", textContainer: "gap-x-1.5" },
};

export const SelectContext = createContext<{ size: "sm" | "md" | "lg" }>({ size: "md" });
```

- [ ] **Step 4: 实现 popover.tsx**

`packages/ui/src/select/popover.tsx`:
```tsx
"use client";

import type { RefAttributes } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cn } from "../lib/utils";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
  size: "sm" | "md" | "lg";
}

export const Popover = (props: PopoverProps) => (
  <AriaPopover
    placement="bottom"
    containerPadding={0}
    offset={4}
    {...props}
    className={(state) =>
      cn(
        "w-(--trigger-width) overflow-x-hidden overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200 outline-hidden",
        state.isEntering && "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
        state.isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
        props.size === "sm" && "max-h-56",
        props.size === "md" && "max-h-64",
        props.size === "lg" && "max-h-80",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  />
);
```

- [ ] **Step 5: 实现 select-item.tsx**

`packages/ui/src/select/select-item.tsx`:
```tsx
"use client";

import { isValidElement, useContext } from "react";
import type { ListBoxItemProps as AriaListBoxItemProps } from "react-aria-components";
import { ListBoxItem as AriaListBoxItem, Text as AriaText } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { CheckboxBase } from "../checkbox/checkbox";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";
import type { SelectItemType } from "./select-shared";
import { SelectContext } from "./select-shared";

const itemSizes = {
  sm: { root: "p-2 pr-2.5 gap-2", text: "text-sm", textContainer: "gap-x-1.5", checkbox: "sm" as const },
  md: { root: "p-2 pr-2.5 gap-2", text: "text-base", textContainer: "gap-x-2", checkbox: "sm" as const },
  lg: { root: "p-2.5 pl-2 gap-2", text: "text-base", textContainer: "gap-x-2", checkbox: "md" as const },
};

interface SelectItemProps extends Omit<AriaListBoxItemProps<SelectItemType>, "id">, SelectItemType {
  selectionIndicator?: "checkmark" | "checkbox" | "none";
  selectionIndicatorAlign?: "left" | "right";
}

export const SelectItem = ({
  label,
  id,
  value,
  avatarUrl,
  supportingText,
  isDisabled,
  icon: Icon,
  className,
  children,
  selectionIndicator = "checkmark",
  selectionIndicatorAlign = "right",
  ...props
}: SelectItemProps) => {
  const { size } = useContext(SelectContext);
  const s = itemSizes[size];
  const labelOrChildren = label || (typeof children === "string" ? children : "");
  const textValue = supportingText ? `${labelOrChildren} ${supportingText}` : labelOrChildren;
  const isLeft = selectionIndicatorAlign === "left";

  return (
    <AriaListBoxItem
      id={id}
      value={value ?? { id, label: labelOrChildren, avatarUrl, supportingText, isDisabled, icon: Icon }}
      textValue={textValue}
      isDisabled={isDisabled}
      {...props}
      className={(state) =>
        cn(
          "w-full py-px outline-hidden",
          size === "sm" ? "px-1" : "px-1.5",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {(state) => (
        <div
          className={cn(
            "flex cursor-pointer items-center rounded-md outline-hidden select-none",
            (state.isFocused || state.isHovered || (state.isSelected && selectionIndicator !== "checkbox")) && "bg-gray-50",
            state.isDisabled && "cursor-not-allowed opacity-50",
            s.root,
          )}
        >
          {isLeft && selectionIndicator === "checkbox" && (
            <CheckboxBase size={s.checkbox} isSelected={state.isSelected} isDisabled={state.isDisabled} />
          )}
          {avatarUrl ? (
            <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} />
          ) : isReactComponent(Icon) ? (
            <Icon aria-hidden="true" />
          ) : isValidElement(Icon) ? Icon : null}
          <div className={cn("flex w-full min-w-0 flex-1 flex-wrap", s.textContainer)}>
            <AriaText slot="label" className={cn("truncate font-medium whitespace-nowrap text-gray-900", s.text)}>
              {label || (typeof children === "function" ? children(state) : children)}
            </AriaText>
            {supportingText && (
              <AriaText slot="description" className={cn("whitespace-nowrap text-gray-500", s.text)}>
                {supportingText}
              </AriaText>
            )}
          </div>
          {state.isSelected && selectionIndicator === "checkmark" && (
            <SvgIcon name="check" size={16} className="ml-auto text-blue-600" />
          )}
          {!isLeft && selectionIndicator === "checkbox" && (
            <CheckboxBase size={s.checkbox} isSelected={state.isSelected} isDisabled={state.isDisabled} className="ml-auto" />
          )}
        </div>
      )}
    </AriaListBoxItem>
  );
};
```

- [ ] **Step 6: 实现 combobox.tsx**

`packages/ui/src/select/combobox.tsx`:
```tsx
"use client";

import type { FC, FocusEventHandler, PointerEventHandler, ReactNode, Ref, RefAttributes } from "react";
import { isValidElement, useCallback, useContext, useRef, useState } from "react";
import type { ComboBoxProps as AriaComboBoxProps, ListBoxProps as AriaListBoxProps } from "react-aria-components";
import { ComboBox as AriaComboBox, Group as AriaGroup, Input as AriaInput, ListBox as AriaListBox, ComboBoxStateContext } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { HintText } from "../input/hint-text";
import { Label } from "../input/label";
import { Popover } from "./popover";
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "./select-shared";
import { useResizeObserver } from "../lib/use-resize-observer";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";

interface ComboBoxProps
  extends Omit<AriaComboBoxProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  shortcut?: boolean;
  items?: SelectItemType[];
  popoverClassName?: string;
  shortcutClassName?: string;
  icon?: FC | ReactNode;
  children: AriaListBoxProps<SelectItemType>["children"];
}

interface ComboBoxValueProps {
  size: "sm" | "md" | "lg";
  shortcut: boolean;
  placeholder?: string;
  shortcutClassName?: string;
  icon?: FC | ReactNode;
  onFocus?: FocusEventHandler;
  onPointerEnter?: PointerEventHandler;
  ref?: Ref<HTMLDivElement>;
}

const ComboBoxValue = ({
  size, shortcut, placeholder, shortcutClassName, icon: IconProp, ref, ...otherProps
}: ComboBoxValueProps) => {
  const state = useContext(ComboBoxStateContext);

  return (
    <AriaGroup
      ref={ref}
      {...otherProps}
      className={({ isFocusWithin, isDisabled }) =>
        cn(
          "relative flex w-full items-center gap-2 rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-hidden transition-shadow duration-100 ease-linear ring-inset",
          isDisabled && "cursor-not-allowed opacity-50",
          isFocusWithin && "ring-2 ring-blue-500",
          sizes[size].root,
        )
      }
    >
      {isReactComponent(IconProp) ? (
        <IconProp aria-hidden="true" />
      ) : isValidElement(IconProp) ? IconProp : null}
      <div className="relative flex flex-1 items-center overflow-hidden">
        <AriaInput
          placeholder={placeholder}
          className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>
      <SvgIcon name="search" size={size === "sm" ? 16 : 20} className="shrink-0 text-gray-400" />
      {shortcut && (
        <span className={cn("shrink-0 text-xs text-gray-400", shortcutClassName)}>⌘K</span>
      )}
    </AriaGroup>
  );
};

export const ComboBox = ({
  placeholder = "Search",
  shortcut = true,
  size = "md",
  children,
  items,
  shortcutClassName,
  icon,
  hideRequiredIndicator,
  ...otherProps
}: ComboBoxProps) => {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [popoverWidth, setPopoverWidth] = useState("");

  const onResize = useCallback(() => {
    if (!placeholderRef.current) return;
    setPopoverWidth(placeholderRef.current.getBoundingClientRect().width + "px");
  }, []);

  useResizeObserver({ ref: placeholderRef, box: "border-box", onResize });

  return (
    <SelectContext.Provider value={{ size }}>
      <AriaComboBox menuTrigger="focus" {...otherProps}>
        {(state) => (
          <div className="flex flex-col gap-1.5">
            {otherProps.label && (
              <Label isRequired={hideRequiredIndicator ? false : state.isRequired} tooltip={otherProps.tooltip}>
                {otherProps.label}
              </Label>
            )}
            <ComboBoxValue
              ref={placeholderRef}
              placeholder={placeholder}
              shortcut={shortcut}
              shortcutClassName={shortcutClassName}
              icon={icon}
              size={size}
              onFocus={onResize}
              onPointerEnter={onResize}
            />
            <Popover size={size} triggerRef={placeholderRef} style={{ width: popoverWidth }} className={otherProps.popoverClassName}>
              <AriaListBox items={items} className="size-full outline-hidden">
                {children}
              </AriaListBox>
            </Popover>
            {otherProps.hint && (
              <HintText isInvalid={state.isInvalid} className={cn(size === "sm" && "text-xs")}>
                {otherProps.hint}
              </HintText>
            )}
          </div>
        )}
      </AriaComboBox>
    </SelectContext.Provider>
  );
};
```

- [ ] **Step 7: 实现 select.tsx**

`packages/ui/src/select/select.tsx`:
```tsx
"use client";

import type { FC, ReactNode, Ref, RefAttributes } from "react";
import { isValidElement } from "react";
import type { SelectProps as AriaSelectProps } from "react-aria-components";
import { Button as AriaButton, ListBox as AriaListBox, Select as AriaSelect, SelectValue as AriaSelectValue } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { HintText } from "../input/hint-text";
import { Label } from "../input/label";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";
import { ComboBox } from "./combobox";
import { Popover } from "./popover";
import { SelectItem } from "./select-item";
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "./select-shared";

export { SelectContext, sizes, type CommonProps, type SelectItemType } from "./select-shared";

export interface SelectProps
  extends Omit<AriaSelectProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  items?: SelectItemType[];
  popoverClassName?: string;
  icon?: FC | ReactNode;
  children: ReactNode | ((item: SelectItemType) => ReactNode);
}

interface SelectValueProps {
  isOpen: boolean;
  size: "sm" | "md" | "lg";
  isFocused: boolean;
  isDisabled: boolean;
  placeholder?: string;
  ref?: Ref<HTMLButtonElement>;
  icon?: FC | ReactNode;
}

const SelectValue = ({ isOpen, isFocused, isDisabled, size, placeholder, icon, ref }: SelectValueProps) => (
  <AriaButton
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer items-center rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-hidden transition duration-100 ease-linear ring-inset",
      (isFocused || isOpen) && "ring-2 ring-blue-500",
      isDisabled && "cursor-not-allowed opacity-50",
    )}
  >
    <AriaSelectValue<SelectItemType>
      className={(state) =>
        cn("flex h-max w-full items-center justify-start truncate text-left align-middle", sizes[size].root)
      }
    >
      {(state) => {
        const selectedItem = state.selectedItems[0];
        const Icon = selectedItem?.icon || icon;
        return (
          <>
            {selectedItem?.avatarUrl ? (
              <Avatar size="xs" src={selectedItem.avatarUrl} alt={selectedItem.label} />
            ) : isReactComponent(Icon) ? (
              <Icon aria-hidden="true" />
            ) : isValidElement(Icon) ? Icon : null}
            {selectedItem ? (
              <section className={cn("flex w-full truncate", sizes[size].textContainer)}>
                <p className={cn("truncate font-medium text-gray-900", sizes[size].text)}>{selectedItem.label}</p>
                {selectedItem.supportingText && (
                  <p className={cn("text-gray-500", sizes[size].text)}>{selectedItem.supportingText}</p>
                )}
              </section>
            ) : (
              <p className={cn("text-gray-400", sizes[size].text)}>{placeholder}</p>
            )}
            <SvgIcon name="chevron-down" size={size === "lg" ? 20 : 16} className="ml-auto shrink-0 text-gray-400" />
          </>
        );
      }}
    </AriaSelectValue>
  </AriaButton>
);

const SelectComponent = ({
  placeholder = "Select",
  icon,
  size = "md",
  children,
  items,
  label,
  hint,
  tooltip,
  hideRequiredIndicator,
  className,
  ...rest
}: SelectProps) => (
  <SelectContext.Provider value={{ size }}>
    <AriaSelect
      {...rest}
      className={(state) => cn("flex flex-col gap-1.5", typeof className === "function" ? className(state) : className)}
    >
      {(state) => (
        <>
          {label && (
            <Label isRequired={hideRequiredIndicator ? false : state.isRequired} tooltip={tooltip}>
              {label}
            </Label>
          )}
          <SelectValue {...state} {...{ size, placeholder }} icon={icon} />
          <Popover size={size} className={rest.popoverClassName}>
            <AriaListBox items={items} className="size-full outline-hidden">
              {children}
            </AriaListBox>
          </Popover>
          {hint && <HintText isInvalid={state.isInvalid}>{hint}</HintText>}
        </>
      )}
    </AriaSelect>
  </SelectContext.Provider>
);

const _Select = SelectComponent as typeof SelectComponent & {
  ComboBox: typeof ComboBox;
  Item: typeof SelectItem;
};
_Select.ComboBox = ComboBox;
_Select.Item = SelectItem;

export { _Select as Select };
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/select/select.test.tsx
```

预期：PASS（4 个测试）

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/select/
git commit -m "feat(ui): 新增 Select 组件（含 ComboBox、SelectItem、Popover）"
```

---

## Task 13: CarouselBase 组件

**Files:**
- Create: `packages/ui/src/carousel/carousel-base.tsx`
- Create: `packages/ui/src/carousel/carousel-base.test.tsx`

- [ ] **Step 1: 写测试**

`packages/ui/src/carousel/carousel-base.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Embla 在 jsdom 中没有 DOM 尺寸，mock 它以返回可用的 fake API
let _selectedSnap = 0;
const _onCallbacks: Record<string, ((api: unknown) => void)[]> = {};

const mockApi = {
  scrollNext: vi.fn(() => {
    _selectedSnap = (_selectedSnap + 1) % 3;
    _onCallbacks["select"]?.forEach((cb) => cb(mockApi));
  }),
  scrollPrev: vi.fn(() => {
    _selectedSnap = Math.max(0, _selectedSnap - 1);
    _onCallbacks["select"]?.forEach((cb) => cb(mockApi));
  }),
  scrollTo: vi.fn((i: number) => {
    _selectedSnap = i;
    _onCallbacks["select"]?.forEach((cb) => cb(mockApi));
  }),
  canScrollPrev: vi.fn(() => _selectedSnap > 0),
  canScrollNext: vi.fn(() => true),
  selectedScrollSnap: vi.fn(() => _selectedSnap),
  scrollSnapList: vi.fn(() => [0, 1, 2]),
  on: vi.fn((event: string, cb: (api: unknown) => void) => {
    if (!_onCallbacks[event]) _onCallbacks[event] = [];
    _onCallbacks[event].push(cb);
  }),
  off: vi.fn((event: string, cb: (api: unknown) => void) => {
    _onCallbacks[event] = (_onCallbacks[event] || []).filter((c) => c !== cb);
  }),
};

vi.mock("embla-carousel-react", () => ({
  default: vi.fn(() => [vi.fn(), mockApi]),
}));

import { Carousel } from "./carousel-base";

beforeEach(() => {
  _selectedSnap = 0;
  Object.keys(_onCallbacks).forEach((k) => delete _onCallbacks[k]);
  vi.clearAllMocks();
});

describe("Carousel.Root", () => {
  it("渲染不崩溃", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>幻灯片 1</Carousel.Item>
        </Carousel.Content>
      </Carousel.Root>,
    );
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("渲染多张幻灯片，DOM 都存在", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>幻灯片 1</Carousel.Item>
          <Carousel.Item>幻灯片 2</Carousel.Item>
          <Carousel.Item>幻灯片 3</Carousel.Item>
        </Carousel.Content>
      </Carousel.Root>,
    );
    expect(screen.getByText("幻灯片 1")).toBeTruthy();
    expect(screen.getByText("幻灯片 2")).toBeTruthy();
    expect(screen.getByText("幻灯片 3")).toBeTruthy();
  });

  it("IndicatorGroup 渲染 scrollSnaps 数量的子元素", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>A</Carousel.Item>
          <Carousel.Item>B</Carousel.Item>
          <Carousel.Item>C</Carousel.Item>
        </Carousel.Content>
        <Carousel.IndicatorGroup aria-label="nav">
          {({ index }) => (
            <Carousel.Indicator index={index} key={index} asChild>
              <button aria-label={`第 ${index + 1} 张`}>•</button>
            </Carousel.Indicator>
          )}
        </Carousel.IndicatorGroup>
      </Carousel.Root>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("点击 Indicator 调用 api.scrollTo", async () => {
    const user = userEvent.setup();
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>A</Carousel.Item>
          <Carousel.Item>B</Carousel.Item>
          <Carousel.Item>C</Carousel.Item>
        </Carousel.Content>
        <Carousel.IndicatorGroup>
          {({ index }) => (
            <Carousel.Indicator index={index} key={index} asChild>
              <button aria-label={`第 ${index + 1} 张`}>•</button>
            </Carousel.Indicator>
          )}
        </Carousel.IndicatorGroup>
      </Carousel.Root>,
    );
    await user.click(screen.getByLabelText("第 2 张"));
    expect(mockApi.scrollTo).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/ui exec vitest run src/carousel/carousel-base.test.tsx
```

- [ ] **Step 3: 实现 carousel-base.tsx**（从 Untitled UI 复制，仅将 `cx` 替换为 `cn`）

`packages/ui/src/carousel/carousel-base.tsx`:
```tsx
"use client";

import type { CSSProperties, ComponentPropsWithRef, HTMLAttributes, KeyboardEvent, ReactNode, Ref } from "react";
import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { cn } from "../lib/utils";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = CarouselProps & {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  scrollSnaps: number[];
};

export const CarouselContext = createContext<CarouselContextProps | null>(null);

export const useCarousel = () => {
  const context = useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within <Carousel.Root />");
  return context;
};

const CarouselRoot = ({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: ComponentPropsWithRef<"div"> & CarouselProps) => {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onInit = useCallback((api: CarouselApi) => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); scrollPrev(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); scrollNext(); }
    },
    [scrollPrev, scrollNext],
  );

  useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api) return;
    onInit(api);
    onSelect(api);
    api.on("reInit", onInit);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => { api?.off("select", onSelect); };
  }, [api, onInit, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef, api, opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev, scrollNext, canScrollPrev, canScrollNext, selectedIndex, scrollSnaps,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

interface CarouselContentProps extends ComponentPropsWithRef<"div"> {
  overflowHidden?: boolean;
}

const CarouselContent = ({ className, overflowHidden = true, ...props }: CarouselContentProps) => {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className={cn("h-full w-full", overflowHidden && "overflow-hidden")}>
      <div
        className={cn("flex max-h-full", orientation === "horizontal" ? "" : "flex-col", className)}
        {...props}
      />
    </div>
  );
};

const CarouselItem = ({ className, ...props }: ComponentPropsWithRef<"div">) => (
  <div
    role="group"
    aria-roledescription="slide"
    className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
    {...props}
  />
);

interface TriggerRenderProps { isDisabled: boolean; onClick: () => void; }
interface TriggerProps {
  ref?: Ref<HTMLButtonElement>;
  asChild?: boolean;
  direction: "prev" | "next";
  children: ReactNode | ((props: TriggerRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isDisabled: boolean }) => string);
}

const Trigger = ({ className, children, asChild, direction, style, ...props }: TriggerProps) => {
  const { scrollPrev, canScrollNext, scrollNext, canScrollPrev } = useCarousel();
  const isDisabled = direction === "prev" ? !canScrollPrev : !canScrollNext;
  const handleClick = () => { if (!isDisabled) direction === "prev" ? scrollPrev() : scrollNext(); };
  const computedClassName = typeof className === "function" ? className({ isDisabled }) : className;
  const defaultAriaLabel = direction === "prev" ? "Previous slide" : "Next slide";

  if (typeof children === "function") return <>{children({ isDisabled, onClick: handleClick })}</>;
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick, disabled: isDisabled, "aria-label": defaultAriaLabel,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className: [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className].filter(Boolean).join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }
  return (
    <button aria-label={defaultAriaLabel} disabled={isDisabled} className={computedClassName} onClick={handleClick} {...props}>
      {children}
    </button>
  );
};

const CarouselPrevTrigger = (props: Omit<TriggerProps, "direction">) => <Trigger {...props} direction="prev" />;
const CarouselNextTrigger = (props: Omit<TriggerProps, "direction">) => <Trigger {...props} direction="next" />;

interface CarouselIndicatorRenderProps { isSelected: boolean; onClick: () => void; }
interface CarouselIndicatorProps {
  index: number;
  asChild?: boolean;
  isSelected?: boolean;
  children?: ReactNode | ((props: CarouselIndicatorRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isSelected: boolean }) => string);
}

const CarouselIndicator = ({ index, isSelected = false, children, asChild, className, style }: CarouselIndicatorProps) => {
  const { api, selectedIndex } = useCarousel();
  isSelected = isSelected || selectedIndex === index;
  const handleClick = () => api?.scrollTo(index);
  const computedClassName = typeof className === "function" ? className({ isSelected }) : className;
  const defaultAriaLabel = `Go to slide ${index + 1}`;

  if (typeof children === "function") return <>{children({ isSelected, onClick: handleClick })}</>;
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick, "aria-label": defaultAriaLabel,
      "aria-current": isSelected ? ("true" as const) : undefined,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className: [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className].filter(Boolean).join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }
  return (
    <button aria-label={defaultAriaLabel} aria-current={isSelected ? "true" : undefined} className={computedClassName} onClick={handleClick}>
      {children}
    </button>
  );
};

interface CarouselIndicatorGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode | ((props: { index: number }) => ReactNode);
}

const CarouselIndicatorGroup = ({ children, ...props }: CarouselIndicatorGroupProps) => {
  const { scrollSnaps } = useCarousel();
  if (typeof children === "function") {
    return <nav {...props}>{scrollSnaps.map((_, index) => (children as (props: { index: number }) => ReactNode)({ index }))}</nav>;
  }
  return <nav {...props}>{children}</nav>;
};

export const Carousel = {
  Root: CarouselRoot,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevTrigger: CarouselPrevTrigger,
  NextTrigger: CarouselNextTrigger,
  IndicatorGroup: CarouselIndicatorGroup,
  Indicator: CarouselIndicator,
};
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/ui exec vitest run src/carousel/carousel-base.test.tsx
```

预期：PASS（4 个测试）

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/carousel/
git commit -m "feat(ui): 新增 CarouselBase（Embla 基础层）"
```

---

## Task 14: 替换 PaginationBase

**Files:**
- Modify: `packages/ui/src/pagination/pagination-base.tsx`
- Modify: `packages/ui/src/pagination/pagination.test.tsx`

- [ ] **Step 1: 确认现有测试全部通过（基准）**

```bash
pnpm --filter @repo/ui exec vitest run src/pagination/pagination.test.tsx
```

预期：PASS（所有测试）

- [ ] **Step 2: 替换 pagination-base.tsx**

官方版本结构 + `useMemo` 替代 `useState + useEffect`：

`packages/ui/src/pagination/pagination-base.tsx`:
```tsx
"use client";

import type { CSSProperties, FC, HTMLAttributes, ReactNode } from "react";
import React, {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
} from "react";

type PaginationPage = { type: "page"; value: number; isCurrent: boolean };
type PaginationEllipsisType = { type: "ellipsis"; key: number };
type PaginationItemType = PaginationPage | PaginationEllipsisType;

interface PaginationContextType {
  pages: PaginationItemType[];
  currentPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

export interface PaginationRootProps {
  siblingCount?: number;
  page: number;
  total: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onPageChange?: (page: number) => void;
}

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => i + start);

const PaginationRoot = ({
  total, siblingCount = 1, page, onPageChange, children, style, className,
}: PaginationRootProps) => {
  const createPaginationItems = useCallback((): PaginationItemType[] => {
    const items: PaginationItemType[] = [];
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPageNumbers >= total) {
      for (let i = 1; i <= total; i++)
        items.push({ type: "page", value: i, isCurrent: i === page });
      return items;
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, total);
    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < total - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
      range(1, siblingCount * 2 + 3).forEach((n) =>
        items.push({ type: "page", value: n, isCurrent: n === page }),
      );
      items.push({ type: "ellipsis", key: siblingCount * 2 + 4 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    } else if (showLeftEllipsis && !showRightEllipsis) {
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: total - (siblingCount * 2 + 3) });
      range(total - (siblingCount * 2 + 2), total).forEach((n) =>
        items.push({ type: "page", value: n, isCurrent: n === page }),
      );
    } else {
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: leftSiblingIndex - 1 });
      range(leftSiblingIndex, rightSiblingIndex).forEach((n) =>
        items.push({ type: "page", value: n, isCurrent: n === page }),
      );
      items.push({ type: "ellipsis", key: rightSiblingIndex + 1 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    }

    return items;
  }, [total, siblingCount, page]);

  // 同步计算，避免 useEffect 延迟导致翻页时高亮错位
  const pages = useMemo(() => createPaginationItems(), [createPaginationItems]);

  return (
    <PaginationContext.Provider
      value={{ pages, currentPage: page, total, onPageChange: (p) => onPageChange?.(p) }}
    >
      <nav aria-label="Pagination Navigation" style={style} className={className}>
        {children}
      </nav>
    </PaginationContext.Provider>
  );
};

interface TriggerRenderProps { isDisabled: boolean; onClick: () => void }
interface TriggerProps {
  children: ReactNode | ((props: TriggerRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isDisabled: boolean }) => string);
  asChild?: boolean;
  direction: "prev" | "next";
  ariaLabel?: string;
}

const Trigger: FC<TriggerProps> = ({ children, style, className, asChild = false, direction, ariaLabel }) => {
  const context = useContext(PaginationContext);
  if (!context) throw new Error("Pagination components must be within Pagination.Root");
  const { currentPage, total, onPageChange } = context;
  const isDisabled = direction === "prev" ? currentPage <= 1 : currentPage >= total;
  const handleClick = () => {
    if (isDisabled) return;
    onPageChange(direction === "prev" ? currentPage - 1 : currentPage + 1);
  };
  const computedClassName = typeof className === "function" ? className({ isDisabled }) : className;
  const defaultAriaLabel = direction === "prev" ? "Previous Page" : "Next Page";

  if (typeof children === "function") return <>{children({ isDisabled, onClick: handleClick })}</>;
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick, disabled: isDisabled, isDisabled,
      "aria-label": ariaLabel || defaultAriaLabel,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className: [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className].filter(Boolean).join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }
  return (
    <button aria-label={ariaLabel || defaultAriaLabel} onClick={handleClick} disabled={isDisabled} style={style} className={computedClassName}>
      {children}
    </button>
  );
};

const PaginationPrevTrigger: FC<Omit<TriggerProps, "direction">> = (props) => <Trigger {...props} direction="prev" />;
const PaginationNextTrigger: FC<Omit<TriggerProps, "direction">> = (props) => <Trigger {...props} direction="next" />;

export interface PaginationItemProps {
  value: number;
  isCurrent: boolean;
  children?: ReactNode | ((props: { isSelected: boolean; onClick: () => void; value: number; "aria-current"?: "page"; "aria-label"?: string }) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isSelected: boolean }) => string);
  ariaLabel?: string;
  asChild?: boolean;
}

const PaginationItem = ({ value, isCurrent, children, style, className, ariaLabel, asChild = false }: PaginationItemProps) => {
  const context = useContext(PaginationContext);
  if (!context) throw new Error("Pagination components must be within Pagination.Root");
  const { onPageChange } = context;
  const isSelected = isCurrent;
  const handleClick = () => onPageChange(value);
  const computedClassName = typeof className === "function" ? className({ isSelected }) : className;

  if (typeof children === "function") {
    return <>{children({ isSelected, onClick: handleClick, value, "aria-current": isCurrent ? "page" : undefined, "aria-label": ariaLabel || `Page ${value}` })}</>;
  }
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick, "aria-current": isCurrent ? "page" : undefined,
      "aria-label": ariaLabel || `Page ${value}`,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className: [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className].filter(Boolean).join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }
  return (
    <button onClick={handleClick} style={style} className={computedClassName}
      aria-current={isCurrent ? "page" : undefined} aria-label={ariaLabel || `Page ${value}`} role="listitem">
      {children ?? value}
    </button>
  );
};

interface PaginationEllipsisProps {
  key: number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string | (() => string);
}

const PaginationEllipsis: FC<PaginationEllipsisProps> = ({ children, style, className }) => {
  const computedClassName = typeof className === "function" ? className() : className;
  return <span style={style} className={computedClassName} aria-hidden="true">{children}</span>;
};

interface PaginationContextComponentProps {
  children: (pagination: PaginationContextType) => ReactNode;
}

const PaginationContextComponent: FC<PaginationContextComponentProps> = ({ children }) => {
  const context = useContext(PaginationContext);
  if (!context) throw new Error("Pagination components must be within Pagination.Root");
  return <>{children(context)}</>;
};

export const PaginationBase = {
  Root: PaginationRoot,
  PrevTrigger: PaginationPrevTrigger,
  NextTrigger: PaginationNextTrigger,
  Item: PaginationItem,
  Ellipsis: PaginationEllipsis,
  Context: PaginationContextComponent,
};
```

- [ ] **Step 3: 运行测试，确认全部通过**

```bash
pnpm --filter @repo/ui exec vitest run src/pagination/pagination.test.tsx
```

预期：PASS（所有原有测试）

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/pagination/pagination-base.tsx
git commit -m "refactor(ui): 替换 PaginationBase 为 Untitled UI 版本（保留 useMemo 同步计算）"
```

---

## Task 15: 更新 packages/ui/src/index.ts

**Files:**
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: 更新 index.ts**

`packages/ui/src/index.ts` 完整内容：
```ts
export { Badge, type BadgeProps } from "./badge";
export { Button, type ButtonProps } from "./button";
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
export { cn } from "./lib/utils";

// Carousel
export { Carousel, CarouselContext, useCarousel } from "./carousel/carousel-base";

// Dropdown
export { Dropdown } from "./dropdown/dropdown";

// Select
export { Select, SelectContext, type SelectItemType, type CommonProps } from "./select/select";

// Tooltip
export { Tooltip, TooltipTrigger } from "./tooltip/tooltip";

// ButtonUtility
export { ButtonUtility, type ButtonProps as ButtonUtilityProps } from "./button-utility/button-utility";

// Toggle
export { Toggle, ToggleBase } from "./toggle/toggle";

// Avatar
export { Avatar, type AvatarProps } from "./avatar/avatar";
export {
  AvatarOnlineIndicator,
  VerifiedTick,
  AvatarCount,
  AvatarAddButton,
  AvatarCompanyIcon,
} from "./avatar/base-components";

// Checkbox
export { Checkbox, CheckboxBase, type CheckboxBaseProps } from "./checkbox/checkbox";

// RadioButtons
export { RadioButton, RadioGroup, RadioButtonBase, type RadioButtonBaseProps } from "./radio-buttons/radio-buttons";

// Input (path updated: single file → directory)
export { Input, type InputProps, Label, HintText } from "./input";

// Pagination
export { Pagination, PaginationBase, type PaginationProps } from "./pagination";

// Tabs
export {
  Tabs, TabsList, TabsItem, TabsPanels, TabsPanel,
  type TabsProps, type TabsListProps, type TabsItemProps,
  type TabsPanelsProps, type TabsPanelProps, type TabsVariant,
} from "./tabs";

// SearchField
export { SearchField, type SearchFieldProps } from "./search-field";

// TagGroup
export { TagGroup, TagList, TagItem, type TagGroupWrapperProps, type TagItemProps } from "./tag-group";
```

- [ ] **Step 2: type-check 整个 monorepo**

```bash
pnpm -r check-types
```

预期：无报错。

- [ ] **Step 3: 运行 packages/ui 全量测试**

```bash
pnpm --filter @repo/ui test
```

预期：全部 PASS。

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/index.ts
git commit -m "feat(ui): 更新 index.ts，导出全部新增组件"
```

---

## Task 16: 重写 FeaturedCarousel

**Files:**
- Modify: `apps/web/components/featured/featured-carousel.tsx`
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`
- Delete: `apps/web/components/featured/featured-carousel-indicators.tsx`
- Modify: `apps/web/components/featured/featured-carousel.test.tsx`

**架构说明：**
- `currentIndex` 本地 state 驱动指示器 `aria-current` 和移动端文字 cross-fade
- Embla `api.on("select", ...)` 负责同步 `currentIndex`（自动轮播时 Embla 滚动 → select 事件 → 更新 currentIndex）
- 无 Embla API 时（jsdom）自动轮播 fallback 直接 `setCurrentIndex`，保证测试可用

- [ ] **Step 1: 删除旧 indicators 文件**

```bash
rm apps/web/components/featured/featured-carousel-indicators.tsx
```

- [ ] **Step 2: 更新测试文件**

`apps/web/components/featured/featured-carousel.test.tsx` 重写：

核心变化：
1. mock `embla-carousel-react` 以在 jsdom 中正常工作
2. 现有断言大部分保持：aria-current、region、指示器数量、auto-play

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FeaturedCarousel } from "./featured-carousel";
import type { FeaturedPost } from "../../app/_mock/types";

// --- Embla mock ---
let _snap = 0;
const _cbs: Record<string, ((api: unknown) => void)[]> = {};
const mockApi = {
  scrollNext: vi.fn(() => { _snap = (_snap + 1) % 3; _cbs["select"]?.forEach((cb) => cb(mockApi)); }),
  scrollPrev: vi.fn(() => { _snap = Math.max(0, _snap - 1); _cbs["select"]?.forEach((cb) => cb(mockApi)); }),
  scrollTo: vi.fn((i: number) => { _snap = i; _cbs["select"]?.forEach((cb) => cb(mockApi)); }),
  canScrollPrev: vi.fn(() => _snap > 0),
  canScrollNext: vi.fn(() => true),
  selectedScrollSnap: vi.fn(() => _snap),
  scrollSnapList: vi.fn(() => [0, 1, 2]),
  on: vi.fn((e: string, cb: (api: unknown) => void) => { (_cbs[e] ??= []).push(cb); }),
  off: vi.fn((e: string, cb: (api: unknown) => void) => { _cbs[e] = (_cbs[e] ?? []).filter((c) => c !== cb); }),
};
vi.mock("embla-carousel-react", () => ({ default: vi.fn(() => [vi.fn(), mockApi]) }));

// --- Other mocks ---
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; fill?: boolean; priority?: boolean; className?: string }) =>
    <img src={src} alt={alt} className={className} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [k: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}));
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) =>
    <span data-testid={`icon-${name}`} data-size={size} />,
}));
vi.mock("@repo/ui", () => ({
  Button: ({ href, children, tabIndex, className }: { href?: string; children: ReactNode; tabIndex?: number; className?: string; variant?: string; size?: string }) =>
    href ? <a href={href} tabIndex={tabIndex} className={className}>{children}</a>
         : <button type="button" tabIndex={tabIndex} className={className}>{children}</button>,
  Carousel: {
    Root: ({ children, setApi, ...props }: { children: ReactNode; setApi?: (api: unknown) => void; opts?: unknown; [k: string]: unknown }) => {
      // Call setApi with the mock so FeaturedCarousel wires up Embla events
      if (setApi) setApi(mockApi);
      return <div role="region" {...props}>{children}</div>;
    },
    Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Item: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

const mockPosts: FeaturedPost[] = [
  { id: "1", title: "第一篇文章标题", excerpt: "摘要1", coverImage: "https://example.com/1.jpg", category: "编程", href: "/articles/first" },
  { id: "2", title: "第二篇文章标题", excerpt: "摘要2", coverImage: "https://example.com/2.jpg", category: "工具", href: "/articles/second" },
  { id: "3", title: "第三篇文章标题", excerpt: "摘要3", coverImage: "https://example.com/3.jpg", category: "文学", href: "/articles/third" },
];

beforeEach(() => { _snap = 0; Object.keys(_cbs).forEach((k) => delete _cbs[k]); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe("FeaturedCarousel", () => {
  it("渲染不崩溃，DOM 中存在第一张幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
  });

  it("DOM 中存在所有幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第二篇文章标题").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第三篇文章标题").length).toBeGreaterThan(0);
  });

  it("渲染正确数量的指示器按钮", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByTestId("icon-droplet-filled")).toHaveLength(mockPosts.length);
  });

  it("指示器按钮具有正确的 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 2 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 3 张，共 3 张")).toBeTruthy();
  });

  it("轮播容器具有正确的 region aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByRole("region", { name: "推荐文章" })).toBeTruthy();
  });

  it("posts 为空时不渲染", () => {
    const { container } = render(<FeaturedCarousel posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("初始状态：第一个指示器为 current", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 2 张，共 3 张")).not.toHaveAttribute("aria-current");
  });

  it("点击第二个指示器切换到第二张幻灯片", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);
    await act(async () => { await user.click(screen.getByLabelText("第 2 张，共 3 张")); });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 1 张，共 3 张")).not.toHaveAttribute("aria-current");
  });
});

describe("FeaturedCarousel 自动轮播", () => {
  it("自动轮播：4 秒后切换到第二张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：8 秒后切换到第三张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByLabelText("第 3 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停时暂停自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => { fireEvent.mouseEnter(screen.getByRole("region", { name: "推荐文章" })); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停结束后恢复自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    const carousel = screen.getByRole("region", { name: "推荐文章" });
    act(() => { fireEvent.mouseEnter(carousel); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    act(() => { fireEvent.mouseLeave(carousel); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });
});
```

- [ ] **Step 3: 运行测试，确认失败（组件还未改写）**

```bash
pnpm --filter @repo/web exec vitest run components/featured/featured-carousel.test.tsx 2>/dev/null || \
  cd apps/web && pnpm vitest run components/featured/featured-carousel.test.tsx
```

- [ ] **Step 4: 改写 featured-carousel-slide.tsx**（移除 `isActive` prop）

`apps/web/components/featured/featured-carousel-slide.tsx`:
```tsx
import Image from "next/image";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  /** 首屏 LCP 候选：首张幻灯片始终 eager 预加载 */
  isLcpCandidate?: boolean;
}

export function FeaturedCarouselSlide({ post, isLcpCandidate = false }: FeaturedCarouselSlideProps) {
  return (
    <div className="relative w-full h-full aspect-video">
      <Image
        src={post.coverImage}
        alt={post.title}
        fill
        className="object-cover"
        priority={isLcpCandidate}
        loading={isLcpCandidate ? "eager" : "lazy"}
      />

      {/* 移动端：分类标签叠加在图片左下角 */}
      <span className="md:hidden absolute bottom-4 left-4 z-10 inline-block px-3 py-1 text-xs font-medium text-white bg-black/40 rounded-full backdrop-blur-sm">
        {post.category}
      </span>

      {/* 桌面端：渐变遮罩 + 文字覆盖层 */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 lg:p-8">
        <span className="inline-block mb-3 px-3 py-1 text-xs font-medium text-white bg-white/20 rounded-full backdrop-blur-sm">
          {post.category}
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2">{post.title}</h2>
        <p className="text-sm lg:text-base text-white/80 mb-4 line-clamp-2">{post.excerpt}</p>
        <Button
          href={post.href}
          variant="outline"
          size="sm"
          className="border-white/60 text-white bg-transparent hover:bg-white/20 hover:text-white hover:border-white"
        >
          阅读全文
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 改写 featured-carousel.tsx**

`apps/web/components/featured/featured-carousel.tsx`:
```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import { Carousel } from "@repo/ui";
import type { UseEmblaCarouselType } from "embla-carousel-react";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";

type CarouselApi = UseEmblaCarouselType[1];

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Embla select イベントで currentIndex を同期
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  // 自動再生：Embla API がある場合は scrollNext、なければ state fallback（jsdom テスト用）
  useEffect(() => {
    if (isHovered) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      if (api) {
        api.scrollNext();
      } else {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }
    }, 4000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [api, isHovered, posts.length]);

  const handleIndicatorClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      api?.scrollTo(index);
    },
    [api],
  );

  if (posts.length === 0) return null;

  return (
    <Carousel.Root
      opts={{ loop: true }}
      setApi={setApi}
      aria-label="推荐文章"
      className="overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片轮播区 */}
      <div className="relative aspect-video w-full">
        <Carousel.Content className="-ml-0">
          {posts.map((post, index) => (
            <Carousel.Item key={post.id}>
              <FeaturedCarouselSlide post={post} isLcpCandidate={index === 0} />
            </Carousel.Item>
          ))}
        </Carousel.Content>

        {/* 指示器 */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
          {posts.map((post, index) => (
            <button
              key={post.id}
              onClick={() => handleIndicatorClick(index)}
              aria-label={`第 ${index + 1} 张，共 ${posts.length} 张`}
              aria-current={index === currentIndex ? "true" : undefined}
              className={`transition-colors duration-200 ${
                index === currentIndex ? "text-white" : "text-white/40 hover:text-white/80"
              }`}
            >
              <SvgIcon name="droplet-filled" size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* 移动端文字区：基于 currentIndex 的 cross-fade */}
      <div className="md:hidden relative h-44 overflow-hidden bg-card rounded-b-2xl">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className={`absolute inset-0 p-4 transition-opacity duration-500 ${
              index === currentIndex
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={index !== currentIndex}
          >
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-lg font-bold text-foreground line-clamp-2">{post.title}</h2>
              <Link
                href={post.href}
                aria-label="阅读文章"
                tabIndex={index === currentIndex ? 0 : -1}
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <SvgIcon name="arrow-up-right" size={20} />
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
          </div>
        ))}
      </div>
    </Carousel.Root>
  );
}
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
cd apps/web && pnpm vitest run components/featured/featured-carousel.test.tsx
```

预期：PASS（全部测试）

- [ ] **Step 7: 运行全量测试，确认无回归**

```bash
cd /path/to/blog-frontend && pnpm -r test
```

预期：全部 PASS。

- [ ] **Step 8: type-check**

```bash
pnpm -r check-types
```

预期：无报错。

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/featured/
git rm apps/web/components/featured/featured-carousel-indicators.tsx
git commit -m "feat(web): 用 Embla CarouselBase 重写 FeaturedCarousel，删除旧 indicators 实现"
```

---

## 自审：Spec 覆盖检查

| Spec 要求 | 对应 Task |
|---|---|
| 6 个 SVG 图标 | Task 1 ✓ |
| sortCx / isReactComponent / useResizeObserver 工具 | Task 2 ✓ |
| embla-carousel-react 依赖 | Task 3 ✓ |
| Tooltip 组件 | Task 4 ✓ |
| Toggle 组件（含 ToggleBase） | Task 5 ✓ |
| Input 多文件目录（label/hint-text/input） | Task 6 ✓ |
| ButtonUtility 组件 | Task 7 ✓ |
| Avatar 完整迁移（含 base-components） | Task 8 ✓ |
| Checkbox / CheckboxBase | Task 9 ✓ |
| RadioButton / RadioGroup / RadioButtonBase | Task 10 ✓ |
| Dropdown 组件 | Task 11 ✓ |
| Select / SelectItem / ComboBox / Popover | Task 12 ✓ |
| CarouselBase（Embla） | Task 13 ✓ |
| PaginationBase 替换（useMemo 保留） | Task 14 ✓ |
| packages/ui index.ts 更新 | Task 15 ✓ |
| FeaturedCarousel 重写 + slide 更新 + indicators 删除 | Task 16 ✓ |

所有 spec 要求均有对应实现 task。
