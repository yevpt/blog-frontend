# E2E 测试引入 —— 设计文档

- 日期：2026-07-12
- 状态：已确认，待写实施计划
- 范围：为 monorepo 引入一层薄的端到端（e2e）测试

## 背景与动机

仓库现有约 498 个 `*.test.ts(x)`（vitest + Testing Library），覆盖 Hook/组件/页面/store，单元与组件层非常扎实（AGENTS.md 把「缺测 = 未完成」列为硬约束）。但测试金字塔顶部是空的：**没有任何测试在真实浏览器里验证跨页面、跨 app、带真实路由与网络的完整流程**。

三个单测天然覆盖不到的风险点：

1. Next.js 16 App Router 的 Server/Client 边界（RSC、`actions/`、`api/` route handler、`(auth)` 分组）。
2. 认证流程（登录、重定向、受保护路由）——最易在集成层裂开。
3. 两个独立打包/独立路由的 app（web、admin），没有测试证明构建产物在浏览器里真能跑起来。

结论：**值得引入 e2e，但保持薄**——少量关键旅程的冒烟，而非把单测场景端到端重跑。

## 已确认的决策

| 决策项 | 选择 |
| --- | --- |
| 数据策略 | 真实测试后端（非 mock） |
| 后端来源 | 共享测试 / staging 环境（已部署的 URL） |
| 第一期覆盖 | web + admin 各一条关键旅程 |
| CI 时机 | 先只本地 / 手动，暂不接 CI |
| admin 首期写操作 | 只读冒烟，不做 create/delete（避免污染共享 staging） |

## 相关代码事实（作为设计依据）

- **web**（`apps/web`，Next 16）
  - 登录页：`apps/web/app/(auth)/login/page.tsx`，字段 `identifier + password`，提交到 `POST /api/auth/login`（Next route handler 代理到后端）。
  - 后端地址：环境变量 `API_BASE_URL`（`.env` 默认 `http://localhost:8080`）。
  - 启动：`next build` 后 `next start --port 3000`。
- **admin**（`apps/admin`，Vite 8 SPA）
  - 登录页：`apps/admin/src/app/LoginPage.tsx`，字段 `username + password`，调用 `apiClient.adminAuth.login`；`access_token` 存内存、`refresh_token` 存 `localStorage`。
  - dev 态经 `vite.config` 的 `/api` 代理转发到 `VITE_DEV_BACKEND_URL`（默认 `http://localhost:8080`）；`vite preview` 不带该代理。
  - 启动：`vite`（dev）。
- **测试隔离**：现有测试为 `*.test.ts(x)`（vitest）；e2e 用 `*.spec.ts`（Playwright），并在根 vitest 配置 `exclude` 掉 `apps/e2e`。

## 架构

新增独立 workspace **`apps/e2e`**（`private: true`，不参与 `pnpm -r build`），使用 **Playwright**。它同时驱动 web 与 admin，网络指向共享 staging 后端。

### 前端启动（Playwright `webServer`）

`playwright.config.ts` 用 `webServer` 数组同时拉起两个前端：

- **web**：`pnpm --filter web build && pnpm --filter web start`（端口 3000），注入 `API_BASE_URL=<staging>`。
- **admin**：`pnpm --filter admin dev`（端口 5173），注入 `VITE_DEV_BACKEND_URL=<staging>`，复用其现成 `/api` 代理，规避 `vite preview` 不代理的坑。

> 说明：web 用生产构建（更贴近真实产物），admin 用 dev（为拿到 `/api` 代理，成本最低）。这是第一期的务实取舍，非长期约束。

两个 Playwright `project`，各自 `baseURL` 指向对应端口，各自使用对应的 `storageState`。

### 认证（`storageState`）

- `global-setup.ts`：分别对 web、admin 各登录一次，把 cookie / localStorage 落成 `storageState` 文件（如 `.auth/web.json`、`.auth/admin.json`）。
- 各 `project` 复用对应 `storageState`，用例内直接是已登录态，快且稳。
- web 登录态大概率是 route handler 下发的 cookie；admin 登录态是 `localStorage` 里的 `refresh_token`（+ 运行时换 `access_token`）。global-setup 分别处理。

### 配置与凭据

全部走环境变量，提供 `apps/e2e/.env.example`（真实 secret 不进仓库）：

- `E2E_STAGING_API` —— 共享 staging 后端地址
- `E2E_WEB_BASE_URL`（默认 `http://localhost:3000`）
- `E2E_ADMIN_BASE_URL`（默认 `http://localhost:5173`）
- `E2E_WEB_IDENTIFIER` / `E2E_WEB_PASSWORD`
- `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD`

## 覆盖的两条旅程（第一期）

1. **web 登录冒烟**（`web.spec.ts`）
   - 访问 `/login` → 填入 `E2E_WEB_IDENTIFIER/PASSWORD` → 提交。
   - 断言：进入登录态（发生跳转 / 出现登录后才有的用户态元素）。
2. **admin 核心模块只读冒烟**（`admin.spec.ts`）
   - 以已登录态进入一个核心模块页。
   - 断言：模块页正常渲染且列表 / 核心数据加载成功（只读，不做写操作）。

> **数据污染约束**：因共享 staging，第一期仅做只读断言。若日后要覆盖写操作，用唯一前缀创建 + `afterEach` 清理，且单独评估。

## 脚本

`apps/e2e/package.json`：

- `test:e2e` —— `playwright test`
- `test:e2e:ui` —— `playwright test --ui`
- `test:e2e:headed` —— `playwright test --headed`

根层通过 `pnpm --filter e2e test:e2e` 触发。**不接入 pre-commit / pre-push / CI。** 目录与 env 约定按「日后加一个 nightly GitHub Actions job」预留，但本期不落 CI 文件。

## 明确不做（YAGNI）

- 不接 pre-commit / pre-push / CI（本期）。
- 不追 e2e 覆盖率。
- 不写网络 mock 层（已定真实后端）。
- 第一期不做任何写操作（create / update / delete）。
- 不做跨浏览器矩阵（先跑单一 Chromium）。

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 共享 staging 数据被其他人改动导致断言飘 | 第一期只做「登录成功 / 页面能加载」这类结构性断言，不依赖具体业务数据内容 |
| staging 不可用 → e2e 失败 | 本期仅本地 / 手动触发，不阻塞任何提交流程 |
| vitest 误收 e2e 文件 | 用 `*.spec.ts` 命名 + 根 vitest `exclude` `apps/e2e` |
| `apps/e2e` 被 `pnpm -r build` 波及 | 标 `private` 且不定义 `build` 脚本（`build` 用 `--if-present`，天然跳过） |
| 凭据泄露 | 只提交 `.env.example`，真实值走本地 `.env` / 环境变量，`.gitignore` 排除 |

## 验收标准

- `pnpm --filter e2e test:e2e` 在本地（配好 `.env` 指向 staging）能跑通两条旅程且通过。
- 现有 `pnpm test:run`（vitest）不受影响、不收 e2e 文件。
- 新增 workspace 不影响 `pnpm -r build` / `check-types` / `lint`。
