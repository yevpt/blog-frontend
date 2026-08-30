# admin 架构统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `apps/admin` 重构为「feature 文件夹 + 类型化模块注册表」结构，并将「文章」模块迁移成参考样板，沉淀为 skill 供后续 AI 遵循。

**Architecture:** 每个业务模块自包含于 `src/modules/<x>/`（Page + components + hooks + model + module 定义）；`src/config/modules.ts` 汇总所有模块定义，派生出 nav 项与路由两个单一事实来源；`src/app/routes.tsx` 据此生成 `<Route>`。

**Tech Stack:** Vite · React 19 · React Router 7 · TypeScript · Zustand · Vitest · `@repo/ui`/`@repo/api`/`@repo/icons`。

> **重构性质说明：** 本计划绝大多数任务是**纯文件迁移 + import 重写**，不改变任何运行时行为。因此验证方式是「迁移后跑现有测试 + check-types，期望全绿」，而非先写失败测试的标准 TDD。仅 Task 5 引入新逻辑（注册表派生），需补新测试。每个任务结束时仓库必须 `check-types` 通过、相关测试通过，并独立 commit。
>
> 所有命令在仓库根目录执行。常用：
>
> - `pnpm --filter admin check-types`
> - `pnpm --filter admin test`
> - `pnpm --filter admin lint`

---

## File Structure（迁移后目标）

```
apps/admin/src/
  app/
    routes.tsx                         # 新建：从注册表生成 <Route>
    LoginPage.tsx                      # 由 pages/ 迁入
    LoginPage.test.tsx
  modules/
    articles/
      ArticlesPage.tsx                 # 由 pages/ 迁入（拆出两组件）
      ArticlesPage.test.tsx
      PinnedArticlesPage.tsx           # 由 module-pages.tsx 拆出
      ArticleEditorPage.tsx            # 由 module-pages.tsx 拆出
      components/
        ArticleStatusBadge.tsx         # 由 ArticlesPage 内联拆出
        ArticleDeleteButton.tsx        # 由 ArticlesPage 内联拆出
      hooks/
        use-article-list.ts            # 由 hooks/use-admin-article-list.ts 迁入改名
        use-article-list.test.ts
        use-article-filter-options.ts
        use-article-filter-options.test.ts
      model.ts                         # 由 pages/articles-page-data.ts 迁入
      model.test.ts
      module.tsx                       # 新建：本模块 nav + routes 定义
    dashboard/
      DashboardPage.tsx                # 由 pages/ 迁入
      DashboardPage.test.tsx
      module.tsx
    categories/  tags/  music/  links/ # 各：<X>Page.tsx + module.tsx
  components/
    layout/ ...                        # 不变
    AuthGuard.tsx                      # 不变
    ModulePlaceholder.tsx              # 由 pages/ 上移
    ModulePlaceholder.test.tsx
  config/
    module-types.ts                    # 新建：AdminNavItem / AdminRoute / AdminModule 契约
    modules.ts                         # 新建：注册表 + 派生 adminNavItems/adminRoutes
    modules.test.ts
  lib/ store/ providers/               # 不变
```

迁移后删除：`src/pages/`（整目录）、`src/config/nav.ts`。

---

## Task 1: 迁移 articles 的 model 与 hooks

把数据层与 hooks 移入 `modules/articles/`，此时 `ArticlesPage` 仍在 `pages/`，仅更新其 import 指向新位置（临时跨目录引用，Task 2 收口）。

**Files:**

- Move: `apps/admin/src/pages/articles-page-data.ts` → `apps/admin/src/modules/articles/model.ts`
- Move: `apps/admin/src/pages/articles-page-data.test.ts` → `apps/admin/src/modules/articles/model.test.ts`
- Move: `apps/admin/src/hooks/use-admin-article-list.ts` → `apps/admin/src/modules/articles/hooks/use-article-list.ts`
- Move: `apps/admin/src/hooks/use-admin-article-list.test.ts` → `apps/admin/src/modules/articles/hooks/use-article-list.test.ts`
- Move: `apps/admin/src/hooks/use-admin-article-filter-options.ts` → `apps/admin/src/modules/articles/hooks/use-article-filter-options.ts`
- Move: `apps/admin/src/hooks/use-admin-article-filter-options.test.ts` → `apps/admin/src/modules/articles/hooks/use-article-filter-options.test.ts`
- Modify: `apps/admin/src/pages/ArticlesPage.tsx`（hooks/model import 路径）
- Modify: `apps/admin/src/pages/ArticlesPage.test.tsx`（mock 与类型 import 路径）

- [ ] **Step 1: 用 git mv 移动 6 个文件**

```bash
cd apps/admin
mkdir -p src/modules/articles/hooks
git mv src/pages/articles-page-data.ts src/modules/articles/model.ts
git mv src/pages/articles-page-data.test.ts src/modules/articles/model.test.ts
git mv src/hooks/use-admin-article-list.ts src/modules/articles/hooks/use-article-list.ts
git mv src/hooks/use-admin-article-list.test.ts src/modules/articles/hooks/use-article-list.test.ts
git mv src/hooks/use-admin-article-filter-options.ts src/modules/articles/hooks/use-article-filter-options.ts
git mv src/hooks/use-admin-article-filter-options.test.ts src/modules/articles/hooks/use-article-filter-options.test.ts
cd ../..
```

