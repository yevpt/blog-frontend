# admin 架构统一 — 设计文档

> 日期：2026-06-20
> 范围：定义 admin（`apps/admin`）的目标模块结构与约定，并把现有「文章」模块迁移成符合新约定的参考样板；沉淀为一个 skill 供后续 AI 自动遵循。

## 背景与问题诊断

`apps/admin` 是 Vite + React Router 的 SPA（与 `apps/web` 的 Next.js 不同）。当前结构存在 4 个病根：

1. **缺少模块模板**：6 个业务模块里只有「文章」是真实实现，其余 5 个（分类/标签/音乐/友链/置顶/编辑器）塞在 `src/pages/module-pages.tsx` 里用 `ModulePlaceholder` 占位。它们逐个真实化时这个 barrel 必须被拆掉，且没有「一个真实模块该长什么样」的范式。
2. **单功能代码打散到 3 个顶层目录**：文章 = `pages/ArticlesPage.tsx` + `pages/articles-page-data.ts` + `hooks/use-admin-article-list.ts` + `hooks/use-admin-article-filter-options.ts`。模块从 1 涨到 6 后，`hooks/` 会变成几十个扁平文件。
3. **命名不统一**：组件 PascalCase 与非组件 kebab-case 混在同一 `pages/` 目录；`articles-page-data.ts` 一个文件混装类型 + 状态映射 + 排序配置 + DTO mapper 四类东西。
4. **加模块要改 4~5 处**：`config/nav.ts`、`App.tsx` 路由、page、data、hooks，且 nav 项（6）与路由数（含 new/pinned/edit）对不上，没有单一事实来源。

对照：`apps/web` 的 `components/` 已按 feature 分子目录（articles/comments/navbar…），admin 反而没有这个约定。

核心结论：**问题不是代码质量，而是缺一套可复制的模块结构约定。** 本设计建立该约定，并迁移文章模块作样板。

## 决策

- **交付范围**：定约定 + 迁移文章作样板。5 个占位模块按新约定**重新落位**（把定义从 barrel 拆进各自文件夹），但不接后端、不做新 CRUD 功能。
- **结构风格**：A+C 融合 = feature 文件夹（代码聚合）+ 类型化模块注册表（nav/路由单一事实来源）。
- **约定载体**：新建 `.agents/skills/building-admin-module/SKILL.md`。

## 目标目录结构

```
apps/admin/src/
  app/
    App.tsx              # 只组装 providers + Router，渲染派生路由
    routes.tsx           # 从 modules 注册表生成 <Route> 树
  modules/               # 命名用 "modules"，与 nav 的「模块」心智、skill 名一致
    articles/
      ArticlesPage.tsx
      components/         # ArticleDeleteButton / ArticleStatusBadge（原内联，拆出）
      hooks/             # use-article-list / use-article-filter-options
      model.ts           # 类型 + 状态映射 + 排序配置 + DTO mapper（原 articles-page-data.ts）
      module.ts          # 本模块的 nav 项 + 路由定义
      index.ts
    dashboard/  categories/  tags/  music/  links/   # 各含 Page + module.ts
  components/
    layout/              # 共享外壳（Sidebar / AdminLayout 等，保持）
    AuthGuard.tsx
    ModulePlaceholder.tsx  # 共享占位组件（从 pages/ 上移）
  config/modules.ts      # 汇总所有 module.ts → 单一注册表
  lib/ · store/ · providers/   # 保持不变
```

迁移完成后 `src/pages/` 与 `src/pages/module-pages.tsx` 彻底删除；`src/config/nav.ts` 删除（由注册表派生）。

## 模块契约 + 注册表（C 的核心）

每个 `modules/<x>/module.ts` 导出一个 `AdminModule`：

```ts
interface AdminModule {
  id: string;
  nav?: AdminNavItem; // 进侧边栏的模块给 nav；子路由(new/edit/pinned)不给
  routes: AdminRoute[]; // 本模块贡献的全部路由（含子路由）
}

interface AdminRoute {
  path?: string; // 省略 + index:true 表示 index 路由
  index?: boolean;
  element: ReactElement;
}
```

`AdminNavItem` 沿用现有定义（`label / icon / path / group? / description`）。

`config/modules.ts` 收集所有模块，派生两样单一事实来源：

