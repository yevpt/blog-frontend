# GitHub OAuth 登录对接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让登录弹窗中的 GitHub 按钮通过 Popup 弹出窗口完成 OAuth 授权，授权成功后自动关闭弹窗并显示欢迎 toast。

**Architecture:** 前端调用 Next.js API 代理路由获取 GitHub 授权 URL → 弹出 popup 窗口让用户授权 → GitHub 回调我们的 `/oauth/github/callback` 页面 → 页面通过 `window.postMessage` 把结果传回父窗口 → 父窗口关闭登录弹窗。所有 token 通过 Next.js 服务端路由写入 httpOnly Cookie，JS 不可读。

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest + @testing-library/react, TailwindCSS

---

## 文件清单

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 修改 | `packages/api/src/types/auth.ts` | 补充 OAuth 相关类型 |
| 修改 | `packages/api/src/index.ts` | 导出新类型 |
| 新建 | `apps/web/lib/oauth.ts` | Popup 通信消息类型（两端共用） |
| 新建 | `apps/web/app/api/oauth/[source]/authorize/route.ts` | 代理后端 authorize 接口 |
| 新建 | `apps/web/app/api/oauth/[source]/authorize/route.test.ts` | 代理路由测试 |
| 新建 | `apps/web/app/api/oauth/[source]/callback/route.ts` | 代理后端 callback 接口，写 Cookie |
| 新建 | `apps/web/app/api/oauth/[source]/callback/route.test.ts` | Cookie 写入逻辑测试 |
| 新建 | `apps/web/app/oauth/[source]/callback/page.tsx` | Popup 回调接收页 |
| 新建 | `apps/web/app/oauth/[source]/callback/page.test.tsx` | 回调页测试 |
| 修改 | `apps/web/components/auth/oauth-grid.tsx` | GitHub 按钮触发 popup 流程 |
| 修改 | `apps/web/components/auth/oauth-grid.test.tsx` | 补充 popup 流程测试 |
| 修改 | `apps/web/components/auth/login-view.tsx` | 将 onSuccess 传给 OAuthGrid |
| 修改 | `apps/web/components/auth/login-view.test.tsx` | 补充 OAuthGrid onSuccess 冒泡测试 |

---

## Task 1: 补充 API 类型并导出

**Files:**
- Modify: `packages/api/src/types/auth.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 在 auth.ts 末尾追加两个 OAuth 类型**

打开 `packages/api/src/types/auth.ts`，在文件末尾追加：

```ts
/** 获取 OAuth 授权地址响应 */
export interface OAuthAuthorizeResp {
  authorize_url: string;
}

/**
 * OAuth callback 处理响应
 * - action="login" 时 login 字段存在，包含 token 和用户信息
 * - action="bind" 时 binding 字段存在（本次不实现）
 */
export interface OAuthCallbackResp {
  action: string;
  login?: LoginResp;
}
```

- [ ] **Step 2: 在 index.ts 中导出新类型**

打开 `packages/api/src/index.ts`，在现有 auth 类型导出行中补充两个新类型：

```ts
export type {
  SendCodeReq,
  RegisterReq,
  LoginReq,
  RefreshReq,
  UserResp,
  LoginResp,
  TokenResp,
  CaptchaChallengeResp,
  CaptchaVerifyReq,
  CaptchaVerifyResp,
  OAuthAuthorizeResp,   // ← 新增
  OAuthCallbackResp,    // ← 新增
} from "./types/auth";
```

- [ ] **Step 3: 验证类型编译无误**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/api tsc --noEmit
```

期望：无报错输出。

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/types/auth.ts packages/api/src/index.ts
git commit -m "feat(api): 新增 OAuthAuthorizeResp、OAuthCallbackResp 类型"
```

---

## Task 2: 创建 Popup 通信消息共享类型

**Files:**
- Create: `apps/web/lib/oauth.ts`

- [ ] **Step 1: 创建文件**

```ts
// apps/web/lib/oauth.ts
import type { UserResp } from "@repo/api";