- [ ] **Step 2: 修正 model.test.ts 的 import**

`model.test.ts` 内 `from "./articles-page-data"` 改为 `from "./model"`（描述文本里的 `"articles-page-data helpers"` 字样可保留，不影响）。

- [ ] **Step 3: 修正 use-article-list.ts 内部 import**

将顶部：

```ts
import { apiClient } from "../lib/api";
import {
  DEFAULT_ARTICLE_TABLE_SORT,
  mapAdminArticleToRow,
  parseOptionalIdFilter,
  toArticleListSortBy,
  toArticleListSortOrder,
  type ArticleRow,
  type ArticleTableSort,
} from "../pages/articles-page-data";
```

改为：

```ts
import { apiClient } from "../../../lib/api";
import {
  DEFAULT_ARTICLE_TABLE_SORT,
  mapAdminArticleToRow,
  parseOptionalIdFilter,
  toArticleListSortBy,
  toArticleListSortOrder,
  type ArticleRow,
  type ArticleTableSort,
} from "../model";
```

- [ ] **Step 4: 修正 use-article-filter-options.ts 内部 import**

```ts
import { apiClient } from "../lib/api";
import { buildIdFilterOptions, type FilterOption } from "../pages/articles-page-data";
```

改为：

```ts
import { apiClient } from "../../../lib/api";
import { buildIdFilterOptions, type FilterOption } from "../model";
```

- [ ] **Step 5: 修正 use-article-list.test.ts / use-article-filter-options.test.ts 的 import**

两个测试文件内对被测 hook 的 import 保持同目录相对（`./use-article-list`、`./use-article-filter-options`）。若测试内 mock 了 `../lib/api` 或引用了 `../pages/articles-page-data`，分别改为 `../../../lib/api`、`../model`。先 `grep -n "lib/api\|articles-page-data\|pages/" src/modules/articles/hooks/*.test.ts` 确认后逐一改。

- [ ] **Step 6: 修正仍在 pages/ 的 ArticlesPage.tsx 的 import**

```ts
import { useAdminArticleFilterOptions } from "../hooks/use-admin-article-filter-options";
import { useAdminArticleList } from "../hooks/use-admin-article-list";
```

改为：

```ts
import { useAdminArticleFilterOptions } from "../modules/articles/hooks/use-article-filter-options";
import { useAdminArticleList } from "../modules/articles/hooks/use-article-list";
```

并把：

```ts
} from "./articles-page-data";
```

改为：

```ts
} from "../modules/articles/model";
```

- [ ] **Step 7: 修正 ArticlesPage.test.tsx 的 import 与 vi.mock 路径**

```ts
import type { ArticleRow } from "./articles-page-data";
import { useAdminArticleFilterOptions } from "../hooks/use-admin-article-filter-options";
import { useAdminArticleList } from "../hooks/use-admin-article-list";
...
vi.mock("../hooks/use-admin-article-list", () => ({ ... }));
vi.mock("../hooks/use-admin-article-filter-options", () => ({ ... }));
```

对应改为：

```ts
import type { ArticleRow } from "../modules/articles/model";
import { useAdminArticleFilterOptions } from "../modules/articles/hooks/use-article-filter-options";
import { useAdminArticleList } from "../modules/articles/hooks/use-article-list";
...
vi.mock("../modules/articles/hooks/use-article-list", () => ({ ... }));
vi.mock("../modules/articles/hooks/use-article-filter-options", () => ({ ... }));
```

（mock 工厂内部实现不变，只改路径字符串。）

- [ ] **Step 8: 跑类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: check-types 无错；测试全部 PASS（行为未变）。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(admin): 迁移 articles 数据层与 hooks 到 modules 目录"
```

---

## Task 2: 迁移 ArticlesPage、拆出私有组件、建模块定义

**Files:**

- Create: `apps/admin/src/modules/articles/components/ArticleStatusBadge.tsx`
- Create: `apps/admin/src/modules/articles/components/ArticleDeleteButton.tsx`
- Move: `apps/admin/src/pages/ArticlesPage.tsx` → `apps/admin/src/modules/articles/ArticlesPage.tsx`
- Move: `apps/admin/src/pages/ArticlesPage.test.tsx` → `apps/admin/src/modules/articles/ArticlesPage.test.tsx`
- Create: `apps/admin/src/modules/articles/index.ts`
- Modify: `apps/admin/src/pages/module-pages.tsx`（ArticlesPage re-export 来源）

- [ ] **Step 1: 新建 ArticleStatusBadge.tsx**

```tsx
import { Badge } from "@repo/ui";
import { articleStatusText, articleStatusVariant, type ArticleStatus } from "../model";

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge variant={articleStatusVariant[status]}>{articleStatusText[status]}</Badge>;
}
```

- [ ] **Step 2: 新建 ArticleDeleteButton.tsx（整段从 ArticlesPage 内联剪出）**

```tsx
import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Popover, PopoverDialog, PopoverTrigger } from "@repo/ui";
import type { ArticleRow } from "../model";

