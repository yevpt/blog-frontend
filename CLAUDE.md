# Blog Monorepo

## 技术栈
React, TypeScript, TailwindCSS, Zustand, pnpm workspaces Monorepo。

## Monorepo 规则
- 禁止在 `apps/*` 直接实现基础 UI 组件，统一从 `@repo/ui` 引入
- 共享 Hooks/类型从 `packages/hooks`、`packages/typescript-config` 等包引入
- 创建新功能前，先识别通用逻辑并建议提取到对应 `packages/`
- HTTP 请求统一通过 `@repo/api` 的 `createApiClient()` 初始化；**禁止**在 `apps/*` 中手写 fetch 封装或直接使用 axios
- `packages/api` 只含：TypeScript 类型（对应后端 DTO）+ 框架无关工厂函数；**不含** token 存储、React Hooks、框架特定代码
- Token 管理各 App 自行实现，通过配置注入工厂：
  - `admin`：access token 存 Zustand 内存，refresh token 存 `localStorage`
  - `web`：两种 token 均存 httpOnly Cookie，由 `proxy.ts` 和 Route Handler 管理，JS 不可读
- 新增 API 接口：先在 `packages/api/src/types/` 补充类型，再在 `client.ts` 对应方法组（auth / posts / ...）添加调用方法

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
