# SSR Token 静默续期修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 access token 过期后首屏 SSR 无法续期、导致 `/users/me` 401、导航栏头像回退成 mock 肖像的问题。

**Architecture:** 双保险续期。（1）把从未生效的 `proxy.ts` 重命名为 Next.js 约定的 `middleware.ts` 并导出 `middleware`，使浏览器导航在到达 SSR 前触发静默续期（治本）。（2）给 `createServerApiClient()` 接上 `@repo/api` client 已内建但未接线的 refresh 回调，作为 SSR 数据层兜底。（3）`layout.tsx` 补 401 日志。

**Tech Stack:** Next.js 16（App Router + Middleware）、`@repo/api` client、jose、Vitest。

## Global Constraints

- 禁 `any`（用 `unknown` 或精确类型）。
- 复用优先：不写平行续期实现，复用 `@repo/api` client（`getRefreshToken`/`onTokenRefreshed`/`onRefreshFailed`）与 `lib/auth-refresh.ts`。
- 测试强制：改动的模块必须有对应测试（`*.test.ts`）。
- 提交须过 `commit-msg` 钩子（`scripts/validate-commit-msg.cjs`）。
- Server Component 不能写 cookie；SSR 层续期得到的新 token 仅在本次请求内用于取数，cookie 落盘交给 middleware / route handler。

---

### Task 1: 将 proxy.ts 重命名为生效的 middleware.ts

**Files:**
- Create: `apps/web/middleware.ts`（内容来自 `apps/web/proxy.ts`，函数改名）
- Delete: `apps/web/proxy.ts`
- Create: `apps/web/middleware.test.ts`（内容来自 `apps/web/proxy.test.ts`，import 改名）
- Delete: `apps/web/proxy.test.ts`
- Modify: `apps/web/lib/server-api.ts:8-9`（注释中 `proxy.ts` → `middleware.ts`）

**Interfaces:**
- Produces: `export async function middleware(request: NextRequest)`、`export const config`（matcher 不变），文件位于 `apps/web/middleware.ts`，被 Next.js 自动识别为 middleware。

- [ ] **Step 1: 创建 middleware.ts**

把 `apps/web/proxy.ts` 的全部内容复制到 `apps/web/middleware.ts`，仅将函数名 `proxy` 改为 `middleware`（其余包括 import、`isProtectedPath`、`config` 全部原样）：

```typescript
import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieHeader,
  isAccessTokenValid,
  refreshAuthTokens,
  setAuthCookies,
} from "@/lib/auth-refresh";

const PROTECTED_PATH_PREFIXES = ["/profile", "/vip", "/dashboard"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // access token 有效，直接放行
  if (accessToken && isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  // access token 无效，尝试用 refresh token 换发新 token
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const tokens = await refreshAuthTokens(refreshToken);
    if (tokens) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("cookie", authCookieHeader(request, tokens));
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      setAuthCookies(response, tokens);
      return response;
    }
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // 未登录或刷新失败，重定向到登录页并携带原路径
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// 覆盖普通页面，确保 access 过期时能在首屏 SSR 前用 refresh token 静默续期。
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

- [ ] **Step 2: 删除旧 proxy.ts**

```bash
git rm apps/web/proxy.ts
```

- [ ] **Step 3: 创建 middleware.test.ts**

把 `apps/web/proxy.test.ts` 内容复制到 `apps/web/middleware.test.ts`，仅改 import 与调用名：`import { config, proxy } from "./proxy";` → `import { config, middleware } from "./middleware";`，并把 3 处 `proxy(` 调用改为 `middleware(`。describe 文案 `"web proxy auth refresh"` 改为 `"web middleware auth refresh"`。其余（`makeToken`/`jsonResponse`/`makeReq` 与三个 `it` 用例断言）保持不变。

- [ ] **Step 4: 删除旧 proxy.test.ts**

```bash
git rm apps/web/proxy.test.ts
```

- [ ] **Step 5: 更新 server-api.ts 注释引用**

`apps/web/lib/server-api.ts` 第 8-9 行注释里的 `proxy.ts` 改为 `middleware.ts`：

```typescript
 * 注意：此处不配置 onRefreshFailed，因为 token 刷新
 * 由 middleware.ts 在请求到达页面前已处理完成。
```
（`onTokenRefreshed`/`getRefreshToken` 会在 Task 2 接入，此处注释一并调整，见 Task 2。本步只改 `proxy.ts` → `middleware.ts` 字样。）

- [ ] **Step 6: 运行 middleware 测试，确认通过**

Run: `pnpm --filter web test -- middleware.test.ts`
Expected: PASS（3 个用例全绿）

- [ ] **Step 7: 构建并确认 middleware manifest 非空**

Run: `pnpm --filter web build`
之后检查：`cat apps/web/.next/server/middleware-manifest.json | jq '.middleware | keys'`
Expected: 数组非空（含一个 middleware 键），证明 middleware 已被 Next.js 识别。

- [ ] **Step 8: Commit**

```bash
git add apps/web/middleware.ts apps/web/middleware.test.ts apps/web/lib/server-api.ts
git commit -m "fix(web): 将 proxy.ts 重命名为生效的 middleware.ts 恢复 SSR 静默续期"
```

---

### Task 2: createServerApiClient 接入 refresh 回调（SSR 兜底）

**Files:**
- Modify: `apps/web/lib/server-api.ts`
- Create: `apps/web/lib/server-api.test.ts`

**Interfaces:**
- Consumes: `@repo/api` 的 `createApiClient`（已内建 `fetchAuthed` 在 401 时 `getRefreshToken` → `POST /auth/refresh` → `onTokenRefreshed` → 用新 token 重试）；`lib/auth-refresh.ts` 的 `REFRESH_TOKEN_COOKIE`。
- Produces: `createServerApiClient()` 返回的 client，在 access token 失效导致 `getMe()` 401 时，会自动用 cookie 中的 refresh token 续期并重试，使本次 SSR 取到正确 profile。

- [ ] **Step 1: 写失败测试**

创建 `apps/web/lib/server-api.test.ts`：

```typescript
// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.stubEnv("API_BASE_URL", "http://mock-backend");

// mock next/headers 的 cookies()，返回可控 cookie
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { name, value } : undefined;
    },
  }),
}));

