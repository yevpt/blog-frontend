# 交接文档：Admin 后台框架壳 + 概览仪表盘实现

**日期**: 2026-06-17
**阶段**: 设计已定稿（spec + mockup 已用户确认），待 React 实现
**面向**: 接手实现的新会话

---

## 0. 一句话任务

把 `apps/admin` 当前无意义的 demo 首页，替换为一套现代化、支持浅/深色主题的后台管理框架：**左侧菜单 + 右侧内容**，用于管理文章、分类、标签、音乐、友链（及未来更多模块）。本期只做**框架壳 + 概览仪表盘 + 各模块占位页**，数据用静态占位，不接真实 CRUD 接口。

---

## 1. 已完成（不要重做）

- ✅ 设计 spec：`docs/superpowers/specs/2026-06-17-admin-dashboard-layout-design.md`（**实现前必读，是唯一事实源**）
- ✅ HTML mockup：`docs/superpowers/mockups/admin-dashboard-demo.html`（最终视觉/交互参照，含明暗主题、移动抽屉、侧栏底部用户区的可运行 demo）
- ✅ 截图（已与用户确认通过）：
  - `docs/superpowers/mockups/admin-dashboard-demo-desktop.png`（桌面浅色）
  - `docs/superpowers/mockups/admin-dashboard-demo-dark.png`（桌面深色）
  - `docs/superpowers/mockups/admin-dashboard-demo-mobile.png`（移动概览）
  - `docs/superpowers/mockups/admin-dashboard-demo-mobile-nav.png`（移动抽屉，底部用户区）
- ✅ 主题能力已存在（上个任务交付，已在工作区）：`apps/admin/src/providers/theme-provider.tsx`（`ThemeProvider` / `useTheme` / `ThemeMode` / `ResolvedTheme`），`apps/admin/index.html` 已含首屏防闪烁脚本。**直接复用，勿重写。**

> 查看 mockup：`python3 -m http.server 8777 --directory <仓库绝对路径>/docs/superpowers/mockups`，浏览器开 `http://127.0.0.1:8777/admin-dashboard-demo.html`。注意 shell cwd 会跨命令保持，用**绝对路径**避免踩坑。

---

## 2. 用户确认过的关键决策

1. **范围**：只做框架壳 + 概览仪表盘 + 各模块占位页；数据静态占位 + `// TODO(api)`。不做真实列表/表单/接口。
2. **布局**：左菜单 + 右内容。桌面持久侧栏（可折叠为图标轨）；移动端侧栏变抽屉 + 遮罩。
3. **用户头像 + 退出登录 放在侧栏底部**（不在顶栏）。顶栏右侧只保留**主题切换按钮**。
4. **视觉**：延续登录页风格——紫色主色、zinc 中性、低干扰边框、柔和阴影、适度圆角；全程语义 token，无硬编码颜色。
5. 分类菜单需要**新增 `folder` 图标**到 `@repo/icons`（现有图标库没有）。用户已同意。

---

## 3. 必读规范（仓库强约束）

- `AGENTS.md`（根）+ `apps/admin/AGENTS.md`：纯 CSR SPA，禁 `'use client'`/Next 指令；用 `import.meta.env` 非 `process.env`；数据获取用 React Query 或 `useEffect`，全局态用 Zustand；移动优先响应式，表格小屏 `overflow-x-auto`。
- skill `building-ui`（`.claude/skills/building-ui/SKILL.md`）：**复用优先**，基础 UI 一律从 `@repo/ui` 具名导入；图标只用 `@repo/icons` 的 `SvgIcon`（禁内联 svg / 第三方图标库）；样式只用 Tailwind + 语义 token + `cn`；禁 `any`；单组件文件 > 250 行要拆。
- skill `writing-tests`：admin 测试环境 `happy-dom`，组件 `*.test.tsx`、Hook `*.test.ts`；mock 配方见该 skill。**改组件/页面/Hook 必须配测试，缺测=未完成。**
- skill `git-commit`：提交信息格式（中文 subject，Conventional Commits），有 `commit-msg` 钩子强校验。**只有用户明确要求时才提交。**

---

## 4. 设计令牌与可复用资产（避免重复发现）

- 设计 token 定义在 `packages/styles/src/base.css`，Tailwind 工具类：`bg-background` `text-foreground` `bg-card` `text-muted-foreground` `border-border` `bg-primary` `text-primary` `bg-destructive` 等。深色由 `.dark` 变体自动适配。主色：浅 `#7c3aed` / 深 `#a78bfa`。
- `@repo/ui` 导出（见 `packages/ui/src/index.ts`）可用：`Button` `ButtonUtility` `Avatar` `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` `Badge` `Dropdown` `Tooltip`/`TooltipTrigger` `cn`。**头像菜单优先用 `Dropdown`，气泡提示用 `Tooltip`。**
- `@repo/icons` 现有图标（`ls packages/icons/svg/`）可直接用：`home`（概览）、`pen`/`edit`（文章）、`tag`（标签）、`music`（音乐）、`link`（友链）、`log-out`（退出）、`sun`/`moon`（主题）、`menu`（汉堡）、`dots-vertical`（用户条触发）、`chevron-left`/`chevron-right`（折叠/箭头）、`plus`（新建）、`user`（个人设置）。**缺 `folder`（分类）需新增。**
- 品牌 logo：登录页 `apps/admin/src/pages/LoginPage.tsx` 里的 `BrandMark`（双色旋转水滴 svg），可抽出复用。
- auth store：`apps/admin/src/store/auth.ts` —— `useAuthStore` 有 `user`（`UserResp`）、`logout()`。`UserResp` 字段：`{ id, username, email?, nickname?, roles? }`（见 `packages/api/src/types/auth.ts`）。退出还需 `localStorage.removeItem("refresh_token")` 并跳 `/login`（参考登录流程）。
- 现有路由（`apps/admin/src/App.tsx`）：`BrowserRouter` + `AuthGuard`（`apps/admin/src/components/AuthGuard.tsx`，用 `<Outlet/>`）。`/login` 公开，其余在 `AuthGuard` 下。`ToastRegion` + `toastQueue`（`apps/admin/src/lib/toast.ts`）。

