# Blog Monorepo

## 技术栈
React, TypeScript, TailwindCSS, Zustand, pnpm workspaces Monorepo。

## Monorepo 规则
- 禁止在 `apps/*` 直接实现基础 UI 组件，统一从 `@repo/ui` 引入
- 共享 Hooks/类型从 `packages/hooks`、`packages/typescript-config` 等包引入
- 创建新功能前，先识别通用逻辑并建议提取到对应 `packages/`

## TypeScript & 代码风格
- 禁止 `any`，用 `unknown` 或精确 `interface`/`type`
- 优先纯函数、Hooks、Early Return，避免深层嵌套
- 变量/函数 `camelCase`，组件/接口 `PascalCase`，常量 `UPPER_SNAKE_CASE`
- 为非显而易见的逻辑、复杂算法、关键业务规则编写中文注释

## 样式
- 只用 TailwindCSS；条件类名用 `clsx` 或 `tailwind-merge`

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

## Git Commit 规范
格式：`<type>(<scope>): <中文主题>`，正文用中文 bullet points，技术词保留英文。

| type | 用途 | type | 用途 |
|------|------|------|------|
| `feat` | 新增功能 | `refactor` | 重构 |
| `fix` | 修复 Bug | `test` | 测试 |
| `chore` | 构建/工具链/依赖 | `perf` | 性能优化 |
| `docs` | 文档 | `ci` | CI/CD |
| `style` | 格式（不影响逻辑） | `build` | 构建系统 |

type 英文；scope 可选英文技术词；主题中文 ≤50 字、动词开头；Breaking change 末尾加 `BREAKING CHANGE: <描述>`

示例：
```
feat(web): 新增博客文章详情页

- 使用 Next.js App Router 动态路由 [slug] 实现
- 接入 @packages/hooks 中的 usePost 获取数据
- 样式复用 @packages/styles/base.css 基础排版
```
