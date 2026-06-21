# 首页右栏底部按钮统一设计

日期：2026-06-21
范围：`apps/web` 首页右侧栏「碎语」「最近来访」两个模块**底部 CTA 按钮行**的统一。

## 背景

上一轮 [`2026-06-21-sidebar-unified-header-design.md`](2026-06-21-sidebar-unified-header-design.md) 统一了三个模块的**标题区**（纯文字、克制），并明确把**底部按钮行**留在范围之外。当前底部仍是两套各自为政、且偏旧的设计：

- **碎语**（`components/snippets/snippets-section.tsx`）：渐变填充主按钮（`bg-gradient-to-r from-primary` + 阴影 + `font-semibold`）+ 描边 ghost「查看更多 →」。视觉厚重。
- **最近来访**（`components/sidebar/recent-visitors.tsx`）：两个 `rounded-full` 胶囊（`h-8 text-[11px]`，outline + ghost）「加入 QQ 群」「查看更多」。

字重、圆角、填充、份量全不一致，且都与新标题确立的「现代克制」语言冲突。

## 目标

一套与新标题语言一致的**双等宽扁平描边按钮**底部行，两模块完全对齐：去掉渐变 / 阴影 / 胶囊，主操作用淡主色底承载、次操作（查看更多）透明描边、hover 才浮出底色。

## 设计

### 共享组件 `sidebar-section-footer.tsx`

新增 `apps/web/components/sidebar/sidebar-section-footer.tsx`，延续 `SidebarSectionHeader` / `SidebarSectionAction` 的粒度，导出两个件，两模块复用，避免平行实现。

#### `SidebarSectionFooter`（布局容器）

```tsx
interface SidebarSectionFooterProps {
  children: ReactNode;
}
```

结构：`<div className="flex gap-2 px-4 py-3">{children}</div>`

- 无顶部分隔线——按钮自身边框已界定区域，保持轻量（与选定的 mockup 一致）。

#### `SidebarFooterButton`（带 tone 的按钮）

薄封装 `@repo/ui` 的 `Button`，统一尺寸 `flex-1 h-8 rounded-md text-xs`，按 `tone` 切换样式。

```tsx
type SidebarFooterButtonProps = ButtonProps & {
  tone: "primary" | "ghost";
};
```

- `tone="primary"`（主操作）：淡主色底 `bg-primary/10 text-primary border border-primary/20`，`hover:bg-primary/15`；前置图标 12px。
- `tone="ghost"`（查看更多）：透明底 `border border-border text-(--fg2)`，`hover:bg-accent hover:text-foreground`；后置 `arrow-forward` 图标 12px。

> 注：`@repo/ui` 现有 `Button` 变体（default/outline/ghost/text）无「淡主色底」一档，故用 `variant` 基础 + `className` 覆盖实现，不改动 `@repo/ui` 包。圆角统一 `rounded-md`（8px），不再用 `rounded-full` / `rounded-xl`。

### 两模块底部内容

均为 `[主操作] | [查看更多]` 等宽两栏：

- **碎语**：`发布新碎语`（`tone="primary"`，前置 `plus`） · `查看更多`（`tone="ghost"`，后置 `arrow-forward`）。
- **最近来访**：`加入 QQ 群`（`tone="primary"`，前置 `qq`） · `查看更多`（`tone="ghost"`，后置 `arrow-forward`）。

两模块都改用 `SidebarSectionFooter` + `SidebarFooterButton`，删除各自手写的渐变 / 胶囊 className。

### 图标

全部已存在于 `@repo/icons` sprite，**无需新增 svg**：`plus`、`qq`、`arrow-forward`。统一 `SvgIcon` `size={12}`。

### i18n

复用现有 key，无新增：`snippet.postNew`、`snippet.viewMore`、`sidebar.joinQQ`、`sidebar.viewMore`。

### 导出

`components/sidebar/index.ts` 追加 `SidebarSectionFooter`、`SidebarFooterButton`。

## 不在范围内

- 不动卡片主体：碎语卡片堆叠、来访头像网格、标签云。
- 不动标题区（上一轮已完成）。
- 不动其它页面（如 `/snippets` 独立页）。
- 不改动 `@repo/ui` 的 `Button` 组件本身。

## 测试

- 新增 `sidebar-section-footer.test.tsx`：① `SidebarSectionFooter` 渲染子节点；② `SidebarFooterButton` 两种 tone 的关键 className / 结构；③ 点击触发 `onPress`/`onClick`；④ 传 `href` 时渲染为链接。
- 更新 `snippets-section.test.tsx`：底部断言改为「发布新碎语 / 查看更多」新结构。
- 更新 `recent-visitors.test.tsx`（若有底部断言）：改为新结构。

## 风险

- 现有底部按钮多为占位（无 `onClick` / `href`）；迁移后保持占位或沿用原行为，不引入新跳转逻辑。
- 「加入 QQ 群」「发布新碎语」+「查看更多」等宽时中文字数不同，flex-1 下两侧留白略有差异——属可接受的对称取舍。
