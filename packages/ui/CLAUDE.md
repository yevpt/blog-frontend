# packages/ui — 通用 UI 组件库

## 框架无关性
- 禁止引入 `next/*`、Vite 特有 API；路由跳转能力通过 props 暴露给宿主应用
- 基于 **Untitled UI** 设计规范封装组件

## 组件开发约定
- 每个组件必须定义清晰的 TypeScript `interface` 描述 Props
- 支持 `className` prop 透传自定义 Tailwind 样式
- 必须用 `tailwind-merge` 处理默认样式与传入 class 的合并冲突

## 组件测试
- 每个组件文件旁边必须有同名 `*.test.tsx`（`Button.tsx` → `Button.test.tsx`）
- 测试环境：`happy-dom`（根 vitest.config.ts 默认）
- 必须覆盖：① 渲染不崩溃 ② props 变化影响 DOM 输出 ③ onClick 等交互事件
- 用 `@testing-library/react` 的 `render` + `screen` + `userEvent`
