# packages/ui — 通用 UI 组件库

## 框架无关性
- 禁止引入 `next/*`、Vite 特有 API；路由跳转能力通过 props 暴露给宿主应用
- 基于 **Untitled UI** 设计规范封装组件

## 组件开发约定
- 每个组件必须定义清晰的 TypeScript `interface` 描述 Props
- 支持 `className` prop 透传自定义 Tailwind 样式
- 必须用 `tailwind-merge` 处理默认样式与传入 class 的合并冲突
