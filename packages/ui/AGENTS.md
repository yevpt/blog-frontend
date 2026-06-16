# packages/ui — 通用 UI 组件库

## 框架无关性
- 禁止引入 `next/*`、Vite 特有 API；路由跳转能力通过 props 暴露给宿主应用
- 基于 **react-aria** 设计规范封装组件

## 组件开发约定
- 每个组件必须定义清晰的 TypeScript `interface` 描述 Props
- 支持 `className` prop 透传自定义 Tailwind 样式
- 必须用 `tailwind-merge` 处理默认样式与传入 class 的合并冲突
- **响应式**：组件默认支持移动端，布局/尺寸用 Tailwind 响应式前缀；避免写死固定宽度

## 组件测试
- 每个组件文件旁边必须有同名 `*.test.tsx`（`button.tsx` → `button.test.tsx`）。
- 环境 `happy-dom`；覆盖：① 渲染不崩溃 ② props 变化影响 DOM ③ 交互事件。
- 写法/mock 配方见 `.agents/skills/writing-tests/SKILL.md`。
