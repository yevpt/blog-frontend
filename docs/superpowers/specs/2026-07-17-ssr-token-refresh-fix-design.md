# SSR Token 静默续期修复设计

日期：2026-07-17

## 背景与现象

生产环境中，已登录用户在 access token 过期后**首次打开页面**，导航栏头像不显示本人头像，而回退成按 userId 哈希生成的 mock 肖像 SVG。刷新几次或停留片刻后自行恢复，难以复现。

## 根因（已由后端日志证实）

后端请求日志（2026-07-17 22:00–23:40）显示：

- 该时段 `/users/me` 被调用 1055 次，其中 **998 次 401、仅 57 次 200**。
- 23:25:00–23:29:35 之间，Next.js SSR（`user_agent: node`）发往后端 **3992 次请求，`uid` 全部为空**（匿名），期间 `/auth/refresh` **一次都没被调用**。
- 直到 23:29:36 `/auth/refresh` **首次也是唯一一次**成功，之后 `/users/me` 立即恢复 200、头像正常加载。

数据流因果链：

1. `layout.tsx` 首屏 SSR 用 `getSession()` 从本地 JWT 解出 `userId`（只查 `exp`，不问后端），据此判定"已登录"。
2. 同一次 SSR 调 `GET /users/me` 取 `profile`（含 `avatar_url`）。access token 已过期 → 后端返回 401。
3. `layout.tsx` 的 `catch {}` **静默吞掉** 401，`profile` 降级为 `null`。
4. 导航栏据 `userId`（有值）渲染用户菜单，但 `profile.avatar_url` 为空 → `UserAvatar` 回退到 mock 肖像。

**为什么续期没触发（核心）**：Next.js 16 的 middleware 约定文件名为 `middleware.ts`。本项目该文件命名为 `proxy.ts`、导出函数名为 `proxy`，`next.config.mjs` 也未做任何注册。构建产物 `.next/server/middleware-manifest.json` 的 middleware 列表为空 `[]`——**证明没有任何 middleware 运行**。`proxy.ts` 是一段编写完整、带单元测试、但从未接线生效的死代码。原始认证设计（`2026-05-31-api-auth-design.md` 第 262 行）本就要求 `middleware.ts` 做"拦截所有请求 → 静默刷新"，实现命名偏离了设计。

**为什么会自行恢复**：客户端组件的请求走 `/api/*` route handler → `backend-proxy.ts` 的 `proxyWithRefresh`，这条链路的续期一直正常。首次打开时若某个客户端请求先吃到 401 并触发续期、回写了 cookie，此后 SSR 才读到新 token。只有"首屏 SSR 早于任何客户端续期"的窗口暴露此问题，故难复现。

## 修复策略

采用**双保险**（middleware 收口 + SSR 兜底），与既有认证架构和 `2026-05-31-api-auth-design.md` 的设计初衷一致。核心原则是**复用**现有已测试的续期逻辑，不写平行实现。

### 改动一：让 middleware 真正生效（治本）

将 `apps/web/proxy.ts` 重命名为 `apps/web/middleware.ts`，导出函数由 `proxy` 改为 Next.js 约定的 `middleware`（`config` 的 matcher 保持不变）。同步更新 `proxy.test.ts` → `middleware.test.ts` 的 import 与断言，以及 `lib/server-api.ts` 注释中对 `proxy.ts` 的引用。

生效后：浏览器发起的页面导航在到达 `layout.tsx` 之前，middleware 会检查 access token，失效则用 refresh token 换发新双 token 并通过 `requestHeaders.set("cookie", ...)` 注入当前请求头（`proxy.ts` 现有逻辑已实现），使同一次 SSR 读到新 token。

### 改动二：SSR 数据获取层兜底（防御纵深）

middleware 仅覆盖"浏览器 → 页面"的导航请求；对某些绕过 matcher 的入口或边界情况仍可能漏网。因此让 `createServerApiClient()` 补齐 `@repo/api` client 已内建、但当前未接线的续期回调：

- `getRefreshToken`：从 cookie 读 `refresh_token`。
- `onTokenRefreshed`：把新 token 暂存，供调用方回写。

约束：Server Component（如 `layout.tsx`）**不能写 cookie**（Next.js 限制），只有 Route Handler / Server Action / Middleware 能写。因此 SSR 兜底续期换来的新 token 在**本次请求内**用于完成取数（消除头像回退），cookie 的持久化仍交给 middleware（下一次导航）与客户端 route handler。即：SSR 兜底保证"首屏一定能拿到 profile"，middleware/route handler 保证"新 token 落盘"。

实现方式：`createServerApiClient()` 接入 `getRefreshToken` + `onTokenRefreshed`（把新 token 写入闭包变量）。若本次 SSR 发生了续期，`layout.tsx` 无法写 cookie，但已用新 token 取到正确 profile，头像即正确渲染；middleware 会在后续请求补齐 cookie 落盘。

### 改动三：可观测性

`layout.tsx` 对 `getMe()` 的 `catch {}` 补上结构化日志（`console.error`，含状态码），避免此类静默降级再次"盲飞"。仅记录，不改变降级行为（失败仍渲染页面）。

## 影响面与风险

- 改动一是重命名 + 接线，激活的是已存在且已测试的逻辑，风险低；需重新构建以生成 middleware manifest。
- 改动二仅在 `server-api.ts` 增补回调，不改变正常路径行为（token 有效时不触发）。
- 改动三仅加日志。
- 关键验证点：构建后 `.next/server/middleware-manifest.json` 不再为空；单测覆盖 middleware 续期分支与 `createServerApiClient` 的 401→refresh→重试。

## 测试

- `middleware.test.ts`（原 `proxy.test.ts`）：保持并更新现有用例，覆盖 access 有效放行、access 失效 + refresh 成功续期注入、refresh 失败对受保护/公开路径的不同处理。
- `server-api` 续期回调：新增测试覆盖 `getMe()` 遇 401 时 client 自动 refresh 并用新 token 重试成功。
- 全量 `pnpm test` 与 `pnpm build` 通过，构建产物 middleware manifest 非空。
