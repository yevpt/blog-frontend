# 消息中心批量选择悬浮栏优化 — 设计文档

日期：2026-07-09

## 背景

消息中心页面（`apps/web/components/notifications/notifications-page.tsx`）支持批量选择消息后统一标记已读。当前实现有三个问题：

1. 只能逐条点击 checkbox 选择，没有"全选""反选"。
2. 悬浮操作栏（`notification-selection-bar.tsx`）用的是 `sticky bottom-0`，跟随 `<main>` 文档流"贴底"，不是真正脱离文档流的悬浮卡片，视觉上不够独立、质感也和站内其它悬浮元素（`float-dock`）不统一。
3. 内部布局是简单的两端对齐（计数 + 标记已读 + 取消），没有为新增的全选/反选按钮做过响应式规划。

## 范围

- 仅调整 `apps/web/components/notifications/` 下的选择状态逻辑与 `NotificationSelectionBar` 组件。
- 全选/反选的作用范围**仅限当前已加载到虚拟列表中的消息**（`n.items`），不触发额外分页请求。
- 不改动后端接口、`markReadBatch` 逻辑本身。

## 设计

### 1. 全选/反选逻辑（`notifications-page.tsx`）

新增两个函数，操作对象是当前 `n.items`：

```ts
function selectAll() {
  setSelected(new Set(n.items.map((i) => i.id)));
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

派生状态：

```ts
const allSelected = n.items.length > 0 && selected.size === n.items.length;
```

"全选"在 UI 上做成一个三态 checkbox（未选 / 半选 indeterminate / 全选），点击行为是 toggle：

```ts
function toggleSelectAll() {
  setSelected(allSelected ? new Set() : new Set(n.items.map((i) => i.id)));
}
```

选择模式期间关闭全局悬浮 Dock，避免和新悬浮栏在移动端重叠：

```tsx
<FloatDockPageAnchor layout={NOTIFICATIONS_FLOAT_DOCK_LAYOUT} enabled={!selecting} />
```

### 2. 悬浮卡片定位与层级

`NotificationSelectionBar` 从 `sticky bottom-0`（文档流内）改为 `fixed` 悬浮卡片：

- 外层：`fixed inset-x-0 bottom-5 md:bottom-6 z-40 pb-[env(safe-area-inset-bottom)]`
  - `bottom-5 md:bottom-6` 沿用 `float-dock`（`site-float-dock.tsx`）已有的贴底间距节奏
  - `z-40` 与站内导航栏/悬浮 Dock 同级（`z-40`~`z-50` 区间），不触碰弹层专用的 `z-[200]+`
  - `pb-[env(safe-area-inset-bottom)]` 是项目里第一次引入安全区适配，避免 iPhone 底部手势条遮挡
- 内层：`mx-auto w-full max-w-2xl px-4`，与正文阅读列对齐，卡片不顶到屏幕边缘
- 卡片本身视觉质感对齐 `float-dock-styles.ts` 中 `floatDockOrbClass` 的做法：`ring-1` 描边 + `backdrop-blur-xl` + 暗色模式下切换到 `dark:bg-card/80` + 描边阴影，比现在单纯的 `bg-card/95 backdrop-blur` 更有悬浮感
- 因为悬浮栏脱离文档流，`notifications-page.tsx` 的 `<main>` 在 `selecting` 为真时追加底部 padding（如 `pb-24`），避免遮挡列表最后几条消息

### 3. 响应式内部布局

断点选 `sm`（640px）而非 `md`：实测这组按钮（全选 checkbox + 计数 + 反选 + 标记已读 + 取消）在手机宽度下单行排列容易挤到换行，而 `sm` 以下基本覆盖所有手机屏幕。

- **`sm` 以上**（平板/桌面）：单行 `flex items-center justify-between`
  - 左：全选 checkbox（indeterminate 支持半选态）+ `已选 N 条`
  - 右：反选 / 标记已读（主操作，保留高亮）/ 取消
- **`sm` 以下**（手机）：两行 `flex flex-col gap-2`
  - 第一行：全选 checkbox + `已选 N 条`
  - 第二行：反选 / 标记已读 / 取消，靠右对齐（`justify-end`）

图标与视觉一致性：

- "全选" 用原生 `<input type="checkbox">`，复用 `notification-card.tsx` 里已有的 `h-4 w-4 cursor-pointer accent-primary` 样式，因为 HTML checkbox 的半选态 `indeterminate` 是 DOM 属性而非 HTML attribute，需要通过 `ref` + `useEffect` 设置
- "反选" 项目图标库中没有合适的现成图标，做成纯文字按钮，与现有"取消"按钮风格一致
- "标记已读" 保留现有 `check` 图标

### 组件接口变更

`NotificationSelectionBarProps` 新增：

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

不需要单独传 `total`：`allSelected` 已经是页面层算好的派生值，组件只需要知道当前是否全选、以及半选态（`count > 0 && !allSelected` 推出 indeterminate）。

## 测试计划

- `notification-selection-bar.test.tsx`：补充全选 checkbox 的三态渲染（未选/半选/全选）、点击全选触发 `onToggleSelectAll`、点击反选触发 `onInvertSelect`，以及现有的计数/标记已读/取消用例保持通过
- `notifications-page.test.tsx`：补充 `selectAll`/`invertSelect`/`toggleSelectAll` 的行为用例（选中全部、部分选中后反选、全选后再次点击清空）

## 风险与边界情况

- 悬浮栏与全局悬浮 Dock（回顶按钮）的重叠通过 `selecting` 时禁用 Dock 解决，不需要额外的坐标计算
- `env(safe-area-inset-bottom)` 是项目首次引入，只影响这一个组件，不做全局适配改造
