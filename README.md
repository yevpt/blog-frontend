# Blog Frontend

[![CI](https://github.com/yevpt/blog-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/yevpt/blog-frontend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-24.x-339933)
![pnpm](https://img.shields.io/badge/pnpm-11.x-F69220)

个人博客系统的前端 Monorepo：博客前台（`apps/web`，Next.js SSR）+ 运营管理后台（`apps/admin`，Vite SPA），共享一套 UI、Hooks、富文本编辑器、API 客户端与图标系统。后端服务（Go）不在本仓库内，通过 REST API 对接。

## 目录

- [技术栈](#技术栈)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [测试与质量门槛](#测试与质量门槛)
- [部署](#部署)
- [贡献指南](#贡献指南)
- [License](#license)

## 技术栈

| 分类 | 选型 |
|---|---|
| 语言 / 包管理 | TypeScript、pnpm workspaces（无 Turborepo，纯 `-r` 递归脚本） |
| 博客前台 | Next.js 16（App Router、Server Components 优先） |
| 管理后台 | Vite 8 + React Router 7（SPA） |
| UI / 状态 | React 19、TailwindCSS 4、Zustand |
| 测试 | Vitest 4 + Testing Library（happy-dom，全仓库统一根配置） |
| CI/CD | GitHub Actions + Docker（多阶段构建）+ SSH 远程部署 |

## 架构设计

### Monorepo 结构

```
├── apps/
│   ├── web/            # Next.js App Router —— 博客前台（SSR）
│   └── admin/          # Vite + React Router —— 运营管理后台（SPA）
└── packages/
    ├── api/                 # 统一后端 API 客户端（鉴权请求、各资源类型与方法）
    ├── ui/                  # 共享基础 UI 组件库
    ├── hooks/               # 跨应用复用的 React Hooks
    ├── editor/              # 富文本编辑器（文章创作，web/admin 共用）
    ├── markdown/            # Markdown 渲染（客户端 + 服务端两套）
    ├── tracker/             # 前端行为埋点 SDK（采集 + 上报）
    ├── icons/               # SVG 雪碧图图标系统
    ├── styles/              # 共享 Tailwind 基础样式
    ├── eslint-config/       # 统一 ESLint 基线（base/react/next）
    └── typescript-config/   # 统一 tsconfig 基线（base/react/next）
```

各 `packages/*` 均以 `workspace:*` 被 `apps/*` 引用，新通用逻辑应优先沉淀到这一层，避免 web/admin 各写一份。

### apps/web —— 博客前台

- 路由（`app/`）覆盖文章（`articles`）、圈子（`circle`）、碎语（`moments`）、留言板（`guestbook`）、友邻（`friend-links`）、用户主页（`users`）、通知（`notifications`）、第三方登录（`oauth`）等业务模块；`app/api/*` 是 BFF 路由，承担后端代理、鉴权、验证码、埋点上报等职责。
- 默认 Server Components，仅在需要浏览器 API / Hooks 时才标记 `'use client'`，并尽量推到组件树叶子节点；全局客户端状态集中在 `store/`（Zustand）。
- 根目录 [`proxy.ts`](apps/web/proxy.ts) 是 Next.js Middleware，负责 access/refresh token 校验与静默续期，保护 `/profile`、`/vip`、`/dashboard` 等路径。
- `lib/` 承载与后端交互、鉴权、SEO、埋点 token 签发等服务端工具函数。

### apps/admin —— 管理后台

- `src/modules/*` 按业务垂直拆分（articles / categories / comments / users / analytics / guestbook / links / moments / music / tags / dashboard），每个模块通过统一的 `AdminModule` 契约登记导航与路由，新增模块时不需要改动全局路由表（详见 [building-admin-module skill](.agents/skills/building-admin-module/SKILL.md)）。
- React Router 7 负责路由，Zustand 管理全局状态，`recharts` 渲染统计后台的图表。

### 共享层取舍

- 接口契约统一在 `@repo/api` 维护（区分 public / 可选鉴权 / 必须鉴权三类请求 helper），避免裸 `fetch` 散落在业务代码中。
- 图标采用 SVG 雪碧图方案：原始 SVG 集中存放于 `@repo/icons`，构建脚本合并为单一雪碧图，通过 `<use>` 引用，同时兼容 Vite 与 Next.js 两套构建环境（配置见 `packages/icons/README.md`）。

## 快速开始

环境要求：Node 24.x（仓库以 Volta 锁定 `24.16.0`）、pnpm 11.x（建议通过 Corepack 启用）。

```bash
pnpm install            # 安装依赖；prepare 钩子会自动装好 git hooks
cp apps/web/.env.example apps/web/.env   # 按需填写 API_BASE_URL 等运行时变量
pnpm dev:web            # http://localhost:3000
pnpm dev:admin          # http://localhost:5173
```

> `commit-msg` 钩子会强制校验提交信息格式，规范见 [`.agents/skills/git-commit/SKILL.md`](.agents/skills/git-commit/SKILL.md)，无需手动配置。

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

## 测试与质量门槛

- 测试框架统一为 Vitest + Testing Library，根目录 [`vitest.config.ts`](vitest.config.ts) 默认 `happy-dom` 环境，个别需要 `jsdom`/`node` 的用例用 `@vitest-environment` 注解覆盖。
- 约定：改 Hook → `*.test.ts`，组件 → `*.test.tsx`，页面 → `page.test.tsx`，缺测视为未完成（写法与 mock 配方见 [`writing-tests` skill](.agents/skills/writing-tests/SKILL.md)）。
- `simple-git-hooks` 在本地强制三道门槛：`pre-commit`（lint-staged + 类型检查 + lint）、`pre-push`（`test:run`）、`commit-msg`（提交信息格式）。

## 部署

### CI/CD 流程（GitHub Actions）

- [`ci.yml`](.github/workflows/ci.yml)：push / PR 到 `main`、`dev` 时安装依赖并跑测试、类型检查、lint，作为合并前的质量门槛。
- [`deploy.yml`](.github/workflows/deploy.yml)：push 到 `main`/`dev`（或手动 `workflow_dispatch`）触发，分三个 job：
  1. **web-image**：用 [`docker/web/Dockerfile`](docker/web/Dockerfile) 多阶段构建 Next.js standalone 镜像，推送到容器镜像仓库，打 `latest` 与 `<commit-sha>` 两个 tag；
  2. **admin-artifact**：`pnpm --filter admin build`，将 `apps/admin/dist` 打包为 GitHub Artifact；
  3. **deploy**：依赖前两个 job，按分支区分 `production`（`main`）/`staging`（`dev`）Environment，通过 SSH 把 `docker-compose.yml` 与 admin 静态包同步到服务器，远端执行 `docker compose pull/up` 更新 web 容器、原子替换 admin 静态目录。

### 自托管部署

Fork 本项目自行部署时，需要准备：

1. **Web（容器化）**：服务器装好 Docker；在部署目录创建 `.env`（字段参考 [`apps/web/.env.example`](apps/web/.env.example)：`API_BASE_URL`、`BLOG_USER_ID`、`ANALYTICS_COLLECT_TOKEN_SECRET` 等），再用 [`docker/web/docker-compose.yml`](docker/web/docker-compose.yml) 启动——镜像地址通过 `BLOG_WEB_IMAGE` 环境变量注入，不需要手改 compose 文件。
2. **Admin（静态文件）**：`pnpm --filter admin build` 产出 `apps/admin/dist`，丢给任意静态文件服务器（如 Nginx）即可，本仓库不含反代配置。
3. **CI 所需的 GitHub Secrets / Variables**：

   | 类型 | 变量 | 用途 |
   |---|---|---|
   | Secret | `REGISTRY_PASSWORD` | 镜像仓库登录密码/Token |
   | Secret | `REMOTE_HOST` / `REMOTE_USER` / `SSH_PRIVATE_KEY` | SSH 登录部署服务器 |
   | Variable | `REGISTRY_HOST` / `REGISTRY_USERNAME` / `REGISTRY_NAMESPACE` | 镜像仓库地址与命名空间 |
   | Variable | `DEPLOY_WEB_ROOT` / `DEPLOY_ADMIN_ROOT` | 服务器上 web / admin 的部署目录 |
   | Variable | `REMOTE_PORT`（可选，默认 22） | SSH 端口 |

## 贡献指南

- 改动前先按场景读对应 skill（见 [`AGENTS.md`](AGENTS.md)）：写 UI 读 `building-ui`，加接口读 `extending-api`，写测试读 `writing-tests`，改 admin 模块读 `building-admin-module`。
- 实现任何通用逻辑前先搜 `packages/*` 是否已有，禁止平行实现；新增 Hook/组件/页面必须补齐对应测试。
- Commit message 必须满足 `commit-msg` 钩子规则（[`scripts/validate-commit-msg.cjs`](scripts/validate-commit-msg.cjs)，规范见 [`git-commit` skill](.agents/skills/git-commit/SKILL.md)）。

## License

[MIT](LICENSE) © vpt
