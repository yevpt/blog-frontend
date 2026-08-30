# Toast 通知重新设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把全局右下角弹出的短暂提示 toast（`@repo/ui` `ToastRegion`）从"纯色块 + 固定宽度"重设计为"毛玻璃卡片 + 左侧类型图标芯片 + 内容自适应宽度"，并修正一个被复用的图标几何错误。

**Architecture:** 改动集中在两处：1）`packages/icons` 新增/修正两个 SVG 源文件并重新生成 sprite；2）`packages/ui/src/toast/toast.tsx` 重写容器与子元素的 Tailwind 类名、新增按类型取图标的映射表。不改变任何公共 API（`addToast(message, type)`、`ToastQueue`、`ToastContent`/`ToastType` 类型全部不变），现有 ~30 处调用方代码零改动。

**Tech Stack:** React + TypeScript + Tailwind CSS v4 + react-aria-components（`UNSTABLE_Toast*`） + Vitest/happy-dom + Testing Library。

## Global Constraints

- 不改 `packages/ui/src/toast/types.ts`（`ToastType`/`ToastContent`/`ToastRegionProps` 签名不变）。
- 不改 `apps/web/lib/toast.ts` 的 `addToast` 签名与 `ToastQueue` 的 `maxVisibleToasts`/`timeout` 行为参数。
- 不改 `apps/web/components/notifications/notification-card.tsx`（站内通知列表，不在本次范围）。
- 新 SVG 图标必须沿用现有风格：`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`。
- 组件改动后必须保持/补全同名 `*.test.tsx`（`packages/ui` 强制要求）。
- 颜色全部走项目已有 Tailwind 设计令牌（`--color-card`/`--color-border`/`--color-primary`/`--color-destructive`/`--color-muted-foreground`/`--color-accent`/`--color-ring`），不引入新的硬编码十六进制色值（emerald 例外，项目里 success 态历来用 `emerald-500` 系列，如 `apps/web/components/navbar/navbar-mobile-menu.tsx:201`）。
- Commit message 必须满足 `scripts/validate-commit-msg.cjs`：`<type>(<scope>): <中文主题，≤50 字，不以句号结尾>`，`type` 取自 `feat/fix/refactor/test/chore/perf/docs/ci/style/build`。

---

### Task 1: 修正 info-circle 图标几何，新增 alert-circle 图标

**Files:**

- Modify: `packages/icons/svg/info-circle.svg`
- Create: `packages/icons/svg/alert-circle.svg`
- Generated（由脚本产出，需一并提交）: `packages/icons/src/generated/sprite.ts`、`packages/icons/src/generated/types.ts`

**Interfaces:**

- Consumes: 无（叶子任务，不依赖其它任务）。
- Produces: `IconName` 联合类型新增成员 `"alert-circle"`（`"info-circle"` 已存在，仅几何变化）。Task 2 的 `SvgIcon name="alert-circle"` / `name="info-circle"` 依赖此处生成的 sprite symbol。

- [ ] **Step 1: 确认现状（无需修改代码）**

```bash
cat packages/icons/svg/info-circle.svg
```

预期输出（当前几何：竖线在上、点在下，视觉上是感叹号，不是标准 info 图标）：

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>
```

确认全站无引用（不影响现有页面）：

```bash
grep -rn 'name="info-circle"' apps packages --include="*.tsx" | grep -v node_modules
```

预期输出：空（无匹配行）。

- [ ] **Step 2: 修正 info-circle.svg 为标准 info 几何（点在上、竖线在下）**

把文件内容整个替换为：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="16" x2="12" y2="12"/>
  <line x1="12" y1="8" x2="12.01" y2="8"/>
</svg>
```

- [ ] **Step 3: 新增 alert-circle.svg（复用旧 info-circle 几何：竖线在上、点在下，即感叹号）**