```ts
export const adminModules: AdminModule[] = [
  dashboardModule,
  articlesModule,
  categoriesModule,
  tagsModule,
  musicModule,
  linksModule,
];

// 取代手写的 config/nav.ts
export const adminNavItems = adminModules.flatMap((m) => (m.nav ? [m.nav] : []));
// 供 app/routes.tsx 消费
export const adminRoutes = adminModules.flatMap((m) => m.routes);
```

`getNavItemByPath` 改为基于派生的 `adminNavItems` 实现（行为不变）。`app/routes.tsx` 遍历 `adminRoutes` 生成嵌套在 `AdminLayout` 下的 `<Route>`；`/login` 与 `*` 兜底保留在 `App.tsx`/`routes.tsx` 的外壳层。

→ 加模块 = 新建一个文件夹 + 在 `adminModules` 数组加一项；nav 与路由不再可能对不上。

## 文章迁移映射（样板）

| 旧                                                                            | 新                                                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/ArticlesPage.tsx`（含内联 `ArticleDeleteButton`/`ArticleStatusBadge`） | `modules/articles/ArticlesPage.tsx` + `modules/articles/components/{ArticleDeleteButton,ArticleStatusBadge}.tsx`                      |
| `pages/articles-page-data.ts`                                                 | `modules/articles/model.ts`                                                                                                           |
| `hooks/use-admin-article-list.ts`                                             | `modules/articles/hooks/use-article-list.ts`（去 `admin-` 前缀）                                                                      |
| `hooks/use-admin-article-filter-options.ts`                                   | `modules/articles/hooks/use-article-filter-options.ts`                                                                                |
| `pages/DashboardPage.tsx`                                                     | `modules/dashboard/DashboardPage.tsx`                                                                                                 |
| `pages/module-pages.tsx` 中 5 个占位                                          | 各模块 `modules/<x>/<X>Page.tsx`（渲染共享 `ModulePlaceholder`）+ `module.ts`；articles 的子页 Pinned/Editor 归入 `modules/articles/` |
| `pages/LoginPage.tsx`                                                         | 留在 `app/`（登录是外壳路由，不进 nav）                                                                                               |
| `pages/ModulePlaceholder.tsx`                                                 | `components/ModulePlaceholder.tsx`                                                                                                    |
| `config/nav.ts`                                                               | 删除，由 `config/modules.ts` 派生                                                                                                     |

约束：

- **所有 `.test` 文件随源文件同步移动/改名**（AGENTS.md 强制：改 Hook/组件/页面必须有对应测试）。
- 重命名 hook 时去掉 `admin-` 前缀（已在 `modules/articles/` 下，admin 语境自明），同步更新 hook 内部及测试中的命名。
- 所有受影响的 import 路径更新；迁移属纯结构调整，**不改变任何运行时行为**。

## Skill 交付物

新建 `.agents/skills/building-admin-module/SKILL.md`，内容：

- 模块文件夹骨架（Page / components / hooks / model.ts / module.ts / index.ts）
- `AdminModule` / `AdminRoute` 契约
- 注册步骤（在 `config/modules.ts` 的 `adminModules` 加一项）
- 命名规则（组件 PascalCase 文件、hook `use-*.ts`、模块目录小写）
- 测试要求（每个 Page/组件/hook 配 `.test`）
- 「新增 admin 模块」复制粘贴清单

接线：本仓库 skill 靠 AGENTS.md「按场景读 skill」清单被发现。需在 `apps/admin/AGENTS.md`（若无则根 `AGENTS.md`）该清单加一行指针，如「写 admin 模块/页面 → `building-admin-module`」。这是「建 skill」在本仓库的固有接线，不算额外交付。

## 测试与验证

- `pnpm --filter admin check-types`、`pnpm --filter admin lint`、`pnpm --filter admin test` 全部通过。
- preview 启动 admin，确认：侧边栏导航项与分组不变；`/`、`/articles`、`/articles/new`、`/articles/pinned`、`/articles/:id/edit`、`/categories`、`/tags`、`/music`、`/links`、`/login` 均正常渲染；文章列表的搜索/筛选/排序/删除/分页行为不变。

## 非目标（YAGNI）

- 不为占位模块接入后端或实现 CRUD。
- 不引入路由懒加载（`React.lazy`）——当前应用体量无需，保持 eager import 以降低复杂度。
- 不改动 `apps/web` 或 `packages/*`。
- 不调整鉴权、主题、toast 等既有外壳逻辑，仅做文件落位。
