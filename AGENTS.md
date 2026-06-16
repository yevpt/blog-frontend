# Blog Monorepo

技术栈：React + TypeScript + TailwindCSS + Zustand，pnpm workspaces monorepo。

## 输出控制

- 默认简洁；回复过长会直接报错，故长内容必须摘要、大任务分阶段。
- 优先改文件而非贴代码：只给关键片段/关键错误；未明确要求不输出完整文件 / diff / 日志 / lockfile / 构建产物。
- 每次只说：做了什么、改了什么、验证了什么、有何风险。

## 始终适用

- **复用优先**：实现任何东西前先搜现成的组件/工具/Hook，有则用、不写平行实现；不确定某抽象是否存在，先读包入口/索引（`@repo/ui`·`@repo/hooks`·`@repo/api`·`@repo/icons` 的 `src/index.ts`）确认。新通用逻辑先提取到 `packages/*`。
- **TypeScript**：禁 `any`（用 `unknown` 或精确类型）；优先纯函数 + Early Return；命名 `camelCase` / `PascalCase` / `UPPER_SNAKE_CASE`；非显然逻辑写中文注释。
- **测试（强制，缺测 = 未完成）**：改 Hook → `*.test.ts`、组件 → `*.test.tsx`、页面 → `page.test.tsx`。
- **提交（强制）**：`commit-msg` 钩子（`scripts/validate-commit-msg.cjs`）强校验，不合规直接拒。

## 按场景读 skill（`.agents/skills/<name>/SKILL.md`）

- 写 JSX/Tailwind/组件/页面 → `building-ui`
- 加后端请求 / 端点 / `*Req`·`*Resp` 类型 → `extending-api`
- 写或跑测试、mock、环境坑 → `writing-tests`
- 写 commit message → `git-commit`
