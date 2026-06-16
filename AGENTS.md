# Blog Monorepo

## 技术栈
React, TypeScript, TailwindCSS, Zustand, pnpm workspaces Monorepo。

## Git 提交
- 提交代码前阅读 `.agents/skills/git-commit/SKILL.md`，按其格式写 message。
- `commit-msg` 钩子（`scripts/validate-commit-msg.cjs`）会强制校验，不合规直接拒绝。

## Monorepo 规则
- 禁止在 `apps/*` 直接实现基础 UI 组件，统一从 `@repo/ui` 引入
- 共享 Hooks/类型从 `packages/hooks`、`packages/typescript-config` 等包引入
- 创建新功能前，先识别通用逻辑并建议提取到对应 `packages/`

## SVG 图标
- **禁止**安装 `lucide-react`、`react-icons` 等第三方图标库；**禁止**在 JSX 中内联 `<svg>`
- 图标统一使用 `@repo/icons` 的 `<SvgIcon name="..." />`（`name` 有 TypeScript 类型约束）
- 新增图标：将 `.svg` 文件放入 `packages/icons/svg/`，运行 `pnpm --filter @repo/icons build`，提交生成文件
- `<SvgSprite />` 已在各 app 根组件注入，无需重复添加

## TypeScript & 代码风格
- 禁止 `any`，用 `unknown` 或精确 `interface`/`type`
- 优先纯函数、Hooks、Early Return，避免深层嵌套
- 变量/函数 `camelCase`，组件/接口 `PascalCase`，常量 `UPPER_SNAKE_CASE`
- 为非显而易见的逻辑、复杂算法、关键业务规则编写中文注释

## 样式
- 只用 TailwindCSS；条件类名用 `clsx` 或 `tailwind-merge`
- **响应式**：移动优先，断点顺序 `base → sm → md → lg → xl`；布局、字号、间距均需考虑各断点表现

## 自动化测试
**每次新增或修改以下内容，必须同步创建或更新对应测试文件：**
- Hook（`packages/hooks/` 或各 app 内部）→ 同目录 `*.test.ts`
- UI 组件（`packages/ui/` 或各 app `components/`）→ 同目录 `*.test.tsx`
- 页面（`apps/*/app/**/page.tsx`）→ 同目录 `page.test.tsx`

**工具链**（框架已配置，直接使用）：
- 测试框架：Vitest
- 组件/Hook 测试：`@testing-library/react`（`render`、`renderHook`、`userEvent`）
- 断言：Vitest 内置 `expect`

**测试内容最低要求**：
- 组件：① 渲染不崩溃 ② 关键 props 影响输出 ③ 用户交互触发正确回调
- Hook：① 初始状态正确 ② 状态变更逻辑 ③ 边界条件（空值、错误）
- 页面：① 核心内容渲染 ② loading/error 状态（若有）