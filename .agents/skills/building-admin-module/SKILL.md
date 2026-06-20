---
name: "building-admin-module"
description: "Use when adding or restructuring a page/module in apps/admin (the Vite + React Router admin SPA) — creating a new sidebar module, a sub-route, or splitting an admin feature. Covers the modules/ folder anatomy, the AdminModule registry contract, the single-source nav/route derivation, naming, and required tests. Trigger before creating files under apps/admin/src or editing its routes/nav."
license: "MIT"
---

# 构建 admin 模块

`apps/admin` 是 Vite + React Router SPA。每个业务模块自包含于 `src/modules/<id>/`，由 `src/config/modules.ts` 注册表统一派生 nav 与路由。**新增模块只改两处：建模块文件夹 + 在注册表数组追加一项。**

## 模块文件夹骨架

```
src/modules/<id>/
  <Name>Page.tsx          # 页面组件（PascalCase）
  <Name>Page.test.tsx     # 必写
  components/             # 模块私有组件（可选）
  hooks/                  # 模块私有 hook：use-*.ts + use-*.test.ts（可选）
  model.ts               # 类型 / 状态映射 / DTO mapper（有数据时）
  module.tsx             # 导出 AdminModule 定义
```

跨模块共享的组件放 `src/components/`，通用工具放 `src/lib/`，store 放 `src/store/`，应用外壳（App、routes、LoginPage）放 `src/app/`。

## 模块契约（`src/config/module-types.ts`）

```ts
interface AdminModule {
  id: string;
  nav?: AdminNavItem;        // 进侧边栏的模块给 nav；纯子路由不给
  routes: AdminRoute[];      // { path?; index?; element }
}
interface AdminNavItem {
  label: string;
  icon: IconName;            // 来自 @repo/icons
  path: string;
  group?: string;
  description: string;
}
```

## 新增模块清单

1. 在 `src/modules/<id>/` 建 `<Name>Page.tsx`（+ `<Name>Page.test.tsx`）。需要列表/数据时加 `model.ts`、`hooks/`。
2. 建 `src/modules/<id>/module.tsx` 导出 `<id>Module: AdminModule`：
   - 要出现在侧边栏 → 填 `nav`（label/icon/path/group?/description）。
   - 在 `routes` 列出该模块全部路由；index 路由用 `{ index: true, element: <Page /> }`，其余用 `{ path: "/x", element: <Page /> }`。
3. 在 `src/config/modules.ts` 的 `adminModules` 数组追加该模块。nav 与路由会自动派生，**不要手写 nav 数组，也不要在 App.tsx 里加 `<Route>`**。
4. 占位、未接后端的模块：页面渲染 `src/components/ModulePlaceholder`。

## 规则

- 组件文件 PascalCase；hook 文件 `use-*.ts`；模块目录用小写 id。
- 禁内联 `<svg>`（用 `@repo/icons` 的 `SvgIcon`）、禁裸 `fetch`（用 `@repo/api` 的 `apiClient`，详见 extending-api skill）、禁 `any`。
- 改 Page/组件/hook 必须同步 `.test`（见 AGENTS.md 与 writing-tests skill）。
- `src/config/modules.test.ts` 守护「路由 path 唯一、至多一个 index、每个 nav 路径有对应路由」等不变量；新增模块若打破断言需同步更新该测试。

## 参考样板

`src/modules/articles/` 是完整样板：`ArticlesPage.tsx` + 私有组件 `components/` + `hooks/` + `model.ts` + `module.tsx` 齐全。占位模块样板见 `src/modules/categories/`。
