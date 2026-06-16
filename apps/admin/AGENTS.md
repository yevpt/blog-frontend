# apps/admin — Vite + React SPA

## 渲染模式
- 纯客户端 SPA，禁止生成 `'use client'`、`'use server'` 等 Next.js 指令

## 数据获取与状态
- 数据获取用 React Query 或 `useEffect`
- 全局状态与权限管理用 Zustand

## 响应式
- 移动优先，断点顺序 `base → sm → md → lg → xl`
- 表格、数据面板在小屏下可横向滚动（`overflow-x-auto`），禁止裁剪内容

## 环境变量
- 用 `import.meta.env`，禁止用 `process.env`

## 测试
- 环境 `happy-dom`；组件 → `*.test.tsx`，Hook → `*.test.ts`。
- React Query 组件用 `QueryClientProvider` 包裹，验证 loading/error/success。
- 写法/mock 配方（apiClient、MemoryRouter、zustand 复位）见 `.agents/skills/writing-tests/SKILL.md`。
