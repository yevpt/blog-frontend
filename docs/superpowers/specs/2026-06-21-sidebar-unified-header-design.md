# 首页右栏统一标题设计

日期：2026-06-21
范围：`apps/web` 首页右侧栏（碎语 / 最近来访 / 标签）三个模块的标题区统一。

## 背景

首页右栏三个模块的标题各自为政：

- **碎语**（`components/snippets/snippets-section.tsx`）：渐变 ✦ 方形图标 + `text-sm font-bold` 标题 + 右侧 28px 方形 shuffle 图标按钮；容器 `px-4 pt-4`。
- **最近来访**（`components/sidebar/recent-visitors.tsx`）：`<h3>` 用 `text-[11px] font-bold uppercase tracking-[0.09em] text-(--fg3)`，无图标无动作；容器 `p-[15px]`。
- **标签**（`components/sidebar/tags-cloud.tsx`）：直接用 `TagGroup` 的 `label`，几乎无样式；容器 `p-[15px]`。

字号、字重、大小写、内边距、有无图标/动作全部不一致。

## 目标

一套现代、克制的**纯文字**统一标题：左侧只用标题文字（无图标/竖条/圆点锚点），右侧为可选的统一动作槽。三个模块视觉完全对齐。

## 设计

### 共享组件 `SidebarSectionHeader`

新增 `apps/web/components/sidebar/sidebar-section-header.tsx`，三个模块复用，避免平行实现。

```tsx
interface SidebarSectionHeaderProps {
  title: string;
  action?: ReactNode; // 可选动作槽
}
```

结构：

```
<header className="flex items-center justify-between px-4 pt-4 pb-3">
  <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">{title}</h3>
  {action}
</header>
```

- **标题**：`text-sm font-bold tracking-[-0.01em] text-foreground`，sentence-case 中文。沿用碎语现有标题样式，作为唯一规范。
- **不显示任何计数**。
- **动作槽**：组件不规定内容，仅提供右对齐位置；动作的统一样式由下面的约定保证。

### 统一动作样式

右侧动作统一为灰色 ghost 文字链接，可带图标：

```
className="inline-flex items-center gap-1 text-[11px] text-(--fg3) transition-colors hover:text-primary"
```

各模块动作内容：

- **碎语**：`换一批` + `shuffle` 图标（替换现有的 28px 方形图标按钮）。
- **最近来访**：`查看更多` + `arrow-right` 图标。
- **标签**：`全部` + `arrow-right` 图标（可选；若无合适跳转目标则先不加）。

图标统一用 `SvgIcon`（`@repo/icons`），尺寸 `12`。

### 容器统一

三卡头部统一：

- 卡片容器：`rounded-2xl bg-card shadow-card`（标签/来访从 `p-[15px]` 改为内部分区内边距）。
- 头部内边距：`px-4 pt-4 pb-3`（由 `SidebarSectionHeader` 内置）。
- body 区单独控制自己的内边距，不再依赖卡片整体 `p-[15px]`。

### i18n

复用现有 key，仅按需新增：

- 标题：`home.snippets`（碎语，沿用首页 key）、`sidebar.recentVisitors`、`sidebar.tags`。
- 动作：`sidebar.viewMore`（已存在）。新增 `snippet.shuffle`（换一批）、`sidebar.viewAll`（全部，若标签加动作）。
- 同步更新 `apps/web/messages/zh.json` 与 `en.json`。

## 不在范围内

- 三个模块**底部**的 CTA 按钮行（碎语：发布/查看更多；来访：入驻 QQ 群/查看更多）保持不动。
- 不改三个模块的内容主体（碎语卡片、来访头像网格、标签云）。
- 不改其它页面（如 `/snippets` 独立页）的标题。

## 测试

- `sidebar-section-header.test.tsx`：渲染 title、有/无 action 两种情况。
- 更新 `recent-visitors.test.tsx`、`tags-cloud.test.tsx`、`snippets-section.test.tsx`：标题文案断言改为新结构；碎语断言 shuffle 动作存在。
- 必要时更新 `app/page.test.tsx` 对侧栏标题的断言。

## 风险

- 碎语移除渐变图标后视觉变轻——这是选定的纯文字方向的预期结果。
- shuffle 从图标按钮变文字链接，需确认现有点击逻辑（目前为占位，无 onClick）迁移后仍为占位或保留原行为。
