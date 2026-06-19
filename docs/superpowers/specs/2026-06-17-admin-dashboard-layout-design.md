# Admin 后台框架（Shell）与概览仪表盘设计

**日期**: 2026-06-17
**状态**: 待确认

## 目标

为 `apps/admin` 设计一套现代化、支持浅色 / 深色主题的后台管理框架壳（app shell），替换当前无实际意义的 demo 首页。本次只做「框架壳 + 概览仪表盘 + 各管理模块占位页」，让整体导航与视觉先定调，后续再逐模块填充真实功能。

管理对象（菜单项）：文章、分类、标签、音乐、友链，并为未来更多模块预留扩展位。

本次范围包含：

- 左侧菜单栏 + 右侧主内容的整体布局壳（桌面持久侧栏 / 移动抽屉）。
- 顶部栏：页面标题、主题切换按钮、用户头像与退出。
- 概览仪表盘页：统计卡片 + 最近文章 + 快捷操作。
- 各管理模块（文章 / 分类 / 标签 / 音乐 / 友链）的占位内容页。
- 复用登录页已建立的主题方案（`system` / `light` / `dark`）。

本次范围不包含：

- 各模块的真实 CRUD 列表、表单与接口接入（数据先用静态占位 + `// TODO(api)`）。
- 富文本编辑器、上传等业务功能。
- 权限分级、菜单按角色过滤。

## 设计方向

延续登录页的「克制现代后台」风格：紫色主色（`#7c3aed` / 深色 `#a78bfa`）、zinc 中性色阶、低干扰边框、柔和阴影、适度圆角。不使用花哨渐变与装饰图形，强调清晰层级、稳定留白与明暗主题下都舒适的对比度。

布局采用经典的「左菜单 + 右内容」后台范式，并针对移动端优雅降级。

## 整体布局

### 桌面端（lg 及以上）

- 双栏：左侧持久侧栏 + 右侧内容区。
- 侧栏宽度 `248px`，可折叠为 `72px` 纯图标轨（icon rail），折叠状态记忆在 `localStorage`。
- 内容区 = 顶部栏（sticky）+ 滚动主体。
- 顶部栏与侧栏均使用 `bg-card` / 轻边框，与 `bg-background` 主体区分层次。

### 移动端（lg 以下）

- 侧栏默认隐藏；顶部栏左侧汉堡按钮（`menu` 图标）打开抽屉。
- 抽屉为左侧滑入面板 + 半透明遮罩（点击遮罩或选中菜单后关闭）。
- 顶部栏精简：汉堡 + 当前页标题 + 主题切换 + 头像。

### 区域语义

- 外层 `min-h-dvh bg-background text-foreground`。
- 侧栏、顶栏、卡片只用语义 token：`bg-card` `border-border` `text-muted-foreground` `bg-primary` 等，不写死颜色，深色由 token 自动适配。

## 侧栏（Sidebar）

自上而下：

1. **品牌区**：复用登录页的双色 logo（旋转水滴）+ `YEVPT`，下方小字 `管理后台`。折叠态只留 logo。
2. **导航区**：分组菜单
   - `概览` — `home` 图标，指向仪表盘。
   - 分组「内容」：`文章`（`pen`）、`分类`（新增 `folder` 图标）、`标签`（`tag`）。
   - 分组「站点」：`音乐`（`music`）、`友链`（`link`）。
   - 每项：图标 + 文本，激活态用 `bg-primary/10 text-primary` + 左侧/整块高亮；hover 用 `bg-foreground/[0.04]`。
   - 折叠态：只显示图标，hover 出 `Tooltip` 显示名称。
3. **底部用户区**：放在侧栏最下方，与导航以分隔线隔开。
   - 一行用户条：`Avatar` + `nickname` / `username` + `email`（来自 auth store 的 `UserResp`），右侧 `dots-vertical` / `chevron` 触发图标。
   - 点击该行向上弹出 `Dropdown` 菜单：`个人设置`（占位）与 `退出登录`（`log-out` 图标，destructive 语义）。
   - `退出登录` 执行 `logout()` 清空 token + 移除 `refresh_token` + 跳转 `/login`。
   - 用户区上方保留折叠 / 展开切换按钮（`chevron-left`），桌面端可见；折叠态用户条仅显示头像，点击仍可弹菜单。

