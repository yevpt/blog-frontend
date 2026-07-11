# apps/admin —— 运营管理后台

Vite 8 + React Router 7 实现的单页应用（SPA），供博主进行内容运营与审核。

## 模块化结构（`src/modules/*`）

后台按业务垂直拆分为独立模块：

```
analytics    categories   dashboard    guestbook    moments    tags
articles     comments     links        moderation   music      users
```

每个模块通过统一的 **`AdminModule` 契约**登记自身的导航项与路由（`module.tsx`），导航与路由表由该契约单一来源派生——**新增模块无需改动全局路由表**。带子路由的复杂模块（如 `moderation`）在自己目录内维护 `components/`、`hooks/`、`model.ts`、`rules/` 等。

> 新增/改造后台模块的目录规范与契约细节，见 `.agents/skills/building-admin-module/SKILL.md`。

## 技术要点

- **路由**：React Router 7。
- **状态**：Zustand（`src/store/`）。
- **图表**：`recharts` 渲染统计后台（`analytics` / `dashboard`）的数据可视化。
- **共享层**：UI 组件、Hooks、API 客户端、图标均复用 `packages/*`，与 web 前台保持一致。

## 本地开发

```bash
pnpm dev:admin          # http://localhost:5173
```

## 构建产物

后台是纯静态 SPA，构建产物为 `apps/admin/dist`，可交给任意静态文件服务器托管。部署细节见 [deployment.md](deployment.md#admin静态文件)。