import { createServerApiClient } from "./server-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createServerApiClient SSR 兜底续期", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("access token 失效导致 /users/me 401 时，用 refresh token 续期并重试成功", async () => {
    cookieStore.set("access_token", "expired-access");
    cookieStore.set("refresh_token", "valid-refresh");

    vi.mocked(fetch)
      // 首次 /users/me → 401
      .mockResolvedValueOnce(jsonResponse({ message: "unauthorized" }, 401))
      // /auth/refresh → 新双 token
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          message: "ok",
          data: { access_token: "new-access", refresh_token: "new-refresh", expires_in: 7200 },
        }),
      )
      // 重试 /users/me → 200 带 profile
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, message: "ok", data: { id: 42, avatar_url: "http://cdn/a.png" } }),
      );

    const api = await createServerApiClient();
    const profile = await api.users.getMe();

    expect(profile.avatar_url).toBe("http://cdn/a.png");
    // 第二次调用命中 /auth/refresh
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe("http://mock-backend/auth/refresh");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm --filter web test -- server-api.test.ts`
Expected: FAIL（当前未接 `getRefreshToken`，401 直接抛出，`getMe()` reject，断言不通过）

- [ ] **Step 3: 接入 refresh 回调**

改写 `apps/web/lib/server-api.ts` 为：

```typescript
import { cookies } from "next/headers";
import { createApiClient } from "@repo/api";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-refresh";

/**
 * 为当前请求创建一个携带 access token 的 API 客户端。
 * 只能在 Server Component / Server Action / Route Handler 中调用（依赖 next/headers）。
 *
 * middleware.ts 会在请求到达页面前用 refresh token 静默续期，正常情况下
 * 这里的 access token 已是新鲜的。但为防止个别入口绕过 middleware，
 * 仍接入 getRefreshToken/onTokenRefreshed 作为 SSR 兜底：遇 401 时自动
 * 用 refresh token 续期并重试，使本次 SSR 能取到正确数据。
 *
 * 注意：Server Component 不能写 cookie，续期得到的新 token 仅用于完成本次
 * 请求；cookie 落盘由 middleware（下次导航）与 /api 路由代理负责。
 */
export async function createServerApiClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  // SSR 续期期间在闭包内暂存新 access token，供 client 重试原请求时读取
  let refreshedAccessToken: string | null = null;

  return createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => refreshedAccessToken ?? accessToken,
    getRefreshToken: () => refreshToken,
    onTokenRefreshed: (tokens) => {
      refreshedAccessToken = tokens.access_token;
    },
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm --filter web test -- server-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/server-api.ts apps/web/lib/server-api.test.ts
git commit -m "fix(web): SSR API 客户端接入 refresh 回调作为续期兜底"
```

---

### Task 3: layout.tsx 补 getMe 失败日志

**Files:**
- Modify: `apps/web/app/layout.tsx:62-66`

**Interfaces:**
- Consumes: 无新增依赖，仅在既有 `catch` 内加 `console.error`。

- [ ] **Step 1: 在 catch 中加结构化日志**

将 `apps/web/app/layout.tsx` 第 62-66 行的静默 catch 改为记录错误（保留降级行为不变）：

```typescript
    try {
      profile = await api.users.getMe();
    } catch (error) {
      // /users/me 失败不影响页面渲染，profile 降级为 null，但需记录以便排查续期问题。
      console.error("[layout] getMe 失败，profile 降级为 null", error);
    }
```

- [ ] **Step 2: 运行现有页面/布局相关测试确认无回归**

Run: `pnpm --filter web test`
Expected: PASS（全量测试绿；本步不新增测试，因仅加日志、无行为变化）

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "fix(web): getMe 失败时记录日志避免静默降级"
```

---

### Task 4: 全量验证

**Files:** 无改动，仅验证。

- [ ] **Step 1: 全量测试**

Run: `pnpm --filter web test`
Expected: PASS（含 `middleware.test.ts`、`server-api.test.ts`）

- [ ] **Step 2: Lint / typecheck**

Run: `pnpm --filter web lint && pnpm --filter web typecheck`（若脚本名不同，用仓库实际脚本）
Expected: 无错误（尤其无 `any`）

- [ ] **Step 3: 构建 + middleware manifest 复核**

Run: `pnpm --filter web build`
检查：`cat apps/web/.next/server/middleware-manifest.json | jq '.middleware | keys'`
Expected: 构建成功且 middleware manifest 非空。

- [ ] **Step 4: 手动/预览验证（对齐现象）**

在 preview 环境模拟 access token 过期首屏访问，确认导航栏头像直接渲染本人头像而非 mock 肖像；服务端日志中 `getMe` 不再报 401。