新建文件，内容为：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>
```

- [ ] **Step 4: 重新生成 sprite**

```bash
pnpm --filter @repo/icons build
```

预期输出末尾一行包含新图标名，例如：

```
✓ 生成雪碧图：69 个图标 [..., alert-circle, ..., info-circle, ...]
```

- [ ] **Step 5: 校验生成结果**

```bash
grep -c 'id="icon-alert-circle"' packages/icons/src/generated/sprite.ts
grep -c '"alert-circle"' packages/icons/src/generated/types.ts
```

预期输出：两条命令都输出 `1`。

- [ ] **Step 6: 跑现有图标测试，确认未破坏既有用例**

```bash
pnpm test:run packages/icons/src/SvgIcon.test.tsx packages/icons/src/SvgSprite.test.tsx
```

预期：全部 PASS（这两个文件是通用渗透测试，断言的是 `home`/`user`/`search`/`menu` 等不受影响的图标，不需要新增专项用例）。

- [ ] **Step 7: 类型检查**

```bash
pnpm --filter @repo/icons check-types
```

预期：无报错。

- [ ] **Step 8: Commit**

```bash
git add packages/icons/svg/info-circle.svg packages/icons/svg/alert-circle.svg packages/icons/src/generated/sprite.ts packages/icons/src/generated/types.ts
git commit -m "$(cat <<'EOF'
feat(icons): 新增 alert-circle 图标并修正 info-circle 几何
EOF
)"
```

---

### Task 2: 重新设计 ToastRegion —— 毛玻璃卡片 + 图标芯片 + 宽度自适应

**Files:**

- Modify: `packages/ui/src/toast/toast.tsx`
- Modify: `packages/ui/src/toast/toast.test.tsx`

**Interfaces:**

- Consumes: Task 1 产出的 `IconName` 新成员 `"alert-circle"`；`@repo/icons` 现有 `SvgIcon`（`name`/`size`/`className` props 不变）；`packages/ui/src/lib/utils` 的 `cn`（未变）；`./types` 的 `ToastRegionProps`/`ToastType`（未变）。
- Produces: `ToastRegion` 组件对外接口完全不变（`{ queue, className }` props），仅内部渲染结构变化，对 `apps/web/app/providers/global-modals.tsx` 等调用方零影响。

- [ ] **Step 1: 更新测试文件到新断言（此时实现代码还没改，新增的断言应该失败）**

把 `packages/ui/src/toast/toast.test.tsx` 整个替换为：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastQueue } from "./toast";
import { ToastRegion } from "./toast";
import type { ToastContent } from "./types";

function makeQueue(...items: ToastContent[]) {
  const q = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });
  items.forEach((item) => q.add(item));
  return q;
}

describe("ToastRegion", () => {
  it("没有 toast 时不渲染任何消息文字", () => {
    const queue = makeQueue();
    render(<ToastRegion queue={queue} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("渲染 success toast 消息文字", () => {
    const queue = makeQueue({ message: "登录成功", type: "success" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("登录成功")).toBeInTheDocument();
  });

  it("渲染 error toast 消息文字", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("操作失败")).toBeInTheDocument();
  });

  it("不同类型渲染各自对应的图标", () => {
    const queue = makeQueue(
      { message: "登录成功", type: "success" },
      { message: "操作失败", type: "error" },
      { message: "测试通知", type: "info" },
    );
    const { container } = render(<ToastRegion queue={queue} />);
    const hrefs = Array.from(container.querySelectorAll("use")).map((el) =>
      el.getAttribute("href"),
    );
    expect(hrefs).toContain("#icon-check");
    expect(hrefs).toContain("#icon-alert-circle");
    expect(hrefs).toContain("#icon-info-circle");
  });

  it("error toast 的图标芯片使用 destructive 色调", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    const { container } = render(<ToastRegion queue={queue} />);
    const chip = container.querySelector('[role="alertdialog"] > span');
    expect(chip).toHaveClass("text-destructive");
  });

  it("容器宽度跟随内容，不是写死的固定像素宽度", () => {
    const queue = makeQueue({ message: "已置顶", type: "success" });
    render(<ToastRegion queue={queue} />);
    const toast = screen.getByText("已置顶").closest('[role="alertdialog"]');
    expect(toast?.className).not.toMatch(/\bw-\[\d/);
    expect(toast).toHaveClass("w-fit");
  });

  it("点击关闭按钮后 toast 消失", async () => {
    const user = userEvent.setup();
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("测试通知")).toBeInTheDocument();
    await user.click(screen.getByLabelText("关闭通知"));
    expect(screen.queryByText("测试通知")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认新断言按预期失败**

```bash
pnpm test:run packages/ui/src/toast/toast.test.tsx
```

预期：`不同类型渲染各自对应的图标`、`error toast 的图标芯片使用 destructive 色调`、`容器宽度跟随内容，不是写死的固定像素宽度` 这三条 FAIL（因为当前 `toast.tsx` 还没有图标、还是 `w-[320px]`）；其余 3 条（无 toast / success 文字 / error 文字 / 关闭交互）应仍然 PASS。

- [ ] **Step 3: 重写 toast.tsx**

把 `packages/ui/src/toast/toast.tsx` 整个替换为：

```tsx
"use client";