interface ArticleDeleteButtonProps {
  article: ArticleRow;
  isDeleting: boolean;
  onConfirmDelete: (articleId: string) => Promise<void>;
}

export function ArticleDeleteButton({
  article,
  isDeleting,
  onConfirmDelete,
}: ArticleDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <ButtonUtility
        aria-label="删除文章"
        type="button"
        size="sm"
        color="tertiary"
        icon={
          <span className="text-destructive">
            <SvgIcon name="trash" size={18} />
          </span>
        }
        onClick={(event) => event.stopPropagation()}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      />
      <Popover placement="bottom end" offset={6} className="w-64">
        <PopoverDialog aria-label={`确认删除「${article.title}」`} className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">
              确定删除这篇文章吗？文章将移入已删除状态。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" slot="close" isDisabled={isDeleting}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                isDisabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onPress={() => {
                  void onConfirmDelete(article.id)
                    .then(() => {
                      setIsOpen(false);
                    })
                    .catch(() => undefined);
                }}
              >
                {isDeleting ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}
```

- [ ] **Step 3: 移动 ArticlesPage 及其测试**

```bash
cd apps/admin
git mv src/pages/ArticlesPage.tsx src/modules/articles/ArticlesPage.tsx
git mv src/pages/ArticlesPage.test.tsx src/modules/articles/ArticlesPage.test.tsx
cd ../..
```

- [ ] **Step 4: 改写 modules/articles/ArticlesPage.tsx**

删除文件内的 `ArticleStatusBadge`、`ArticleDeleteButton` 两个内联函数定义；从 `@repo/ui` 的 import 中移除仅它们使用的 `ButtonUtility`、`Popover`、`PopoverDialog`、`PopoverTrigger`（`Badge` 是否保留取决于 `ArticlesPage` 自身是否仍直接用到——文件内「推荐」列仍直接用 `Badge`，故保留 `Badge`）。修正路径并新增两个组件 import：

- `from "../hooks/use-article-filter-options"` / `from "../hooks/use-article-list"`（去掉中间 `modules/articles`，因现已同处该目录）
- `from "../lib/api"` → `from "../../lib/api"`；`from "../lib/toast"`（addToast）→ `from "../../lib/toast"`
- model：`from "../modules/articles/model"` → `from "./model"`
- 新增：

```ts
import { ArticleDeleteButton } from "./components/ArticleDeleteButton";
import { ArticleStatusBadge } from "./components/ArticleStatusBadge";
```

> 验证 import 清理是否到位：`grep -n "ButtonUtility\|PopoverTrigger\|PopoverDialog" src/modules/articles/ArticlesPage.tsx` 应只在已移除的代码外无残留引用；若 `ArticlesPage` 主体不再用这些组件，则从 `@repo/ui` import 列表删去。

- [ ] **Step 5: 修正 ArticlesPage.test.tsx 路径**

测试现与 `ArticlesPage`、`model`、`hooks/` 同处 `modules/articles/`。把：

```ts
import { ArticlesPage } from "./ArticlesPage";
import type { ArticleRow } from "../modules/articles/model";
import { useAdminArticleFilterOptions } from "../modules/articles/hooks/use-article-filter-options";
import { useAdminArticleList } from "../modules/articles/hooks/use-article-list";
vi.mock("../modules/articles/hooks/use-article-list", ...)
vi.mock("../modules/articles/hooks/use-article-filter-options", ...)
```

改为：

```ts
import { ArticlesPage } from "./ArticlesPage";
import type { ArticleRow } from "./model";
import { useAdminArticleFilterOptions } from "./hooks/use-article-filter-options";
import { useAdminArticleList } from "./hooks/use-article-list";
vi.mock("./hooks/use-article-list", ...)
vi.mock("./hooks/use-article-filter-options", ...)
```

若测试内还 mock 了 `../lib/...`，改为 `../../lib/...`（先 `grep -n "vi.mock\|from \"\\.\\." src/modules/articles/ArticlesPage.test.tsx` 核对）。

- [ ] **Step 6: 新建 modules/articles/index.ts**

```ts
export { ArticlesPage } from "./ArticlesPage";
```

- [ ] **Step 7: 临时桥接 module-pages.tsx 的 ArticlesPage 来源**

`src/pages/module-pages.tsx` 顶部：

```ts
import { ArticlesPage } from "./ArticlesPage";
```

改为：

```ts
import { ArticlesPage } from "../modules/articles";
```

（`App.tsx` 仍从 `./pages/module-pages` 取 ArticlesPage，保持可编译；module-pages 将在 Task 4 删除。）

- [ ] **Step 8: 类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: 全部 PASS。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(admin): ArticlesPage 迁入 modules 并拆分私有组件"
```

---

## Task 3: 迁移 DashboardPage

**Files:**

