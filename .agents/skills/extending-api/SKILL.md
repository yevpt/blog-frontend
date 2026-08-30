---
name: "extending-api"
description: 'Use when adding or changing a backend API call in this monorepo — a new endpoint method on the @repo/api client, new request/response types, or wiring a typed request into apps/web or apps/admin. Covers the three fetch helpers (public / optional-auth / authed), the type-naming conventions, the query-string recipe, how each app consumes the client, and the bare-fetch debt to avoid. Trigger whenever you''d otherwise write fetch("/api/..."), need a new ApiClient method, or add a *Req / *Resp type.'
license: "MIT"
---

# 扩展数据层（`@repo/api`）

所有后端请求统一走 `@repo/api` 的类型化 client，**不要散落裸 `fetch`**（重构清单 T4 就是在还这笔债）。
client 自动解包后端统一响应 `{ code, message, data }`：返回 `data`，`code !== 0` 或 HTTP 401 抛 `ApiError`。

## 加一个端点的步骤

以「给某资源加一个方法」为例，按顺序改三处 + 测试：

1. **类型** → `packages/api/src/types/<resource>.ts`：定义 `*Req`(入参) / `*Resp`(返回)。
2. **导出** → `packages/api/src/index.ts`：`export type { ... } from "./types/<resource>"`。
3. **方法** → `packages/api/src/client.ts`：在对应资源分组(`articles`/`moments`/…)里加方法，**选对 fetch helper**(见下)，写中文 JSDoc 说明用途与鉴权。
4. **消费** → 在 app 里调用(见「各端消费」)。
5. **测试** → `client.ts` 改动补 `packages/api` 测试;消费侧组件/hook 按 `writing-tests` skill 补。

> 新资源才新建 `types/<resource>.ts` 文件 + 在 client 里加新分组;已有资源直接往现有文件/分组里加。

## 选对 fetch helper（核心决策）

| helper              | 何时用                                                        | token  |
| ------------------- | ------------------------------------------------------------- | ------ |
| `fetchPublic`       | 完全公开 / 登录前接口(login、register、send-code、列表纯公开) | 不带   |
| `fetchOptionalAuth` | 匿名可访问，登录后返回个性化字段(如 `is_liked`)               | 有则带 |
| `fetchAuthed`       | 必须登录;遇 401 自动用 refresh token 刷新并重试一次           | 必带   |

选错的后果:该 `authed` 用了 `public` → 401 不会自动刷新;公开接口用了 `authed` → 给匿名用户徒增刷新逻辑。`refresh` 自身必须用 `fetchPublic`(否则递归)。

## 类型约定

- 字段名与 Go 后端对齐,用 **snake_case**(`page_size`、`like_count`、`avatar_url`),不要 camelCase。
- 命名后缀:入参 `XxxReq`、返回 `XxxResp`;分页返回统一 `XxxPageResp { total; pages; page; page_size; list: XxxItemResp[] }`;分页查询入参 `XxxListReq { page?; page_size?; ...过滤项 }`。
- Go `int64` 计数字段加注释 `/** Go int64 — safe as JS number for blog-scale counts */`。
- 禁 `any`;可选字段用 `?`,字面量用联合(`status: 0 | 1`)。

## query string 范式（GET 带过滤）

只 set 已定义的参数,避免 `undefined` 进 URL:

```ts
const p = new URLSearchParams();
if (req.page !== undefined) p.set("page", String(req.page));
if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
const qs = p.toString();
return fetchOptionalAuth<XxxPageResp>(`/xxx${qs ? `?${qs}` : ""}`, { method: "GET" });
```

## 各端如何消费

- **web Server Component / Server Action / Route Handler**:`createServerApiClient()`(`apps/web/lib/server-api.ts`,从 cookie 取 token)。**禁止**在 SC 用 `useEffect` 取数。
- **admin(SPA)**:用全局单例 `apiClient`(`apps/admin/src/lib/api.ts`,注入 Zustand token + 自动刷新),组件树外也能用 `apiClient.xxx.yyy()`;配 React Query。
- **web 客户端组件**:浏览器读不到 httpOnly 的 `access_token`,所以请求走 Next route handler(`/api/**`,内部转发归 `lib/backend-proxy.ts`)。即便如此也要:① 复用 `@repo/api` 的 `*Req`/`*Resp` **类型** ② 把请求收进 `apps/web/hooks/use-*`,组件只消费 hook ③ 按状态码(401 等)处理,不在组件里散落取数逻辑。

## 别再制造这些债

- ❌ 组件里散落裸 `fetch` + 手拼类型 → ✅ 走 client / 复用 `@repo/api` 类型,逻辑下沉 hook
- ❌ `as any` 套返回值 → ✅ 给方法标准确泛型 `<XxxResp>`
- ❌ 加了方法忘了从 `index.ts` 导出类型 → ✅ 类型与方法同时补导出
- ❌ 该 `fetchAuthed` 用成 `fetchPublic`(丢自动刷新) → ✅ 按鉴权语义选 helper