/**
 * Popup 窗口与父窗口之间的 postMessage 通信格式。
 * OAuth 回调页（popup）发送此消息，OAuthGrid（父窗口）监听。
 */
export interface OAuthMessage {
  type: "oauth_success" | "oauth_error";
  /** type=oauth_success 时存在 */
  user?: UserResp;
  /** type=oauth_error 时存在 */
  message?: string;
}
```

- [ ] **Step 2: 验证 TypeScript 通过**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/web tsc --noEmit 2>&1 | head -20
```

期望：无与 `lib/oauth.ts` 相关的报错。

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/oauth.ts
git commit -m "feat(oauth): 新增 Popup 通信消息共享类型 OAuthMessage"
```

---

## Task 3: 创建 `/api/oauth/[source]/authorize` 代理路由

**Files:**
- Create: `apps/web/app/api/oauth/[source]/authorize/route.ts`
- Create: `apps/web/app/api/oauth/[source]/authorize/route.test.ts`

- [ ] **Step 1: 先写失败测试**

创建 `apps/web/app/api/oauth/[source]/authorize/route.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/oauth/[source]/authorize", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("将 source 和 redirect_uri 透传至后端，返回 authorize_url", async () => {
    // 模拟后端返回授权地址
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize?client_id=xxx" },
        }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/authorize?action=login&redirect_uri=https%3A%2F%2Fwww.yevpt.com%2Foauth%2Fgithub%2Fcallback",
    );
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    // 验证转发给后端的 URL 包含正确路径
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:8080/oauth/github/authorize"),
    );
    // redirect_uri 被正确编码后传出
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("redirect_uri="),
    );
    expect(body.data.authorize_url).toBe(
      "https://github.com/login/oauth/authorize?client_id=xxx",
    );
  });

  it("后端返回错误时，透传错误响应给客户端", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "不支持的平台" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/oauth/unknown/authorize");
    const res = await GET(req, { params: Promise.resolve({ source: "unknown" }) });
    const body = await res.json();

    expect(body.code).toBe(400);
    expect(body.message).toBe("不支持的平台");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/web vitest run apps/web/app/api/oauth/\\[source\\]/authorize/route.test.ts
```

期望：FAIL，提示 `GET` 未导出。

- [ ] **Step 3: 实现路由**

创建 `apps/web/app/api/oauth/[source]/authorize/route.ts`：

```ts
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/oauth/[source]/authorize
 *
 * 服务端代理，将客户端的 authorize 请求转发至 Go 后端。
 * 之所以走服务端代理而非客户端直接请求后端：
 *   1. 避免 CORS 问题（后端只对同源或配置的域名开放）
 *   2. 不暴露后端内网地址给浏览器
 *
 * 查询参数：
 *   - redirect_uri: 前端 OAuth 回调页的完整 URL（由客户端传入）
 *
 * 返回：{ code, data: { authorize_url } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";

  // 拼接后端 URL，保留 redirect_uri 编码，避免特殊字符问题
  const backendUrl = new URL(
    `/oauth/${source}/authorize`,
    process.env.API_BASE_URL,
  );
  backendUrl.searchParams.set("action", "login");
  backendUrl.searchParams.set("redirect_uri", redirectUri);

  const res = await fetch(backendUrl.toString());
  const data = await res.json();

  return NextResponse.json(data);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @repo/web vitest run apps/web/app/api/oauth/\\[source\\]/authorize/route.test.ts
```

期望：2 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/oauth/\[source\]/authorize/route.ts apps/web/app/api/oauth/\[source\]/authorize/route.test.ts
git commit -m "feat(oauth): 新增 /api/oauth/[source]/authorize 代理路由"
```

---

## Task 4: 创建 `/api/oauth/[source]/callback` 代理路由（写 Cookie）

**Files:**
- Create: `apps/web/app/api/oauth/[source]/callback/route.ts`
- Create: `apps/web/app/api/oauth/[source]/callback/route.test.ts`

- [ ] **Step 1: 先写失败测试**

创建 `apps/web/app/api/oauth/[source]/callback/route.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/oauth/[source]/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("登录成功：将 token 写入 httpOnly Cookie，只向客户端返回 user", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            action: "login",
            login: {
              access_token: "acc",
              refresh_token: "ref",
              expires_in: 7200,
              user: { id: 1, username: "vpt" },
            },
          },
        }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/callback?code=abc&state=xyz",
    );
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    // 只返回 user，不把 token 暴露给 JS
    expect(body.code).toBe(0);
    expect(body.data.user.username).toBe("vpt");
    expect(body.data.access_token).toBeUndefined();

    // token 写入 httpOnly Cookie
    const setCookieHeader = res.headers.getSetCookie().join(",");
    expect(setCookieHeader).toContain("access_token=acc");
    expect(setCookieHeader).toContain("refresh_token=ref");
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("code 和 state 被正确转发给后端", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            action: "login",
            login: {
              access_token: "acc",
              refresh_token: "ref",
              expires_in: 7200,
              user: { id: 1, username: "vpt" },
            },
          },
        }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/callback?code=mycode&state=mystate",
    );
    await GET(req, { params: Promise.resolve({ source: "github" }) });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("code=mycode"),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("state=mystate"),
    );
  });

  it("后端返回业务错误时，透传错误响应，不设置 Cookie", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "state 校验失败" }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/callback?code=bad&state=bad",
    );
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    expect(body.code).toBe(400);
    expect(body.message).toBe("state 校验失败");
    // 失败时不应设置任何 Cookie
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @repo/web vitest run apps/web/app/api/oauth/\\[source\\]/callback/route.test.ts
```

期望：FAIL，提示 `GET` 未导出。

- [ ] **Step 3: 实现路由**

创建 `apps/web/app/api/oauth/[source]/callback/route.ts`：

```ts
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/oauth/[source]/callback
 *
 * 处理 GitHub（或其他平台）OAuth 回调的服务端代理。
 *
 * 安全说明：
 *   - code 和 state 由前端回调页从 URL 读取后传入此接口
 *   - 后端校验 state 一次性令牌，防止 CSRF
 *   - token 写入 httpOnly Cookie，JS 无法读取，防止 XSS 窃取
 *
 * 流程：
 *   1. 将 code + state 转发给 Go 后端
 *   2. 后端验证 state、换取 GitHub token、查询或创建用户
 *   3. 后端返回 access_token / refresh_token / user
 *   4. 本路由把 token 写入 Cookie，只把 user 返回给客户端
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const backendUrl = new URL(
    `/oauth/${source}/callback`,
    process.env.API_BASE_URL,
  );
  backendUrl.searchParams.set("code", code);
  backendUrl.searchParams.set("state", state);

  const res = await fetch(backendUrl.toString());
  const data = await res.json();

  // 后端业务失败（state 错误、用户被禁用等），直接透传给客户端
  if (data.code !== 0) {
    return NextResponse.json(data);
  }

  // action=login 时 login 字段存在；action=bind 时此字段为空（本版本不处理 bind）
  const loginData = data.data?.login;
  if (!loginData) {
    return NextResponse.json({ code: 1, message: "OAuth 回调数据异常" });
  }

  const { access_token, refresh_token, expires_in, user } = loginData;

  // 只向客户端返回用户信息，token 写入 httpOnly Cookie（与 /api/auth/login 策略一致）
  const response = NextResponse.json({ code: 0, message: "ok", data: { user } });

  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("access_token", access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: expires_in, // 秒，与后端 expires_in 一致（通常 2 小时）
    path: "/",
  });

  response.cookies.set("refresh_token", refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: "/",
  });

  return response;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @repo/web vitest run apps/web/app/api/oauth/\\[source\\]/callback/route.test.ts
```

期望：3 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/oauth/\[source\]/callback/route.ts apps/web/app/api/oauth/\[source\]/callback/route.test.ts
git commit -m "feat(oauth): 新增 /api/oauth/[source]/callback 代理路由，写入 httpOnly Cookie"
```

---

## Task 5: 创建 OAuth 回调接收页

**Files:**
- Create: `apps/web/app/oauth/[source]/callback/page.tsx`
- Create: `apps/web/app/oauth/[source]/callback/page.test.tsx`

- [ ] **Step 1: 先写失败测试**

创建 `apps/web/app/oauth/[source]/callback/page.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import OAuthCallbackPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

describe("OAuth 回调接收页", () => {
  const mockReplace = vi.fn();
  const mockPostMessage = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.NEXT_PUBLIC_APP_URL = "";

    vi.mocked(useParams).mockReturnValue({ source: "github" });
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);

    // 默认携带正确参数
    const mockSearchParams = new URLSearchParams("code=abc&state=xyz");
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as ReturnType<typeof useSearchParams>);

    // 默认模拟为 popup 场景（window.opener 存在）
    Object.defineProperty(window, "opener", {
      writable: true,
      value: { closed: false, postMessage: mockPostMessage },
    });
    Object.defineProperty(window, "close", { writable: true, value: mockClose });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("渲染加载中提示文字", () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {})); // 永不 resolve
    const { getByText } = render(<OAuthCallbackPage />);
    expect(getByText("正在处理登录，请稍候…")).toBeInTheDocument();
  });

  it("Popup 模式：登录成功后 postMessage 给父窗口并关闭自身", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_success", user: { id: 1, username: "vpt" } },
        window.location.origin,
      ),
    );
    expect(mockClose).toHaveBeenCalled();
    // Popup 模式不应触发路由跳转
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("Popup 模式：后端返回错误时 postMessage 错误消息", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "state 校验失败" }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_error", message: "state 校验失败" },
        window.location.origin,
      ),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("直接导航模式（无 opener）：将结果存入 sessionStorage 并重定向至 /", async () => {
    // 模拟无 opener
    Object.defineProperty(window, "opener", { writable: true, value: null });

    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    const stored = JSON.parse(sessionStorage.getItem("oauth_result") ?? "{}");
    expect(stored.type).toBe("oauth_success");
    expect(stored.user.username).toBe("vpt");
    // 无 opener 时不应调用 postMessage
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("缺少 code 或 state 时，直接发送错误消息", async () => {
    const emptyParams = new URLSearchParams("");
    vi.mocked(useSearchParams).mockReturnValue(emptyParams as ReturnType<typeof useSearchParams>);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_error", message: "缺少 OAuth 回调参数" },
        window.location.origin,
      ),
    );
    // 缺少参数时不应发起 fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @repo/web vitest run apps/web/app/oauth/\\[source\\]/callback/page.test.tsx
```

期望：FAIL，提示模块未找到。

- [ ] **Step 3: 实现回调页**

创建 `apps/web/app/oauth/[source]/callback/page.tsx`：

```tsx
"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type { OAuthMessage } from "@/lib/oauth";

/**
 * OAuth 回调接收页（Popup 窗口内运行）
 *
 * 流程：
 *   GitHub 授权完成 → 重定向至此页面 → 调用 /api/oauth/:source/callback 换取 token
 *   → 若在 popup 中：postMessage 给父窗口后关闭自身
 *   → 若直接打开：存 sessionStorage 后跳转首页
 *
 * Next.js 15 中 useSearchParams() 必须在 Suspense 边界内使用，
 * 因此将实际逻辑拆到 OAuthCallbackContent，用 Suspense 包裹。
 */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground text-sm">正在处理登录，请稍候…</p>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackContent() {
  const params = useParams<{ source: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 防止 React StrictMode 下 useEffect 双执行导致重复处理
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      notify({ type: "oauth_error", message: "缺少 OAuth 回调参数" });
      return;
    }

    const source = params.source;

    fetch(
      `/api/oauth/${source}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.code !== 0) {
          notify({ type: "oauth_error", message: data.message ?? "登录失败，请稍后重试" });
        } else {
          notify({ type: "oauth_success", user: data.data.user });
        }
      })
      .catch(() => {
        notify({ type: "oauth_error", message: "网络异常，请稍后重试" });
      });

    /**
     * 统一通知父窗口（或跳转首页）。
     * - Popup 场景：postMessage 后关闭自身
     * - 直接打开场景：存 sessionStorage 后跳转 /（供首页读取并展示 toast）
     */
    function notify(msg: OAuthMessage) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(msg, window.location.origin);
        window.close();
      } else {
        sessionStorage.setItem("oauth_result", JSON.stringify(msg));
        router.replace("/");
      }
    }
  }, [params.source, searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">正在处理登录，请稍候…</p>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @repo/web vitest run apps/web/app/oauth/\\[source\\]/callback/page.test.tsx
```

期望：4 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/oauth/\[source\]/callback/page.tsx apps/web/app/oauth/\[source\]/callback/page.test.tsx
git commit -m "feat(oauth): 新增 OAuth 回调页，Popup postMessage 通知父窗口"
```

---

## Task 6: 更新 OAuthGrid — GitHub 按钮触发 Popup 流程

**Files:**
- Modify: `apps/web/components/auth/oauth-grid.tsx`
- Modify: `apps/web/components/auth/oauth-grid.test.tsx`

- [ ] **Step 1: 先更新测试，覆盖新的 popup 流程**

用以下内容完整替换 `apps/web/components/auth/oauth-grid.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserResp } from "@repo/api";
import { OAuthGrid } from "./oauth-grid";

// 全局 mock fetch 和 window.open
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockWindowOpen = vi.fn();
vi.stubGlobal("open", mockWindowOpen);

describe("OAuthGrid — 展开/收起", () => {
  it("渲染 4 个主要 provider + 展开按钮", () => {
    render(<OAuthGrid />);
    expect(screen.getByTitle("微信")).toBeInTheDocument();
    expect(screen.getByTitle("QQ")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("Google")).toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
  });

  it("点击展开按钮后显示全部 7 个 provider，展开按钮消失", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    expect(screen.getByTitle("Gitee")).toBeInTheDocument();
    expect(screen.getByTitle("百度")).toBeInTheDocument();
    expect(screen.queryByLabelText("展开更多登录方式")).not.toBeInTheDocument();
    expect(screen.getByLabelText("收起登录方式")).toBeInTheDocument();
  });

  it("展开后点击收起按钮可折叠回 4 个 provider", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    await user.click(screen.getByLabelText("收起登录方式"));
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
  });
});