- Move: `apps/admin/src/pages/DashboardPage.tsx` → `apps/admin/src/modules/dashboard/DashboardPage.tsx`
- Move: `apps/admin/src/pages/DashboardPage.test.tsx` → `apps/admin/src/modules/dashboard/DashboardPage.test.tsx`
- Modify: `apps/admin/src/App.tsx`（DashboardPage import 路径）

- [ ] **Step 1: 移动文件**

```bash
cd apps/admin
mkdir -p src/modules/dashboard
git mv src/pages/DashboardPage.tsx src/modules/dashboard/DashboardPage.tsx
git mv src/pages/DashboardPage.test.tsx src/modules/dashboard/DashboardPage.test.tsx
cd ../..
```

- [ ] **Step 2: 修正 DashboardPage.tsx 内部 import**

由 `src/pages/` 变为 `src/modules/dashboard/`（深一层）：

- `import { adminNavItems } from "../config/nav";` → `import { adminNavItems } from "../../config/nav";`（Task 5 再统一切到 `config/modules`）
- `import { useAuthStore } from "../store/auth";` → `import { useAuthStore } from "../../store/auth";`

> 用 `grep -n "from \"\\.\\./?" src/modules/dashboard/DashboardPage.tsx` 找出所有 `../` import，逐一加深一层为 `../../`。

- [ ] **Step 3: DashboardPage.test.tsx 路径**

测试 import `./DashboardPage` 同目录保持不变；若其引用了 `../` 资源，加深一层。`grep -n "from \"\\.\\." src/modules/dashboard/DashboardPage.test.tsx` 核对。

- [ ] **Step 4: 修正 App.tsx 的 DashboardPage import**

```ts
import { DashboardPage } from "./pages/DashboardPage";
```

改为：

```ts
import { DashboardPage } from "./modules/dashboard/DashboardPage";
```

- [ ] **Step 5: 类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(admin): DashboardPage 迁入 modules 目录"
```

---

## Task 4: 上移 ModulePlaceholder、拆解 module-pages 为各占位模块页

**Files:**

- Move: `apps/admin/src/pages/ModulePlaceholder.tsx` → `apps/admin/src/components/ModulePlaceholder.tsx`
- Move: `apps/admin/src/pages/ModulePlaceholder.test.tsx` → `apps/admin/src/components/ModulePlaceholder.test.tsx`
- Create: `apps/admin/src/modules/articles/PinnedArticlesPage.tsx`
- Create: `apps/admin/src/modules/articles/ArticleEditorPage.tsx`
- Create: `apps/admin/src/modules/categories/CategoriesPage.tsx`
- Create: `apps/admin/src/modules/tags/TagsPage.tsx`
- Create: `apps/admin/src/modules/music/MusicPage.tsx`
- Create: `apps/admin/src/modules/links/LinksPage.tsx`
- Delete: `apps/admin/src/pages/module-pages.tsx`
- Modify: `apps/admin/src/App.tsx`（占位页 import 来源）

- [ ] **Step 1: 上移 ModulePlaceholder 及测试**

```bash
cd apps/admin
git mv src/pages/ModulePlaceholder.tsx src/components/ModulePlaceholder.tsx
git mv src/pages/ModulePlaceholder.test.tsx src/components/ModulePlaceholder.test.tsx
cd ../..
```

`ModulePlaceholder.tsx` 仅 import `@repo/icons`/`@repo/ui`（绝对包名），无相对路径需改。`ModulePlaceholder.test.tsx` import `./ModulePlaceholder` 同目录不变。

- [ ] **Step 2: 新建 modules/articles/PinnedArticlesPage.tsx**

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function PinnedArticlesPage() {
  return (
    <ModulePlaceholder
      title="置顶管理"
      icon="arrow-up"
      description="管理文章置顶顺序、展示优先级与前台推荐位。"
    />
  );
}
```

- [ ] **Step 3: 新建 modules/articles/ArticleEditorPage.tsx**

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function ArticleEditorPage() {
  return (
    <ModulePlaceholder
      title="编辑文章"
      icon="pen"
      description="编辑文章标题、正文、分类、标签与发布状态。"
    />
  );
}
```

- [ ] **Step 4: 新建 categories / tags / music / links 四个占位页**

`src/modules/categories/CategoriesPage.tsx`:

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function CategoriesPage() {
  return (
    <ModulePlaceholder
      title="分类管理"
      icon="folder"
      description="维护内容分类、层级关系与前台展示顺序。"
    />
  );
}
```

`src/modules/tags/TagsPage.tsx`:

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function TagsPage() {
  return (
    <ModulePlaceholder
      title="标签管理"
      icon="tag"
      description="整理标签字典与文章关联，保持内容检索清晰。"
    />
  );
}
```

`src/modules/music/MusicPage.tsx`:

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function MusicPage() {
  return (
    <ModulePlaceholder
      title="音乐管理"
      icon="music"
      description="维护站点音乐收藏、来源信息与展示状态。"
    />
  );
}
```

`src/modules/links/LinksPage.tsx`:

```tsx
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function LinksPage() {
  return (
    <ModulePlaceholder
      title="友链管理"
      icon="link"
      description="管理友情链接、站点描述与审核展示状态。"
    />
  );
}
```

