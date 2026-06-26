# Toast 通知重新设计

日期：2026-06-26

## 目标

重新设计全局右下角弹出的短暂提示 toast（`@repo/ui` `ToastRegion`，由 `apps/web/lib/toast.ts` 的 `addToast(message, type)` 触发），解决两个问题：

1. **视觉风格简陋且与全站不一致**：当前用纯色块区分类型（success 整片祖母绿底、error 整片红底），跟站内其他浮层元素（navbar、modal、float-dock、`notification-selection-bar`）统一使用的毛玻璃风格（`bg-card/95 + backdrop-blur + 软边框/软阴影`）明显割裂。
2. **宽度 bug**：容器写死 `w-[320px]`，"已置顶"这种两字短消息也被撑成一条贯穿大半屏幕的长条。

不在本期范围：`/notifications` 页面的站内通知列表（`notification-card.tsx`）；`ToastQueue` 的 `maxVisibleToasts`/`timeout` 等行为参数；`addToast` 调用方签名（保持不变，现有 ~30 处调用点不用改）。

## 现状

[`packages/ui/src/toast/toast.tsx`](../../../packages/ui/src/toast/toast.tsx) 容器：

```
flex w-[320px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg
```

配合按类型整片染色的 `typeStyles`，文字用白字/紫字。无图标，仅靠背景色区分 success/error/info。

`@repo/icons` 现有图标里有 `check`、`info-circle`，但**没有专用的错误/警告图标**；且 `info-circle.svg` 的几何实际是感叹号样式（竖线在上、点在下），不是常规 info 图标（应为点在上、竖线在下）。该图标当前在全站**无任何引用**，改动不影响现有页面。

## 决策

### 1. 容器：毛玻璃卡片

```
flex w-fit min-w-60 max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3
rounded-xl border border-border bg-card/95 px-4 py-3
shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter
```

- `w-fit` + `min-w-60`（240px 下限）+ `max-w-[min(22rem,...)]`（约 352px 上限，留出比原 320px 略宽的余量，减少长句换行频率）：短消息收紧到内容宽度，不再被撑宽；长消息封顶后正常换行。
- `bg-card/95 + backdrop-blur-xl + border-border + shadow-lg`：与 `float-dock-styles.ts` / `notification-selection-bar.tsx` 同款毛玻璃语言，`--color-card`/`--color-border` 已有 dark 模式覆盖，无需额外适配。
- `items-center` **保持不变**：图标位置/大小不受文字换行影响，维持原有居中视觉。
- `animate-notification-enter`：复用 [`apps/web/app/globals.css`](../../../apps/web/app/globals.css) 中已定义但目前无人引用的 `notificationEnter` 关键帧（淡入 + 轻微上移缩放），作为入场动画；已被 `prefers-reduced-motion` 媒体查询覆盖处理，无需额外适配。
- `[will-change:transform]` 沿用现有注释里说明的 GPU 合成层隔离用途（避免 hover 透明度过渡污染 nav 的 backdrop-filter 合成上下文），不删除。

### 2. 类型区分：左侧图标芯片

去掉整片色块，改成左侧圆形图标芯片（`size-7` / 28px，`shrink-0`，`items-center` 居中，大小位置不随内容变化）：

```ts
const typeStyles: Record<ToastType, { icon: IconName; chipClass: string }> = {
  success: { icon: "check", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error: { icon: "alert-circle", chipClass: "bg-destructive/12 text-destructive" },
  info: { icon: "info-circle", chipClass: "bg-primary/12 text-primary" },
};
```

配色风格对齐 `floatDockOrbPrimaryTintClass`（半透明色块 + 同色文字/图标）。消息文字统一改为 `text-foreground`（原按类型用白字/紫字，现在底色是中性卡片，不再需要）。

### 3. 关闭按钮：固定右上角，不随内容移动

容器是 `items-center`，若不处理，关闭按钮会跟图标一样随文字行数在垂直方向漂移。给关闭按钮单独加 `self-start`，使其与 `items-center` 的居中规则解耦，始终钉在卡片右上角：

```
self-start shrink-0 rounded-md p-1
text-muted-foreground transition-colors
hover:bg-accent hover:text-foreground
focus-visible:ring-2 focus-visible:ring-ring focus:outline-none
```

hover 样式对齐 `packages/ui` 内 icon-button 通用惯例（`button-utility.tsx` 的 `tertiary` 变体），替换原来的 `opacity-60/100` 写法；新增 `focus-visible` 环作为可达性兜底。

### 4. `ToastRegion` 外层容器：右对齐

`flex flex-col gap-2` 默认 `align-items: stretch`；为确保不同宽度的 toast 都贴齐右下角锚点而不是各自居中/拉伸，显式加 `items-end`：

```
fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 outline-none
```

### 5. 图标资源：新增 alert-circle，修正 info-circle

- 修正 [`packages/icons/svg/info-circle.svg`](../../../packages/icons/svg/info-circle.svg)：改为点在上、竖线在下的标准 info 几何（`<line x1="12" y1="16" x2="12" y2="12"/>` + `<line x1="12" y1="8" x2="12.01" y2="8"/>`）。该图标当前无引用，不影响现有页面。
- 新增 `packages/icons/svg/alert-circle.svg`：复用 info-circle 原来的几何（竖线在上、点在下，即感叹号），供 error 类型使用。
- 跑 `pnpm --filter @repo/icons build` 重新生成 sprite（`src/generated/sprite.ts` / `types.ts`）。

## 测试（按 AGENTS.md 强制）

更新 [`packages/ui/src/toast/toast.test.tsx`](../../../packages/ui/src/toast/toast.test.tsx)：

- 现有 "error toast 使用高对比度样式" 一条断言 `toHaveClass("bg-destructive")` / `toHaveClass("text-destructive-foreground")`，随整片色块被去掉而失效，改为断言图标芯片元素带 `bg-destructive/12` / `text-destructive`。
- 保留：无 toast 不渲染 / 渲染 success・error 消息文字 / 点击关闭按钮后消失。
- 新增一条：不同类型渲染对应图标（按 `name="check"` / `"alert-circle"` / `"info-circle"` 断言 `<use>` 的 `href`，或断言图标芯片 class）。

`packages/icons` 侧：现有 `SvgIcon.test.tsx` / `SvgSprite.test.tsx` 是通用快照/渗透测试，新增/改名图标后按现有用例模式跑一遍即可，无需新增专项用例。

## 影响范围

- `packages/ui/src/toast/toast.tsx` + `toast.test.tsx`
- `packages/icons/svg/info-circle.svg`（改内容）、`packages/icons/svg/alert-circle.svg`（新增）+ 重新 build
- 不改 `packages/ui/src/toast/types.ts`、`apps/web/lib/toast.ts`、任何调用 `addToast(...)` 的现有代码

## 风险

- `info-circle.svg` 几何修正属于"顺手修复"而非本次诉求的核心，已确认全站无引用，风险低。
- `animate-notification-enter` 此前未被使用，需在实现时确认 react-aria-components 的 `UNSTABLE_Toast` 退出（exit）逻辑不会因为新增入场动画类而等待不存在的退出动画卡住移除时机（仅加 enter 动画，不加 exit 动画，预期与现状一致地立即移除）。
