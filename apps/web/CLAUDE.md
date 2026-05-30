# apps/web — Next.js App Router

## 渲染模式
- `app/` 下所有组件默认为 Server Components
- 只在需要 Hooks（`useState`、`useEffect`、`useContext`）或浏览器 API 时才加 `'use client'`，且尽量推到组件树叶子节点
- 全局客户端状态用 Zustand（只在 `'use client'` 组件中调用）

## 数据获取
- Server Components 中直接用 `fetch` 或数据库查询，禁止用 `useEffect` 拉取数据

## SEO
- 每个页面必须导出 `metadata` 或 `generateMetadata`

## 目录约定
- `app/`：只放路由文件（`page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`）
- `components/`：当前应用的业务组件（基础组件从 `@repo/ui` 引入）