- [ ] **Step 5: 删除 module-pages.tsx 并改 App.tsx 的占位页 import**

```bash
git rm apps/admin/src/pages/module-pages.tsx
```

`App.tsx` 原：

```ts
import {
  ArticleEditorPage,
  ArticlesPage,
  CategoriesPage,
  LinksPage,
  MusicPage,
  PinnedArticlesPage,
  TagsPage,
} from "./pages/module-pages";
```

改为：

```ts
import { ArticlesPage } from "./modules/articles";
import { ArticleEditorPage } from "./modules/articles/ArticleEditorPage";
import { PinnedArticlesPage } from "./modules/articles/PinnedArticlesPage";
import { CategoriesPage } from "./modules/categories/CategoriesPage";
import { TagsPage } from "./modules/tags/TagsPage";
import { MusicPage } from "./modules/music/MusicPage";
import { LinksPage } from "./modules/links/LinksPage";
```

（路由表暂不动，Task 5 切换为注册表驱动。）

- [ ] **Step 6: 类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(admin): 拆解 module-pages 为各模块占位页并上移 ModulePlaceholder"
```

---

## Task 5: 建立模块契约、注册表与路由生成，切换 nav 来源

**Files:**

- Create: `apps/admin/src/config/module-types.ts`
- Create: `apps/admin/src/modules/articles/module.tsx`
- Create: `apps/admin/src/modules/dashboard/module.tsx`
- Create: `apps/admin/src/modules/categories/module.tsx`
- Create: `apps/admin/src/modules/tags/module.tsx`
- Create: `apps/admin/src/modules/music/module.tsx`
- Create: `apps/admin/src/modules/links/module.tsx`
- Create: `apps/admin/src/config/modules.ts`
- Create: `apps/admin/src/config/modules.test.ts`
- Create: `apps/admin/src/app/routes.tsx`
- Modify: `apps/admin/src/App.tsx`（用注册表渲染路由 + 删占位页 import）
- Modify: `apps/admin/src/components/layout/SidebarNav.tsx` 与 `.test.tsx`（nav 来源）
- Modify: `apps/admin/src/modules/dashboard/DashboardPage.tsx`（nav 来源）
- Delete: `apps/admin/src/config/nav.ts`

- [ ] **Step 1: 新建 config/module-types.ts**

```ts
import type { ReactElement } from "react";
import type { IconName } from "@repo/icons";

/** 侧边栏导航项（原 config/nav.ts 中的定义迁移至此） */
export interface AdminNavItem {
  label: string;
  icon: IconName;
  path: string;
  group?: string;
  description: string;
}

/** 模块贡献的单条路由 */
export interface AdminRoute {
  /** index 路由省略 path 并置 index:true */
  path?: string;
  index?: boolean;
  element: ReactElement;
}

/** 一个后台业务模块的定义 */
export interface AdminModule {
  id: string;
  /** 进入侧边栏的模块给出 nav；子路由（new/edit/pinned 等）不给 */
  nav?: AdminNavItem;
  /** 本模块贡献的全部路由（含子路由） */
  routes: AdminRoute[];
}
```

- [ ] **Step 2: 新建各模块 module.tsx**

`src/modules/dashboard/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { DashboardPage } from "./DashboardPage";

export const dashboardModule: AdminModule = {
  id: "dashboard",
  nav: { label: "概览", icon: "home", path: "/", description: "后台关键数据与快捷入口" },
  routes: [{ index: true, element: <DashboardPage /> }],
};
```

`src/modules/articles/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { ArticlesPage } from "./ArticlesPage";
import { ArticleEditorPage } from "./ArticleEditorPage";
import { PinnedArticlesPage } from "./PinnedArticlesPage";

export const articlesModule: AdminModule = {
  id: "articles",
  nav: {
    label: "文章",
    icon: "pen",
    path: "/articles",
    group: "内容",
    description: "管理文章列表、发布状态与编辑入口",
  },
  routes: [
    { path: "/articles", element: <ArticlesPage /> },
    { path: "/articles/new", element: <ArticleEditorPage /> },
    { path: "/articles/pinned", element: <PinnedArticlesPage /> },
    { path: "/articles/:articleId/edit", element: <ArticleEditorPage /> },
  ],
};
```

`src/modules/categories/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { CategoriesPage } from "./CategoriesPage";

export const categoriesModule: AdminModule = {
  id: "categories",
  nav: {
    label: "分类",
    icon: "folder",
    path: "/categories",
    group: "内容",
    description: "维护文章分类与内容结构",
  },
  routes: [{ path: "/categories", element: <CategoriesPage /> }],
};
```

`src/modules/tags/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { TagsPage } from "./TagsPage";

export const tagsModule: AdminModule = {
  id: "tags",
  nav: {
    label: "标签",
    icon: "tag",
    path: "/tags",
    group: "内容",
    description: "整理标签与内容关联",
  },
  routes: [{ path: "/tags", element: <TagsPage /> }],
};
```

`src/modules/music/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { MusicPage } from "./MusicPage";

