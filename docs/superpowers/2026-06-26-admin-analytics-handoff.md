# Admin 监控接入 — 交接文档（继续剩余工作）

博客后台（admin）接入站点监控分析 + 概览重设计。前置的分析后端、admin「数据统计」板块和概览页已完成；本文档供接手剩余增强与配套页面。

## 仓库与分支（重要：先理清）

- 后端 `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend`，活跃分支 `dev`。新增的 `GET /admin/overview/summary` 已在 `dev`。
- 前端 `/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend`。
  - ⚠️ admin 分析 UI 的 8 个 commit 在 **`main`** 分支；活跃开发在 **`dev`**，两者已分叉，`dev` 上暂无 analytics 模块。**动手前先确认这批工作要合到哪个分支**（大概率需把 `main` 的分析提交合/挑进 `dev` 再继续），否则在 `dev` 上找不到 analytics 模块代码。

## 已完成（参考实现，勿重复造）

- **设计文档**：`blog-frontend/docs/superpowers/specs/2026-06-26-admin-analytics-ui-design.md`（信息架构、概览布局 v3、各 Tab、数据契约、后端依赖都在里面，**先读它**）。
- **后端**：`GET /admin/overview/summary`（dto/repository/service/handler `dashboard` 包 + 路由 + swagger + service 测试）。
- **`@repo/api`**：analytics 客户端（`packages/api/src/types/analytics.ts` + `client.ts` 的 `analytics` 命名空间 + `index.ts` 导出），方法 `getOverview/getTrend/getDimensions/getPages/getFriendLinks/getRealtime/getPaths/getFunnel/getOverviewSummary`。
- **admin 数据统计模块**：`apps/admin/src/modules/analytics/`（`AnalyticsPage` + 6 个 Tab：趋势/受众与来源/页面/友链/实时/路径漏斗 + `components/{TrendChart,BarList,SegToggle}` + `hooks/use-analytics-data`），侧边栏在 `config/modules.ts` 注册（icon `monitor`，path `/analytics`）。
- **概览页重写**：`apps/admin/src/modules/dashboard/DashboardPage.tsx`（KPI 条 + 趋势 + 来源/热门页面 + 站点概况）。

## 约定（务必沿用）

- admin **无 react-query/swr**。取数用 `apiClient`（`lib/api` 单例，来自 `@repo/api`）+ 自定义 hook（参考 `modules/analytics/hooks/use-analytics-data.ts`），错误走 `ApiError` + `addToast`。
- 模块化：每个 `module.tsx` 注册 `{ id, nav?{label,icon,path,description}, routes }`，在 `config/modules.ts` 汇总；**`route.path` 与 `nav.path` 必须一致且带前导斜杠**（如 `/analytics`），`config/modules.test.ts` 会断言 nav/路由列表，新增模块要同步更新该测试。
- UI：Tailwind v4 + `@repo/ui`（Card / Tabs(react-aria, `id` 配对) / Badge / Button(`onPress`/`isDisabled`) 等）。图表用 `recharts`（已装在 admin）。视觉走「精致克制 / 高级感」：统一卡片、中性色 + 单一强调色、大留白、细线图表。
- 响应：后端统一 `{ code, message, data }`，**无 422**，校验失败是 `code=400`。admin 端点都在 admin 组（需登录 + Admin 角色）。
- 提交：Conventional Commits + 中文主题，commit-msg 钩子强制；pre-commit 跑 lint+check-types，pre-push 跑测试。图标集无 chart 类，已用 `monitor`。

## 后端可用接口（admin 组）

`overview` / `trend`(`?metric&segment&from&to`) / `dimensions`(`?dimension&from&to`，**按天返回，前端需按 `dim_value` 汇总**) / `pages` / `friend-links`(含 `inbound_rate`) / `realtime` / `paths` / `funnel`(`?step` 可重复) / `backfill`(POST) / `overview/summary`。双栈地理已支持，受众的地区维度数据完整。

## 实现中的既定决策

- 概览「互动待办」改为「**近 7 天新增**」评论/留言/动态（评论模型无审核/待审字段，自动发布）。`overview/summary` 的 interactions 字段是 `new_comments`/`new_guestbook`/`new_moments`。
- 友链 Tab 已纳入（后端友链转换接口）。

## 剩余工作（按建议优先级）

1. **统一时间范围控件**（数据统计 + 概览）：7/30/自定义 `from-to`，目前固定近 7 天；做成共享 hook + 控件下发各 Tab。
2. **部署 + 端到端验证**：部署后端（含 `/admin/overview/summary`）+ admin，用真实数据走查一遍。
3. **内容管理页（路线图，体量最大、相互独立）**：评论管理、留言管理、动态管理、用户管理——各一套 CRUD 模块（仿 `modules/articles`、`modules/links`）。概览的待处理/用户跳转目前是占位，建好后接上。
4. **回填工具 UI**：触发 `POST /admin/analytics/backfill`（指定日期区间）。
5. **测试补全**：数据统计各 Tab/图表组件的 vitest 渲染+取数测试（仿 `DashboardPage.test.tsx` 的 `vi.mock("../../lib/api")` 思路）。
6. **后端 backlog（Minor）**：`GROUP_CONCAT` 1024 截断、`SanitizePath`/title UTF-8 字节截断。

## 验证命令

- 前端：`pnpm --filter admin check-types && pnpm --filter admin lint && pnpm exec vitest run && pnpm --filter admin build`
- 后端：`go build ./... && go test ./... && make swag`

先读设计文档与现有 analytics 模块代码对齐风格，再从第 1 项（时间范围控件）开始；**动手前先把 `main` 上的分析提交整合进你要继续的分支**。
