# Blog Frontend

[![CI](https://github.com/yevpt/blog-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/yevpt/blog-frontend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-24.x-339933)
![pnpm](https://img.shields.io/badge/pnpm-11.x-F69220)

个人博客系统的前端 Monorepo：**博客前台**（`apps/web`，Next.js SSR）+ **运营管理后台**（`apps/admin`，Vite SPA），共享一套 UI、Hooks、富文本编辑器、API 客户端与图标系统。后端服务（Go）不在本仓库内，通过 REST API 对接。

## 技术栈

| 分类 | 选型 |
|---|---|
| 语言 / 包管理 | TypeScript、pnpm workspaces（无 Turborepo，纯 `-r` 递归脚本） |
| 博客前台 | Next.js 16（App Router、Server Components 优先） |
| 管理后台 | Vite 8 + React Router 7（SPA） |
| UI / 状态 | React 19、TailwindCSS 4、Zustand |
| 富文本 / 渲染 | Tiptap 编辑器、Markdown（客户端 + 服务端两套） |
| 测试 | Vitest 4 + Testing Library（happy-dom，全仓库统一根配置） |
| CI/CD | GitHub Actions + Docker（多阶段构建）+ SSH 远程部署 |

## 项目结构

```
├── apps/
│   ├── web/       # Next.js App Router —— 博客前台（SSR）
│   └── admin/     # Vite + React Router —— 运营管理后台（SPA）
└── packages/      # 共享层：api / ui / hooks / editor / markdown / tracker / icons / styles / *-config
```

各 `packages/*` 以 `workspace:*` 被 `apps/*` 引用，新通用逻辑优先沉淀到这一层。完整说明见 [架构设计](docs/architecture.md)。

## 快速开始

环境要求：**Node 24.x**（Volta 锁定 `24.16.0`）、**pnpm 11.x**（建议通过 Corepack 启用）。

```bash
pnpm install                              # 安装依赖；prepare 钩子自动装好 git hooks
cp apps/web/.env.example apps/web/.env     # 按需填写 API_BASE_URL 等运行时变量
pnpm dev:web                              # http://localhost:3000
pnpm dev:admin                            # http://localhost:5173
```

> `commit-msg` 钩子会强制校验提交信息格式（规范见 `.agents/skills/git-commit/SKILL.md`），无需手动配置。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev:web` / `pnpm dev:admin` | 启动对应应用的开发服务器 |
| `pnpm build` | 递归构建所有 app/package |
| `pnpm test` / `pnpm test:run` | 运行全部测试（watch / 单次） |
| `pnpm test:coverage` | 生成测试覆盖率报告 |
| `pnpm check-types` | 全量 TypeScript 类型检查 |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm format` / `pnpm format:check` | Prettier 格式化 / 校验 |
| `pnpm --filter @repo/icons build` | 重新生成 SVG 雪碧图 |

## 文档导航

| 文档 | 内容 |
|---|---|
| [架构设计](docs/architecture.md) | Monorepo 结构、依赖方向、共享层取舍（API / 图标 / 样式） |
| [apps/web —— 博客前台](docs/app-web.md) | 业务模块、BFF 层、SSR/RSC、鉴权中间件、服务端工具 |
| [apps/admin —— 管理后台](docs/app-admin.md) | 模块化结构、`AdminModule` 契约、路由与图表 |
| [共享包](docs/packages.md) | `packages/*` 逐包职责与入口 |
| [部署](docs/deployment.md) | CI/CD 流程、自托管、环境变量、GitHub Secrets |

## 测试与质量门槛

- 测试统一 Vitest + Testing Library，根 [`vitest.config.ts`](vitest.config.ts) 默认 `happy-dom` 环境，个别用例用 `@vitest-environment` 注解覆盖。
- 约定：改 Hook → `*.test.ts`，组件 → `*.test.tsx`，页面 → `page.test.tsx`，**缺测视为未完成**（写法见 `.agents/skills/writing-tests/SKILL.md`）。
- `simple-git-hooks` 本地强制三道门槛：`pre-commit`（lint-staged + 类型检查 + lint）、`pre-push`（`test:run`）、`commit-msg`（提交信息格式）。

## 贡献指南

- 改动前按场景读对应 skill（见 [`AGENTS.md`](AGENTS.md)）：写 UI 读 `building-ui`，加接口读 `extending-api`，写测试读 `writing-tests`，改 admin 模块读 `building-admin-module`。
- 实现通用逻辑前先搜 `packages/*` 是否已有，禁止平行实现；新增 Hook/组件/页面必须补齐对应测试。
- Commit message 必须满足 `commit-msg` 钩子规则（`scripts/validate-commit-msg.cjs`，规范见 `git-commit` skill）。

## License

[MIT](LICENSE) © vpt