export const musicModule: AdminModule = {
  id: "music",
  nav: {
    label: "音乐",
    icon: "music",
    path: "/music",
    group: "站点",
    description: "维护站点音乐收藏与播放信息",
  },
  routes: [{ path: "/music", element: <MusicPage /> }],
};
```

`src/modules/links/module.tsx`:

```tsx
import type { AdminModule } from "../../config/module-types";
import { LinksPage } from "./LinksPage";

export const linksModule: AdminModule = {
  id: "links",
  nav: {
    label: "友链",
    icon: "link",
    path: "/links",
    group: "站点",
    description: "管理友情链接与展示状态",
  },
  routes: [{ path: "/links", element: <LinksPage /> }],
};
```

- [ ] **Step 3: 新建 config/modules.ts（注册表 + 派生）**

```ts
import type { AdminModule, AdminNavItem, AdminRoute } from "./module-types";
import { dashboardModule } from "../modules/dashboard/module";
import { articlesModule } from "../modules/articles/module";
import { categoriesModule } from "../modules/categories/module";
import { tagsModule } from "../modules/tags/module";
import { musicModule } from "../modules/music/module";
import { linksModule } from "../modules/links/module";

/** 所有后台模块的唯一注册表；新增模块在此追加一项 */
export const adminModules: AdminModule[] = [
  dashboardModule,
  articlesModule,
  categoriesModule,
  tagsModule,
  musicModule,
  linksModule,
];

/** 侧边栏导航项：从模块注册表派生（单一事实来源） */
export const adminNavItems: AdminNavItem[] = adminModules.flatMap((m) => (m.nav ? [m.nav] : []));

/** 路由列表：从模块注册表派生 */
export const adminRoutes: AdminRoute[] = adminModules.flatMap((m) => m.routes);

export function getNavItemByPath(pathname: string) {
  return adminNavItems.find((item) => item.path === pathname) ?? adminNavItems[0];
}

export type { AdminModule, AdminNavItem, AdminRoute } from "./module-types";
```

- [ ] **Step 4: 新建 app/routes.tsx**

```tsx
import { Route } from "react-router-dom";
import { adminRoutes } from "../config/modules";

/** 把注册表派生的路由渲染为嵌套在 AdminLayout 下的 <Route> */
export function renderModuleRoutes() {
  return adminRoutes.map((route) =>
    route.index ? (
      <Route key="__index" index element={route.element} />
    ) : (
      <Route key={route.path} path={route.path} element={route.element} />
    ),
  );
}
```

- [ ] **Step 5: 改写 App.tsx 使用注册表**

删除 Task 4 引入的 7 行占位页/Dashboard 显式 import 与原 `ArticlesPage` 等 import（这些现由注册表内部引用）。在文件顶部 import 区加：

```ts
import { renderModuleRoutes } from "./app/routes";
```

把内层路由块：

```tsx
<Route element={<AdminLayout />}>
  <Route index element={<DashboardPage />} />
  <Route path="/articles" element={<ArticlesPage />} />
  <Route path="/articles/new" element={<ArticleEditorPage />} />
  <Route path="/articles/pinned" element={<PinnedArticlesPage />} />
  <Route path="/articles/:articleId/edit" element={<ArticleEditorPage />} />
  <Route path="/categories" element={<CategoriesPage />} />
  <Route path="/tags" element={<TagsPage />} />
  <Route path="/music" element={<MusicPage />} />
  <Route path="/links" element={<LinksPage />} />
</Route>
```

替换为：

```tsx
<Route element={<AdminLayout />}>{renderModuleRoutes()}</Route>
```

保留 `/login` 与 `*` 兜底路由、`AuthGuard`、`AuthInit`、`ThemeProvider` 等外壳不变。删除现已无用的 `DashboardPage`、`ArticlesPage`、`ArticleEditorPage`、`PinnedArticlesPage`、`CategoriesPage`、`TagsPage`、`MusicPage`、`LinksPage` import。

> 用 `grep -n "DashboardPage\|ArticlesPage\|EditorPage\|PinnedArticlesPage\|CategoriesPage\|TagsPage\|MusicPage\|LinksPage" src/App.tsx` 确认无残留引用后再删 import。

- [ ] **Step 6: 切换 SidebarNav 与 DashboardPage 的 nav 来源，删除 config/nav.ts**

- `src/components/layout/SidebarNav.tsx`: `from "../../config/nav"` → `from "../../config/modules"`
- `src/components/layout/SidebarNav.test.tsx`: `from "../../config/nav"` → `from "../../config/modules"`
- `src/modules/dashboard/DashboardPage.tsx`: `from "../../config/nav"` → `from "../../config/modules"`
- 删除文件：

```bash
git rm apps/admin/src/config/nav.ts
```

> `getNavItemByPath` 若有其他引用：`grep -rn "getNavItemByPath" apps/admin/src`，确保都来自 `config/modules`。

- [ ] **Step 7: 新建 config/modules.test.ts（守护单一事实来源不变量）**

```ts
import { describe, expect, it } from "vitest";
import { adminModules, adminNavItems, adminRoutes, getNavItemByPath } from "./modules";

