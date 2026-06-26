# Admin 监控接入与概览重设计

后台 `apps/admin` 接入已建成的站点分析系统：① 概览页（`/`）推倒重做；② 新增「数据统计」侧边栏板块。视觉走「精致克制 / 高级感」（Linear/Vercel 风），统一面板体系。

## 范围

**本轮做：**
- 概览页全新设计（忽略现有架子）。
- 「数据统计」板块（单侧边栏项 + 页内 Tab）。

**本轮不做（列入路线图）：** 评论审核 / 留言 / 动态 / 用户 等内容管理页。概览对这些只显示数字 + 跳转占位。

## 技术约束（沿用 admin 现状）

- Vite React SPA，模块化：每个 `src/modules/<name>/module.tsx` 注册 `nav`（侧边栏项）+ `routes`，在 `src/config/modules.ts` 汇总。
- 取数：**无 react-query/swr**。统一用 `@repo/api` 类型化客户端 + 各模块 `model.ts`/自定义 hook（`useState`/`useEffect`）。新模块照此模式，**不引入 react-query**。
- UI：Tailwind v4（`@theme` 令牌）+ `@repo/ui`（card/badge/tabs/table/avatar/select…）。
- **图表库：新增 `recharts`**（admin 目前无图表库）。仅在 admin 引入。
- 视觉：统一卡片（`@repo/ui` Card 同一种）、克制配色（中性 + 单一强调色）、大留白、精致排版。

---

## 信息架构（侧边栏）

现有：概览 · 文章 · 分类 · 标签 · 音乐 · 友链。

**本轮新增：**「数据统计」（icon `chart-bar`，path `/analytics`）。

**路线图（不在本轮）：** 评论 · 留言 · 动态 · 用户。

---

## 概览页设计（`/`，全新）

定稿布局（宽屏 12 栏；窄屏堆叠）。统一卡片体系，5 个对齐面板：

1. **页头**：标题「概览」+ 实时在线胶囊（绿点 + 人数）+ 时间范围切换（近 7/30 天，影响趋势与 KPI 环比）。
2. **KPI 模块**（一张卡，内部 4 列细线分隔）：今日访问(PV，带较昨日环比) · 独立访客(UV，注册/匿名细分) · 平均停留(+跳出率) · 累计访问。
3. **访问趋势卡**：近 7/30 天 PV 折线（Recharts `LineChart`，单线 + 端点，极简无网格）。
4. **来源 | 热门页面**（两张等宽卡）：来源占比（referer_type 条形）· 热门页面 Top（路径 + PV）。
5. **站点概况卡**（合并块，内部分隔线分区）：
   - 内容总量：文章/分类/标签/音乐/友链/用户 数字行。
   - 待处理：待审评论 / 新留言 / 新动态（数字 + 跳转占位）。
   - 用户：今日新增 / 今日活跃。

### 概览数据来源

| 面板 | 数据 |
|---|---|
| KPI · 趋势 · 来源 · 热门页面 | 已有分析接口：`/admin/analytics/overview`、`/trend`、`/dimensions?dimension=referer_type`、`/pages` |
| 实时在线胶囊 | `/admin/analytics/realtime`（取 `online`） |
| 内容总量 · 待处理 · 用户 | **后端需新增** `GET /admin/overview/summary`（见下「后端依赖」） |

---

## 「数据统计」页设计（`/analytics`，页内 Tab）

单页 + `@repo/ui` Tabs。**一期全上**，6 个 Tab：

| Tab | 内容 | 接口 |
|---|---|---|
| **趋势** | PV/UV/会话 折线，可切 metric + segment(全部/注册/匿名) + 时间范围 | `GET /admin/analytics/trend?from&to&metric&segment` |
| **受众与来源** | 来源分类、设备、浏览器、OS、**地理(国家/省份)** 维度分布（饼/条）。维度切换 | `GET /admin/analytics/dimensions?dimension&from&to`（dimension ∈ referer_type·device·browser·os·country） |
| **页面** | 热门页面排行（path/title/PV/UV），分页/排序 | `GET /admin/analytics/pages?from&to&limit` |
| **友链** | 友链带量排行：友链名/站点 + PV/UV/会话 + **入站占比 `inbound_rate`**；按 PV 排序 | `GET /admin/analytics/friend-links?from&to&limit` |
| **实时** | 当前在线 + 最近活跃路径（自动轮询，如 10s） | `GET /admin/analytics/realtime` |
| **路径漏斗** | 访问路径序列（Top 路径） + 自定义漏斗（输入有序 step 列表，出留存/转化率） | `GET /admin/analytics/paths?from&to&limit`、`GET /admin/analytics/funnel?step&from&to` |

每个 Tab 顶部共享时间范围控件（默认近 7 天，最大 365 天）。

---

## 后端数据契约（已存在）

后端统一响应 `response.Response{ code, message, data }`，`code=0` 成功、`code=400` 参数错误（HTTP 恒 200）。analytics admin 端点均在 `admin` 组（需登录 + Admin 角色）。