import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon, type IconName } from "@repo/icons";
import { cn } from "../lib/utils";
import type { ToastRegionProps, ToastType } from "./types";

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

const typeStyles: Record<ToastType, { icon: IconName; chipClass: string }> = {
  success: { icon: "check", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error: { icon: "alert-circle", chipClass: "bg-destructive/12 text-destructive" },
  info: { icon: "info-circle", chipClass: "bg-primary/12 text-primary" },
};

export function ToastRegion({ queue, className }: ToastRegionProps) {
  return (
    <AriaToastRegion
      queue={queue}
      className={cn(
        "fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 outline-none",
        className,
      )}
    >
      {({ toast }) => {
        const { icon, chipClass } = typeStyles[toast.content.type ?? "info"];

        return (
          <AriaToast
            toast={toast}
            className={cn(
              // [will-change:transform]：给每条 toast 独立 GPU 合成层，
              // 防止 hover 触发的 opacity 过渡污染 nav backdrop-filter 的合成上下文
              "flex w-fit min-w-[15rem] max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                chipClass,
              )}
            >
              <SvgIcon name={icon} size={15} />
            </span>
            <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed text-foreground">
              {toast.content.message}
            </AriaToastContent>
            <Button
              slot="close"
              aria-label="关闭通知"
              className="self-start flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SvgIcon name="close" size={12} />
            </Button>
          </AriaToast>
        );
      }}
    </AriaToastRegion>
  );
}
```

- [ ] **Step 4: 再次运行测试，确认全部通过**

```bash
pnpm test:run packages/ui/src/toast/toast.test.tsx
```

预期：7 条全部 PASS。

- [ ] **Step 5: 类型检查 + lint**

```bash
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui lint
```

预期：均无报错。

- [ ] **Step 6: 浏览器实测**

```bash
pnpm dev:web
```

打开 `http://localhost:3000` 任意文章详情页，在**未登录**状态下尝试提交评论（触发 `apps/web/hooks/use-comment-submit.ts:27` 的 `addToast("请先登录", "error")`）。

确认：

- 右下角出现毛玻璃质感卡片（半透明 + 背景模糊，能看到卡片背后内容的虚化），不是纯红色块。
- "请先登录"四个字不再撑满一条 320px 长条，卡片宽度贴合文字内容。
- 卡片左侧有一个红色调的圆形感叹号图标。
- 点击右上角关闭按钮，toast 消失。

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/toast/toast.tsx packages/ui/src/toast/toast.test.tsx
git commit -m "$(cat <<'EOF'
refactor(toast): 改用毛玻璃卡片与图标芯片，修复短消息宽度异常
EOF
)"
```

---

## Self-Review Notes

- **Spec 覆盖**：容器毛玻璃化 ✓（Task 2 Step 3）；图标芯片区分类型 ✓（同上）；宽度 `w-fit`+`min-w`+`max-w` ✓；`ToastRegion` 外层 `items-end` ✓；关闭按钮 `self-start` 固定右上角 ✓；入场动画复用 `animate-notification-enter` ✓；图标资源新增/修正 ✓（Task 1）；测试更新（去掉失效断言、补充图标/宽度断言）✓。`addToast` 调用方不变 —— 未安排任何调用方文件改动，符合"零影响"要求。
- **占位符扫描**：两个任务的每个 step 都给了完整代码/精确命令与预期输出，无 TBD/TODO。
- **类型一致性**：`typeStyles` 的 key（`success`/`error`/`info`）与 `ToastType`（`types.ts` 中 `"success" | "error" | "info"`）完全对应；`IconName` 新成员 `"alert-circle"` 由 Task 1 生成、Task 2 直接消费，命名一致。