describe("admin 模块注册表", () => {
  it("nav 项仅来自带 nav 的模块，路径与顺序符合预期", () => {
    expect(adminNavItems.map((item) => item.path)).toEqual([
      "/",
      "/articles",
      "/categories",
      "/tags",
      "/music",
      "/links",
    ]);
  });

  it("路由表展开了全部模块路由（含文章子路由）", () => {
    const paths = adminRoutes.map((route) => (route.index ? "index" : route.path));
    expect(paths).toEqual([
      "index",
      "/articles",
      "/articles/new",
      "/articles/pinned",
      "/articles/:articleId/edit",
      "/categories",
      "/tags",
      "/music",
      "/links",
    ]);
  });

  it("每个 nav 路径都有对应路由", () => {
    const routePaths = new Set(adminRoutes.map((r) => r.path));
    for (const item of adminNavItems) {
      if (item.path === "/") continue; // 概览是 index 路由
      expect(routePaths.has(item.path)).toBe(true);
    }
  });

  it("getNavItemByPath 命中返回对应项，未命中回退到首项", () => {
    expect(getNavItemByPath("/articles").label).toBe("文章");
    expect(getNavItemByPath("/not-exist")).toBe(adminNavItems[0]);
  });

  it("注册表模块数量与导出的派生集合自洽", () => {
    expect(adminModules.length).toBeGreaterThanOrEqual(adminNavItems.length);
  });
});
```

- [ ] **Step 8: 类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: 全部 PASS，含新增的 `modules.test.ts`。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(admin): 引入模块注册表统一 nav 与路由来源"
```

---

## Task 6: 迁移 LoginPage 到 app/，清空 pages/

**Files:**

- Move: `apps/admin/src/pages/LoginPage.tsx` → `apps/admin/src/app/LoginPage.tsx`
- Move: `apps/admin/src/pages/LoginPage.test.tsx` → `apps/admin/src/app/LoginPage.test.tsx`
- Modify: `apps/admin/src/App.tsx`（LoginPage import）

- [ ] **Step 1: 移动 LoginPage 及测试**

```bash
cd apps/admin
git mv src/pages/LoginPage.tsx src/app/LoginPage.tsx
git mv src/pages/LoginPage.test.tsx src/app/LoginPage.test.tsx
cd ../..
```

> `pages/` 与 `app/` 同为 `src/` 下一层，`LoginPage.tsx` 的 `../components/...`、`../lib/...`、`../store/...` 相对深度不变，**无需改 LoginPage 内部 import**。`LoginPage.test.tsx` 的 `./LoginPage` 同目录不变；其余 `../` 引用同理不变。用 `grep -n "from \"\\.\\." src/app/LoginPage.tsx src/app/LoginPage.test.tsx` 复核确认深度一致。

- [ ] **Step 2: 修正 App.tsx 的 LoginPage import**

```ts
import { LoginPage } from "./pages/LoginPage";
```

改为：

```ts
import { LoginPage } from "./app/LoginPage";
```

- [ ] **Step 3: 确认 pages/ 已空并删除目录**

```bash
ls apps/admin/src/pages    # 期望：无输出或不存在
rmdir apps/admin/src/pages 2>/dev/null || true
```

- [ ] **Step 4: 确认 hooks/ 若已空则删除**

```bash
ls apps/admin/src/hooks 2>/dev/null   # 若为空
rmdir apps/admin/src/hooks 2>/dev/null || true
```

- [ ] **Step 5: 类型检查与测试，期望全绿**

Run: `pnpm --filter admin check-types && pnpm --filter admin test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(admin): LoginPage 迁入 app 目录并清理空目录"
```

---

## Task 7: 沉淀 building-admin-module skill 与 AGENTS.md 指针

**Files:**

- Create: `.agents/skills/building-admin-module/SKILL.md`
- Modify: `apps/admin/AGENTS.md`（若不存在则改根 `AGENTS.md`）的「按场景读 skill」清单

- [ ] **Step 1: 确认 admin 是否有自己的 AGENTS.md**

```bash
ls apps/admin/AGENTS.md apps/admin/CLAUDE.md 2>/dev/null
```

有则在其中加指针；无则在根 `AGENTS.md` 的「按场景读 skill」清单加一行。

- [ ] **Step 2: 新建 .agents/skills/building-admin-module/SKILL.md**