describe("OAuthGrid — GitHub Popup 登录流程", () => {
  const mockSuccess = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockWindowOpen.mockClear();
    mockSuccess.mockClear();
  });

  it("点击 GitHub 按钮后调用 authorize 接口并弹出 popup", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/oauth/github/authorize"),
      ),
    );
    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://github.com/login/oauth/authorize",
      "oauth_popup",
      expect.any(String),
    );
  });

  it("收到 oauth_success postMessage 时调用 onSuccess", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "vpt" };
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    // 模拟 popup 回调页发来的 postMessage
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: mockUser },
        origin: window.location.origin,
      }),
    );

    expect(mockSuccess).toHaveBeenCalledWith(mockUser);
  });

  it("popup 被浏览器拦截时，不打开 popup，也不调用 onSuccess", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    // window.open 返回 null 表示 popup 被浏览器拦截
    mockWindowOpen.mockReturnValue(null);

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));

    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("不同 origin 的 postMessage 被忽略", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    // 来自不同 origin 的消息应被忽略
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: { id: 1, username: "vpt" } },
        origin: "https://evil.com",
      }),
    );

    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @repo/web vitest run apps/web/components/auth/oauth-grid.test.tsx
```

期望：展开/收起的 3 个测试通过，popup 相关的 4 个新测试 FAIL（onSuccess prop 不存在）。

- [ ] **Step 3: 更新 OAuthGrid 实现**

用以下内容完整替换 `apps/web/components/auth/oauth-grid.tsx`：

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { SvgIcon, type IconName } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import type { OAuthMessage } from "@/lib/oauth";
import { addToast } from "@/lib/toast";

interface OAuthProvider {
  id: string;
  label: string;
  icon: IconName;
  color: string | null;
  textClass?: string;
}

const PRIMARY_PROVIDERS: OAuthProvider[] = [
  { id: "wechat", label: "微信", icon: "wechat", color: "#07C160" },
  { id: "qq", label: "QQ", icon: "qq", color: "#1299EF" },
  { id: "github", label: "GitHub", icon: "github", color: null, textClass: "text-foreground" },
  { id: "google", label: "Google", icon: "google", color: null },
];

const EXTRA_PROVIDERS: OAuthProvider[] = [
  { id: "weibo", label: "微博", icon: "weibo", color: "#DF2029" },
  { id: "gitee", label: "Gitee", icon: "gitee", color: "#C71D23" },
  { id: "baidu", label: "百度", icon: "baidu", color: "#2932E1" },
];

/** 当前后端已启用的 OAuth 平台，其他平台按钮暂不可用 */
const ENABLED_PROVIDERS = new Set(["github"]);

interface OAuthGridProps {
  className?: string;
  /**
   * OAuth 登录成功的回调，传入已认证的用户信息。
   * 由父组件（LoginView）传入，成功后关闭弹窗并显示欢迎 toast。
   */
  onSuccess?: (user: UserResp) => void;
}

export function OAuthGrid({ className, onSuccess }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

  // 保存当前活跃的 postMessage 监听器引用，以便组件卸载时清理
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // 组件卸载时移除尚未触发的监听器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }
    };
  }, []);

  /**
   * 处理 GitHub OAuth 登录。
   *
   * 详细流程：
   *   1. 调用 /api/oauth/github/authorize 获取 GitHub 授权地址
   *   2. window.open 弹出 popup 窗口跳转至授权地址
   *   3. 用户在 GitHub 完成授权后，GitHub 重定向至我们的回调页
   *   4. 回调页调用 /api/oauth/github/callback 换取 token 并写入 Cookie
   *   5. 回调页通过 postMessage 把结果传回此父窗口
   *   6. 收到 oauth_success → 调用 onSuccess；oauth_error → 显示错误 toast
   */
  async function handleGitHubLogin() {
    try {
      // redirect_uri：GitHub 授权完成后重定向至此前端路径（popup 内）
      const redirectUri = `${window.location.origin}/oauth/github/callback`;

      const res = await fetch(
        `/api/oauth/github/authorize?action=login&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const data = await res.json();

      if (data.code !== 0 || !data.data?.authorize_url) {
        addToast(data.message ?? "获取授权地址失败，请稍后重试", "error");
        return;
      }

      // 弹出固定尺寸的 popup 窗口（部分浏览器会在非用户手势时拦截）
      const popup = window.open(
        data.data.authorize_url,
        "oauth_popup",
        "width=600,height=700,left=200,top=100",
      );

      if (!popup) {
        // 浏览器拦截了 popup（通常是用户未手动触发点击）
        addToast("浏览器阻止了弹出窗口，请允许后重试", "error");
        return;
      }

      // 清理上一个未完成的监听器（理论上不会有，但做好防御）
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }

      // 监听 popup 回调页发来的结果消息
      function handleMessage(event: MessageEvent<OAuthMessage>) {
        // 严格校验 origin，防止其他来源的 postMessage 注入
        if (event.origin !== window.location.origin) return;

        const { type, user, message } = event.data;

        if (type === "oauth_success" && user) {
          onSuccess?.(user);
        } else if (type === "oauth_error") {
          addToast(message ?? "登录失败，请稍后重试", "error");
        }

        // 消息处理完毕，移除监听器
        window.removeEventListener("message", handleMessage);
        messageHandlerRef.current = null;
      }

      messageHandlerRef.current = handleMessage;
      window.addEventListener("message", handleMessage);
    } catch {
      addToast("网络异常，请稍后重试", "error");
    }
  }

  const providers = expanded ? [...PRIMARY_PROVIDERS, ...EXTRA_PROVIDERS] : PRIMARY_PROVIDERS;

  return (
    <div className={cn("flex justify-center gap-3 flex-wrap", className)}>
      {providers.map(({ id, label, icon, color, textClass }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          aria-label={label}
          style={color ? { color } : undefined}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center p-0 transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer",
            // 未启用的平台降低不透明度，视觉上表示不可用（但仍可点击以显示 toast 提示）
            ENABLED_PROVIDERS.has(id) ? "" : "opacity-40",
            textClass ?? "text-muted-foreground",
          )}
          onPress={() => {
            if (id === "github") {
              handleGitHubLogin();
            } else {
              addToast(`${label} 登录暂未开放`, "info");
            }
          }}
        >
          <span title={label} className="inline-flex">
            <SvgIcon name={icon} size={22} />
          </span>
        </Button>
      ))}
      {expanded ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="收起登录方式"
          onPress={() => setExpanded(false)}
          className="w-9 h-9 rounded-lg flex items-center justify-center p-0 text-muted-foreground/40 transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer"
        >
          <SvgIcon name="chevron-down" size={14} className="rotate-180" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          aria-label="展开更多登录方式"
          onPress={() => setExpanded(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center p-0 text-muted-foreground/40 text-[11px] font-semibold transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer"
        >
          +{EXTRA_PROVIDERS.length}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter @repo/web vitest run apps/web/components/auth/oauth-grid.test.tsx
```

期望：7 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/oauth-grid.tsx apps/web/components/auth/oauth-grid.test.tsx
git commit -m "feat(oauth): OAuthGrid 接入 GitHub Popup 登录流程，其余平台显示暂未开放"
```

---

## Task 7: 更新 LoginView — 将 onSuccess 传入 OAuthGrid

**Files:**
- Modify: `apps/web/components/auth/login-view.tsx`
- Modify: `apps/web/components/auth/login-view.test.tsx`

- [ ] **Step 1: 先更新 LoginView 测试**

在 `apps/web/components/auth/login-view.test.tsx` 中，在现有测试末尾追加以下两个测试（不删除已有测试）：

```ts
  it("GitHub OAuth 成功时调用 onSuccess（OAuthGrid onSuccess 冒泡）", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "alice" };

    // 模拟 authorize 接口和 window.open
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    vi.stubGlobal("open", vi.fn().mockReturnValue({ closed: false }));

    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));

    // 模拟 popup 发来的成功消息
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: mockUser },
        origin: window.location.origin,
      }),
    );

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser));
  });
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @repo/web vitest run apps/web/components/auth/login-view.test.tsx
```

期望：已有测试通过，新增测试 FAIL（OAuthGrid 未收到 onSuccess prop）。

- [ ] **Step 3: 更新 LoginView 实现**

打开 `apps/web/components/auth/login-view.tsx`，找到 `<OAuthGrid />` 那一行，替换为：

```tsx
<OAuthGrid onSuccess={onSuccess} />
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter @repo/web vitest run apps/web/components/auth/login-view.test.tsx
```

期望：所有测试通过。

- [ ] **Step 5: 运行完整测试套件**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/web vitest run
```

期望：全部通过，无 regression。

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/auth/login-view.tsx apps/web/components/auth/login-view.test.tsx
git commit -m "feat(oauth): LoginView 将 onSuccess 传给 OAuthGrid，完成登录链路"
```

---

## 自查结果

**Spec 覆盖：**
- ✅ `OAuthAuthorizeResp` / `OAuthCallbackResp` 类型 → Task 1
- ✅ `/api/oauth/[source]/authorize` 代理路由 → Task 3
- ✅ `/api/oauth/[source]/callback` 代理路由 + Cookie → Task 4
- ✅ 回调接收页 postMessage + 无 opener fallback → Task 5
- ✅ OAuthGrid popup 流程 + origin 校验 + 组件卸载清理 → Task 6
- ✅ LoginView 传 onSuccess → Task 7
- ✅ 错误处理（popup 拦截、state 错误、网络异常）→ Task 6/5
- ✅ 测试覆盖所有新逻辑

**类型一致性：**
- `OAuthMessage` 在 `lib/oauth.ts` 定义，callback page 和 OAuthGrid 均从此导入 → 一致
- `UserResp` 统一从 `@repo/api` 导入 → 一致
- `LoginResp` 字段（`access_token`, `refresh_token`, `expires_in`, `user`）在 callback route 中使用 → 与 Task 1 定义一致