---

## 5. 实现蓝图（建议结构）

> 以 mockup 为视觉/交互基准；以下文件名为建议，可按实际命名习惯微调。

### 5.1 新增 `folder` 图标

1. 新建 `packages/icons/svg/folder.svg`（线性风格，1.85 stroke，viewBox 24，参照 mockup 里的 folder 路径：`M3 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z`）。
2. `pnpm --filter @repo/icons build`，提交生成产物。
3. 确认 `SvgIcon` 的 `name` 类型已含 `"folder"`。

### 5.2 菜单配置

- `apps/admin/src/config/nav.ts`：导出结构化数组 `{ label, icon, path, group, badge? }`。分组：概览（无组）/ 内容（文章·分类·标签）/ 站点（音乐·友链）。路由 path：`/`、`/articles`、`/categories`、`/tags`、`/music`、`/links`。

### 5.3 布局壳 `apps/admin/src/components/layout/`

- `AdminLayout.tsx`：整体两栏 + `<Outlet/>`；持有侧栏折叠 / 移动抽屉状态（抽到 `useSidebar` hook，含 `localStorage` 记忆折叠态）。
- `Sidebar.tsx`：品牌区 + `SidebarNav` + 底部 `SidebarUser`。
- `SidebarNav.tsx`：按 `nav.ts` 渲染分组菜单，激活态用 `NavLink` + 语义高亮；折叠态只显图标 + `Tooltip`。
- `SidebarUser.tsx`：底部用户条（`Avatar` + nickname/username + email + `dots-vertical`），点击用 `Dropdown` 向上弹「个人设置（占位）/ 退出登录」。退出调用 `logout()` + 清 refresh_token + `navigate('/login')`。
- `Topbar.tsx`：移动端汉堡（`menu`）+ 当前页标题 + 右侧 `ThemeToggle`。
- `ThemeToggle.tsx`：可直接复用登录页里的实现（`useTheme`，sun/moon，`aria-label` 描述当前/目标主题）。
- 移动抽屉：遮罩 + 滑入；选中菜单或点遮罩关闭。

### 5.4 概览页 `apps/admin/src/pages/DashboardPage.tsx`

- 欢迎行（`你好，{nickname}` + `写文章` 主按钮）→ 统计卡片网格（移动 1 / sm 2 / xl 4）→ 最近文章 `Card`（轻量表格，小屏 `overflow-x-auto`）+ 快捷入口 `Card`。
- 全部静态占位数据，标 `// TODO(api): 待后端提供 xxx`。卡片/徽标用 `Card`/`Badge`。

### 5.5 模块占位页

- 统一 `ModulePlaceholder` 组件（props：`title` / `icon` / `description`），页面头（标题+简述+占位「新建」按钮）+「功能建设中」空状态卡。
- 文章/分类/标签/音乐/友链各自薄页面调用它。

### 5.6 路由接线 `apps/admin/src/App.tsx`

- `AuthGuard` 下挂 `AdminLayout`，其子路由渲染 `DashboardPage`（index）与各占位页。保留 `/login` 与静默续期 `AuthInit`、`ToastRegion` 不动。

---

## 6. 测试要求（强制）

- `SidebarNav`：渲染全部菜单项、激活态正确。
- `SidebarUser`：渲染用户信息；点退出调用 `logout()` 并跳转（mock `useNavigate`）。
- `ThemeToggle`：点击切换 `html` class（参考 `theme-provider.test.tsx` 思路）。
- `useSidebar`：折叠开合 + localStorage 记忆。
- `DashboardPage` / `ModulePlaceholder`：渲染关键文案与占位区块。
- mock 配方（apiClient、MemoryRouter、zustand 复位）见 `writing-tests` skill。

---

## 7. 验收 / 收尾

- [ ] 浅/深主题均无硬编码失配色；移动+桌面不溢出/不重叠。
- [ ] 桌面侧栏可折叠；移动抽屉可开合；侧栏底部用户菜单可退出登录并跳 `/login`。
- [ ] 全部基础 UI 复用 `@repo/ui`，图标用 `@repo/icons`（含新增 `folder`）。
- [ ] `pnpm --filter admin test` 通过。
- [ ] `pnpm --filter admin check-types` 通过。
- [ ] 视觉与 `admin-dashboard-demo.html` 一致（可再起静态服务器对照）。
- 提交：仅在用户明确要求时进行，遵循 `git-commit` skill。

---

## 8. 易踩坑提醒

- shell cwd 跨命令保持；起静态服务器/路径操作一律用**绝对路径**。
- 截图工具：浏览器视口被固定约 1024 宽，需用 CDP `Emulation.setDeviceMetricsOverride` 设宽（桌面 1440 / 移动 402），再 `Page.captureScreenshot`（base64 存在返回 JSON 的顶层 `data` 或 `result.data`，自行解码为 png）。
- 截图前确认下拉菜单状态符合预期（之前误把用户菜单留在展开态，导致深色图底部出现「异常横块」误会）。
- 主题/防闪烁逻辑已存在，别重复实现；只复用 `useTheme`。