```markdown
---
name: building-admin-module
description: Use when adding or restructuring a page/module in apps/admin (the Vite + React Router admin SPA) — creating a new sidebar module, a sub-route, or splitting an admin feature. Covers the modules/ folder anatomy, the AdminModule registry contract, the single-source nav/route derivation, naming, and the required tests. Trigger before creating files under apps/admin/src or editing its routes/nav.
---

# 构建 admin 模块

`apps/admin` 是 Vite + React Router SPA。每个业务模块自包含于 `src/modules/<id>/`，由 `src/config/modules.ts` 注册表统一派生 nav 与路由。**新增模块只改两处：建模块文件夹 + 在注册表数组追加一项。**

## 模块文件夹骨架

    src/modules/<id>/
      <Name>Page.tsx          # 页面组件（PascalCase）
      <Name>Page.test.tsx     # 必写
      components/             # 模块私有组件（可选）
      hooks/                  # 模块私有 hook：use-*.ts + use-*.test.ts（可选）
      model.ts               # 类型 / 状态映射 / DTO mapper（有数据时）
      module.tsx             # 导出 AdminModule 定义

跨模块共享的组件放 `src/components/`，通用工具放 `src/lib/`，store 放 `src/store/`。

## 模块契约（src/config/module-types.ts）

    interface AdminModule {
      id: string;
      nav?: AdminNavItem;        // 进侧边栏的模块给 nav；纯子路由不给
      routes: AdminRoute[];      // path? + index? + element
    }

## 新增模块清单

1. 在 `src/modules/<id>/` 建 `<Name>Page.tsx`（+ 测试）。需要列表/数据时加 `model.ts`、`hooks/`。
2. 建 `src/modules/<id>/module.tsx` 导出 `<id>Module: AdminModule`：
   - 要出现在侧边栏 → 填 `nav`（label/icon/path/group?/description）。
   - 在 `routes` 列出该模块全部路由；index 路由用 `{ index: true, element: <Page/> }`。
3. 在 `src/config/modules.ts` 的 `adminModules` 数组追加该模块。nav 与路由会自动派生，**不要手写 nav 数组或在 App.tsx 加 `<Route>`**。
4. 占位未接后端的模块：页面渲染 `src/components/ModulePlaceholder`。

## 规则

- 组件文件 PascalCase；hook 文件 `use-*.ts`；模块目录用小写 id。
- 禁内联 `<svg>`（用 `@repo/icons` 的 `SvgIcon`）、禁裸 `fetch`（用 `@repo/api` 的 `apiClient`，见 extending-api skill）、禁 `any`。
- 改 Page/组件/hook 必须同步 `.test`（AGENTS.md 强制）。
- `config/modules.test.ts` 守护「每个 nav 路径都有对应路由」等不变量；新增模块若打破断言需同步更新该测试。

## 参考样板

`src/modules/articles/` 是完整样板：Page + 私有组件 + hooks + model + module 定义齐全。
```

- [ ] **Step 3: 在 AGENTS.md「按场景读 skill」清单加指针**

在该列表末尾加一行（路径取 Step 1 结论；下例为根 `AGENTS.md`）：

```markdown
- 在 `apps/admin` 加/改页面或模块 → `building-admin-module`
```

- [ ] **Step 4: 校验 skill 文件存在且 frontmatter 完整**

```bash
test -f .agents/skills/building-admin-module/SKILL.md && head -5 .agents/skills/building-admin-module/SKILL.md
```

Expected: 打印 frontmatter 的 `---` / `name:` / `description:`。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(admin): 新增 building-admin-module skill 与 AGENTS 指针"
```

---

## Task 8: 全量验证与前台冒烟

**Files:** 无新增，仅验证。

- [ ] **Step 1: 全仓类型检查、lint、测试**

Run:

```bash
pnpm --filter admin check-types
pnpm --filter admin lint
pnpm --filter admin test
```

Expected: 三者均通过，`lint` 零警告（`--max-warnings 0`）。

- [ ] **Step 2: 确认旧路径已彻底消失**

Run:

```bash
grep -rn "pages/module-pages\|articles-page-data\|use-admin-article\|config/nav\b\|from \"./pages/" apps/admin/src
```

Expected: 无输出。

- [ ] **Step 3: 前台冒烟（preview）**

启动 admin dev server，逐一访问并确认正常渲染、侧边栏导航项与分组与改动前一致：
`/`、`/login`、`/articles`、`/articles/new`、`/articles/pinned`、`/articles/1/edit`、`/categories`、`/tags`、`/music`、`/links`。
重点验证 `/articles` 列表的搜索、分类筛选、表头排序、删除确认、分页行为与改动前一致；控制台无报错。

- [ ] **Step 4:（如有偏差）修复后回到 Step 1**

若任一路由白屏或控制台报错，定位到对应模块 `module.tsx`/Page 的 import 或注册表项修复，重跑验证。

---

## Self-Review 结论

- **Spec 覆盖**：目标结构（Task 1–6）、模块契约+注册表（Task 5）、文章迁移映射（Task 1–4）、skill 交付（Task 7）、测试与验证（Task 8）逐项有任务对应。非目标（懒加载/接后端/动 web 与 packages）未被引入。
- **占位边界**：5 个占位模块仅做结构落位（Task 4）并纳入注册表（Task 5），不接后端，符合 spec。
- **类型一致性**：`AdminModule`/`AdminRoute`/`AdminNavItem` 定义于 `config/module-types.ts`（Task 5 Step 1），各 `module.tsx` 与 `config/modules.ts` 均引用同名类型；`adminNavItems`/`adminRoutes`/`getNavItemByPath` 命名在注册表、消费方（SidebarNav/DashboardPage）、测试间一致。
- **绿色检查点**：每个 Task 末尾均 `check-types` + `test` 通过后再 commit；跨任务桥接（Task 2 Step 7 的 module-pages 临时改 import）在 Task 4 删除 module-pages 时清除。

```

```