- `GET /admin/analytics/overview` → `Overview{ today_pv, today_uv, online, total_pv, total_uv, registered{today_pv,today_uv}, anonymous{today_pv,today_uv} }`（字段以后端 `dto.Overview` 为准）。
- `GET /admin/analytics/trend?from&to&metric&segment` → `[]TrendPoint{ date, value }`。metric ∈ pv·uv·sessions；segment ∈ all·registered·anonymous。
- `GET /admin/analytics/dimensions?dimension&from&to` → `[]DimensionPoint{ dim_value, pv, uv }`。
- `GET /admin/analytics/pages?from&to&limit` → `[]PageStat{ path, title, pv, uv }`。
- `GET /admin/analytics/friend-links?from&to&limit` → `[]FriendLinkStat{ friend_link_id, friend_name, site, site_host, pv, uv, sessions, inbound_rate }`。
- `GET /admin/analytics/realtime` → `RealtimeStat{ online, recent_paths[]{ path, active } }`。
- `GET /admin/analytics/paths?from&to&limit` → `[]PathSequence{ sequence[], sessions }`。
- `GET /admin/analytics/funnel?step&from&to`（step 可重复传，≤10）→ `[]FunnelStep{ step, sessions, conversion_rate }`。

> **双栈地理**：后端已支持 IPv4 + IPv6 地理解析，「受众与来源」的国家/省份维度数据现已完整，前端无需特殊处理。

---

## 后端依赖（本轮需在 blog-backend 新增）

概览的「内容总量 / 待处理 / 用户」不在分析接口里，现也无对应端点。新增一个聚合端点：

**`GET /admin/overview/summary`**（admin 组）→
```
{
  "content":      { "articles": int, "categories": int, "tags": int, "music": int, "friend_links": int },
  "interactions": { "pending_comments": int, "new_guestbook": int, "new_moments": int },
  "users":        { "total": int, "today_new": int, "today_active": int }
}
```
- `content.*`：各内容表计数（`COUNT(*)`，排除软删）。
- `interactions.*`：按后端模型「待审/近 N 天新增」语义实现；**无法廉价统计的字段返回 0 并在实现中标注**，前端对 0 显示为「—」。
- `users.today_active`：复用已建的用户在线态（`NewUserPresence` / `last_active_at`）。
- 分层遵 go-layering，出参走 `dto`，Swagger + `make swag`。

> 若实现时发现某子块成本过高，可降级：概览对应卡显示「—」并保留入口，不阻塞主体。

---

## 前端架构

### `@repo/api`（新增 analytics 客户端）
- `packages/api/src/types/analytics.ts`：上述所有出参 TS 类型 + 入参类型。
- `packages/api/src/client.ts`：新增 analytics 方法（getOverview/getTrend/getDimensions/getPages/getFriendLinks/getRealtime/getPaths/getFunnel/getOverviewSummary），复用现有 client 的请求封装与 `ApiError`。
- `packages/api/src/index.ts` 导出新类型。

### `apps/admin`（新模块 + 概览重写）
- `src/modules/analytics/`：`module.tsx`（注册 nav `/analytics` + 路由）、`AnalyticsPage.tsx`（Tabs 容器）、`tabs/*`（趋势/受众来源/页面/友链/实时/路径漏斗各一组件）、`model.ts`/hooks（取数 + 状态，仿 articles 模块）、`components/*`（图表封装：`TrendChart`、`DimensionChart` 基于 recharts）。
- `src/modules/dashboard/DashboardPage.tsx`：按本设计**重写**（保留 `module.tsx` 注册）。删除现有假数据与旧布局。
- `src/config/modules.ts`：注册 `analyticsModule`。
- 共用：时间范围选择 hook、`response` 错误处理（沿用 `@repo/api` `ApiError` 现有约定）。
- `recharts` 加入 `apps/admin/package.json`。

### 视觉落地（高级感）
- 统一用 `@repo/ui` `Card`，同一内边距/圆角/标题样式。
- 配色：中性文本层次（primary/secondary/muted）+ 单一强调色（用 admin 主题强调色，仅用于趋势线、首要占比、关键 delta）。
- Recharts 主题：细线（2px）、无网格或极淡网格、无填充或极淡、tooltip 简洁；颜色取主题令牌。
- 数字统一千分位、百分比 1 位小数、时长 `m:ss`。

---

## 测试

- `@repo/api`：analytics 方法的请求/解析单测（vitest，仿现有 client.test.ts）。
- admin：各 Tab 组件渲染 + 取数状态（loading/empty/error）测试（vitest + testing-library，仿现有模块）；概览页关键块渲染测试。
- 图表组件：渲染冒烟（给定数据不报错）。

## 实现顺序

1. **后端**：`GET /admin/overview/summary`（+ Swagger）。友链/分析接口已就绪。
2. **`@repo/api`**：analytics 类型 + client 方法。
3. **admin**：`recharts` 依赖 → analytics 模块（先趋势/受众来源/页面，再友链/实时/路径漏斗）→ 侧边栏注册。
4. **admin**：概览页重写（接 analytics overview/trend/dimensions/pages/realtime + overview/summary）。
5. 验证：`pnpm --filter @repo/api test`、`pnpm --filter admin test`、`pnpm --filter admin build`、`pnpm --filter admin check-types`。

## 风险 / 超出范围

- 内容管理页（评论/留言/动态/用户）**不在本轮**；概览跳转先占位。
- `interactions.*` 的「待审/新增」语义取决于后端模型，可能部分降级为 0/「—」。
- 概览非流量块依赖新增的 `/admin/overview/summary`；该端点未就绪前，概览这部分用占位。