> 「未来更多功能」通过在导航数组里追加配置项即可扩展，菜单数据结构化（`{ label, icon, path, group }`），不写死。

## 顶部栏（Topbar）

- 左：移动端汉堡 / 桌面端折叠按钮（可选）+ 当前页标题（如「概览」「文章管理」）。
- 右：主题切换按钮（页面级工具）。
  - 36px ghost 圆形，浅色显示 `sun`、深色显示 `moon`，点击在 light/dark 间切换；`aria-label` 描述当前与目标主题（与登录页 / web 端一致）。
- 顶栏不再放用户头像与退出（已移至侧栏底部）。

## 概览仪表盘（Dashboard）

首屏 `/` 路由内容：

1. **欢迎行**：`你好，{nickname}` + 一句说明，右侧放主操作按钮 `写文章`（`plus`）。
2. **统计卡片网格**：移动 1 列 / `sm` 2 列 / `xl` 4 列。卡片含图标徽章 + 数字 + 标题 + 轻量趋势/说明。指标：文章总数、分类数、标签数、音乐数、友链数（按布局取 4–5 个，静态占位数据）。
3. **最近文章**：`Card` 内一个轻量列表/表格（标题、状态 `Badge`、分类、更新时间、操作）。小屏 `overflow-x-auto` 横向滚动，不裁剪。
4. **快捷入口**：一组指向各管理模块的快捷卡片或按钮。

所有数字与列表均为静态占位，标注 `// TODO(api): 待后端提供 xxx`。

## 各管理模块占位页

文章 / 分类 / 标签 / 音乐 / 友链共用一套占位布局：

- 页面头：标题 + 简述 + 右侧 `新建` 主按钮（占位，不触发真实逻辑）。
- 主体：一个「功能建设中」空状态卡片（图标 + 文案 + 说明），保证视觉完整、不空洞。
- 复用同一个 `ModulePlaceholder` 组件，传入标题 / 图标 / 描述。

## 复用与组件清单

- 布局壳：`apps/admin/src/components/layout/`（`AdminLayout` `Sidebar` `Topbar` `UserMenu` `ThemeToggle` `SidebarNav`）。
- 复用 `@repo/ui`：`Button` `ButtonUtility` `Avatar` `Card` 系列 `Badge` `Dropdown` `Tooltip` `cn`。
- 图标：`@repo/icons` 的 `SvgIcon`；需**新增 `folder.svg`**（分类）到 `packages/icons/svg/` 并 `pnpm --filter @repo/icons build`。
- 路由：`react-router-dom` 嵌套路由，`AuthGuard` 下挂 `AdminLayout`（`<Outlet/>` 渲染各页）。
- 主题：复用现有 `providers/theme-provider.tsx` 的 `useTheme`。
- 单组件文件控制在 250 行内，超出拆子组件 / 抽 hook（如 `useSidebar` 管折叠 + 移动抽屉状态）。

## 文件影响（实现阶段）

- `apps/admin/src/App.tsx`：路由改为 `AdminLayout` 嵌套，挂载概览页与各占位页。
- `apps/admin/src/components/layout/*`：新增布局壳组件 + 测试。
- `apps/admin/src/pages/DashboardPage.tsx`：重做为概览仪表盘 + 测试。
- `apps/admin/src/pages/<module>/*` 或统一占位页组件 + 测试。
- `apps/admin/src/config/nav.ts`：菜单配置数据。
- `packages/icons/svg/folder.svg` + 重新 build。

## 测试（实现阶段，强制）

- `Sidebar` / `Topbar` / `UserMenu`：渲染、激活态、折叠切换、退出调用。
- `DashboardPage`：渲染统计卡片与最近文章占位。
- 主题切换按钮：点击切换 `html` class（沿用现有 provider 测试思路）。
- `pnpm --filter admin test` 与 `pnpm --filter admin check-types` 通过。

## 验收标准

- 浅色 / 深色主题下均无硬编码失配颜色，对比度舒适。
- 桌面端侧栏可折叠；移动端抽屉可开合，内容不溢出 / 不重叠。
- 头像菜单可退出登录并跳转 `/login`。
- 所有基础 UI 复用 `@repo/ui`，图标复用 `@repo/icons`。
- 菜单数据结构化，新增模块只需加配置。
