# apps/admin — Vite + React SPA

## 渲染模式
- 纯客户端 SPA，禁止生成 `'use client'`、`'use server'` 等 Next.js 指令

## 数据获取与状态
- 数据获取用 React Query 或 `useEffect`
- 全局状态与权限管理用 Zustand

## 环境变量
- 用 `import.meta.env`，禁止用 `process.env`
