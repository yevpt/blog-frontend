# 账号安全模块 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户详情页「账号安全」Tab 展示真实数据，并对接后端已有的用户名/密码/邮箱/第三方绑定全部能力。

**Architecture:** `SecurityTab` 改为 `'use client'` 容器，挂载时并行拉 `GET /users/me` + `/oauth/providers` + `/oauth/bindings`，渲染纯展示列表；各写操作用 `@repo/ui` 的 `Modal`（`placement="fullscreen-mobile"`）承载多步表单。图形验证码逻辑从 `use-register-form` 提取为可复用 `useCaptchaToken` hook，邮箱发码 / 找回密码共用。

**Tech Stack:** Next.js App Router、React、TypeScript、TailwindCSS、`@repo/api`、`@repo/ui`（Modal/Button/Input/Select/Toast）、Vitest + jsdom。

**对应 spec:** `docs/superpowers/specs/2026-06-25-account-security-ui-design.md`

## Global Constraints

- 禁 `any`，用 `unknown` 或精确类型；纯函数 + Early Return；命名 `camelCase`/`PascalCase`/`UPPER_SNAKE_CASE`。
- 复用优先：基础组件一律从 `@repo/ui` 引入（Modal/Button/Input/Select/Toast），不写裸 `<button>`/`<input>`/`<select>`。
- 改 Hook → `*.test.ts`、组件 → `*.test.tsx`（强制，缺测=未完成）。
- 测试环境 `jsdom`；mock 配方见 `writing-tests` skill；Vitest 4.x 无 workspace，用 `@vitest-environment` 注解。
- 后端 API 不改；所有前端→后端调用必须经 `apps/web/app/api/**` 代理路由（用 `lib/backend-proxy` 助手），客户端只调 `/api/**`。
- 密码长度前端统一按 **≥8** 校验，文案「至少 8 位」。
- commit message 走 `git-commit` skill 的 Conventional-Commits 中文格式；`commit-msg` 钩子强校验。
- 提交前 `pnpm -r check-types && pnpm -r lint` 必须通过（pre-commit 钩子会跑）。

---

## File Structure

**`packages/api/src`**
- `types/user.ts`（改）：修正 `OAuthBindingResp`；新增 `UpdateEmailReq`/`SendAccountEmailCodeReq`/`SetInitialPasswordReq`。
- `types/auth.ts`（改）：新增 `PasswordResetCodeReq`/`PasswordResetReq`。
- `client.ts`（改）：`users` 命名空间补方法 + 新增 `oauth` 命名空间；`auth` 补 password-reset。
- `index.ts`（改）：导出新类型。

**`apps/web/app/api`（新增代理路由）**
- `users/me/email/code/route.ts`（POST）
- `users/me/email/route.ts`（PATCH）
- `users/me/password/initial/route.ts`（PATCH）
- `oauth/bindings/[source]/route.ts`（DELETE）
- `auth/password-reset/code/route.ts`（POST）
- `auth/password-reset/route.ts`（POST）

**`apps/web/hooks`**
- `use-captcha-token.tsx`（新）：可复用图形验证码 hook。
- `use-register-form.tsx`（改）：改用 `useCaptchaToken`。

**`apps/web/app/users/[id]/_components/security-tab/`**
- `security-tab.tsx`（改）：数据容器。
- `use-account-security.tsx`（新）：取数 + 刷新 hook。
- `security-list.tsx`（新）：纯展示列表。
- `oauth-providers.ts`（新）：`source → { label, color, short }` 映射。
- `username-sheet.tsx`（新）
- `email-sheet.tsx`（新，main/sub 共用）
- `email-display-select.tsx`（新）
- `password-sheet.tsx`（新，A/C 表单 + 切换 B）
- `password-recovery-form.tsx`（新，可复用）
- `unbind-confirm.tsx`（新）
- 各 `*.test.tsx`。

---

## Task 1: `@repo/api` 类型修正与方法补全

**Files:**
- Modify: `packages/api/src/types/user.ts`
- Modify: `packages/api/src/types/auth.ts`
- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/index.ts`
- Test: `packages/api/src/client.test.ts`

**Interfaces:**
- Produces（client 新方法，供 web 调用）：
  - `users.getProviders(): Promise<string[]>`
  - `users.getOAuthBindings(): Promise<OAuthBindingResp[]>`（`OAuthBindingResp = { source: string; social_user_id: number }`）
  - `users.unbindOAuth(source: string): Promise<void>`
  - `users.authorizeOAuthBind(source: string, redirectUri: string): Promise<OAuthAuthorizeResp>`
  - `users.sendAccountEmailCode(req: SendAccountEmailCodeReq): Promise<void>`（`{ email: string; captcha_token: string }`）
  - `users.updateEmail(req: UpdateEmailReq): Promise<void>`（`{ target: "main"|"sub"; email: string; code: string }`）
  - `users.setInitialPassword(req: SetInitialPasswordReq): Promise<void>`（`{ new_password: string; code: string }`）
  - `auth.passwordResetCode(req: PasswordResetCodeReq): Promise<void>`（`{ email: string; captcha_token: string }`）
  - `auth.passwordReset(req: PasswordResetReq): Promise<void>`（`{ email: string; code: string; new_password: string }`）

- [ ] **Step 1: 修正 / 新增类型**

`packages/api/src/types/user.ts` — 替换 `OAuthBindingResp`，并在文件末尾新增请求类型：

```typescript
/** GET /users/me/oauth-bindings | GET /oauth/bindings — 已绑定的第三方 */
export interface OAuthBindingResp {
  source: string;
  social_user_id: number;
}

/** PATCH /users/me/email */
export interface UpdateEmailReq {
  target: "main" | "sub";
  email: string;
  code: string;
}

/** POST /users/me/email/code */
export interface SendAccountEmailCodeReq {
  email: string;
  captcha_token: string;
}

/** PATCH /users/me/password/initial */
export interface SetInitialPasswordReq {
  new_password: string;
  code: string;
}
```

`packages/api/src/types/auth.ts` — 新增：

```typescript
/** POST /auth/password-reset/code */
export interface PasswordResetCodeReq {
  email: string;
  captcha_token: string;
}

/** POST /auth/password-reset */
export interface PasswordResetReq {
  email: string;
  code: string;
  new_password: string;
}
```

- [ ] **Step 2: 写失败测试**

`packages/api/src/client.test.ts` — 追加（沿用文件已有的 fetch mock 风格）：

```typescript
it("unbindOAuth 发 DELETE 到 /oauth/bindings/:source", async () => {
  const fetchMock = mockFetchOnce({ code: 0, data: null });
  const client = createApiClient(authedConfig());
  await client.users.unbindOAuth("github");
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/oauth/bindings/github"),
    expect.objectContaining({ method: "DELETE" }),
  );
});

it("updateEmail 发 PATCH 到 /users/me/email，body 带 target/email/code", async () => {
  const fetchMock = mockFetchOnce({ code: 0, data: null });
  const client = createApiClient(authedConfig());
  await client.users.updateEmail({ target: "main", email: "a@b.com", code: "123456" });
  const [, init] = fetchMock.mock.calls[0];
  expect(JSON.parse(init.body)).toEqual({ target: "main", email: "a@b.com", code: "123456" });
});
```

> 注：`mockFetchOnce` / `authedConfig` 用 `client.test.ts` 现有 helper；若命名不同，对齐现有写法。

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @repo/api test -- client.test.ts`
Expected: FAIL（`unbindOAuth is not a function`）。

- [ ] **Step 4: 实现 client 方法**

`packages/api/src/client.ts` — 在 `users: {...}` 内追加方法（修正 `getOAuthBindings` 返回类型已由 Step1 类型变更自动生效），并新增：

```typescript
      /** 已启用的第三方平台列表 */
      getProviders: () => fetchPublic<string[]>("/oauth/providers", { method: "GET" }),
      /** 解绑第三方平台（最后登录方式时后端拒绝） */
      unbindOAuth: (source: string) =>
        fetchAuthed<void>(`/oauth/bindings/${source}`, { method: "DELETE" }),
      /** 取第三方「绑定」授权地址 */
      authorizeOAuthBind: (source: string, redirectUri: string) =>
        fetchOptionalAuth<OAuthAuthorizeResp>(
          `/oauth/${source}/authorize?action=bind&redirect_uri=${encodeURIComponent(redirectUri)}`,
          { method: "GET" },
        ),
      /** 发送账号邮箱验证码（需图形验证码 token） */
      sendAccountEmailCode: (req: SendAccountEmailCodeReq) =>
        fetchAuthed<void>("/users/me/email/code", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 绑定/换绑主或副邮箱 */
      updateEmail: (req: UpdateEmailReq) =>
        fetchAuthed<void>("/users/me/email", { method: "PATCH", body: JSON.stringify(req) }),
      /** 设置初始密码（OAuth 注册无密码用户） */
      setInitialPassword: (req: SetInitialPasswordReq) =>
        fetchAuthed<void>("/users/me/password/initial", {
          method: "PATCH",
          body: JSON.stringify(req),
        }),
```

在 `auth: {...}` 内追加：

```typescript
      /** 找回密码·发码（公开） */
      passwordResetCode: (req: PasswordResetCodeReq) =>
        fetchPublic<void>("/auth/password-reset/code", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 找回密码·重置（公开） */
      passwordReset: (req: PasswordResetReq) =>
        fetchPublic<void>("/auth/password-reset", { method: "POST", body: JSON.stringify(req) }),
```

在 `client.ts` 顶部 import 补上新类型与 `OAuthAuthorizeResp`。`packages/api/src/index.ts` 导出 `UpdateEmailReq`、`SendAccountEmailCodeReq`、`SetInitialPasswordReq`、`PasswordResetCodeReq`、`PasswordResetReq`。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @repo/api test -- client.test.ts && pnpm --filter @repo/api check-types`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): 补全账号安全相关接口方法与类型"
```

---

## Task 2: 新增 web 代理路由

**Files:**
- Create: `apps/web/app/api/users/me/email/code/route.ts`
- Create: `apps/web/app/api/users/me/email/route.ts`
- Create: `apps/web/app/api/users/me/password/initial/route.ts`
- Create: `apps/web/app/api/oauth/bindings/[source]/route.ts`
- Create: `apps/web/app/api/auth/password-reset/code/route.ts`
- Create: `apps/web/app/api/auth/password-reset/route.ts`

**Interfaces:**
- Consumes：`lib/backend-proxy` 的 `proxyPost`/`proxyPatch`/`proxyDelete`。
- Produces：`/api/**` 端点，被 `@repo/api` 客户端调用。

- [ ] **Step 1: 写路由**

`users/me/email/code/route.ts`：

```typescript
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  return proxyPost(req, "/users/me/email/code");
}
```

`users/me/email/route.ts`：

```typescript
import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(req: NextRequest) {
  return proxyPatch(req, "/users/me/email");
}
```

`users/me/password/initial/route.ts`：

```typescript
import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(req: NextRequest) {
  return proxyPatch(req, "/users/me/password/initial");
}
```

`oauth/bindings/[source]/route.ts`：

```typescript
import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  return proxyDelete(req, `/oauth/bindings/${source}`);
}
```

`auth/password-reset/code/route.ts`（公开，无需 auth）：

```typescript
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  return proxyPost(req, "/auth/password-reset/code", { requireAuth: false });
}
```

`auth/password-reset/route.ts`：

```typescript
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  return proxyPost(req, "/auth/password-reset", { requireAuth: false });
}
```

- [ ] **Step 2: 验证类型与构建**

Run: `pnpm --filter web check-types`
Expected: PASS（`next typegen` 能识别新路由）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api
git commit -m "feat(web): 新增账号安全相关后端代理路由"
```

---

## Task 3: 第三方平台展示映射

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/oauth-providers.ts`
- Test: `apps/web/app/users/[id]/_components/security-tab/oauth-providers.test.ts`

**Interfaces:**
- Produces：`getProviderMeta(source: string): { label: string; short: string; color: string }`；未知 source 兜底 `{ label: source, short: source.slice(0,2).toUpperCase(), color: "#555" }`。

- [ ] **Step 1: 写失败测试**

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getProviderMeta } from "./oauth-providers";

describe("getProviderMeta", () => {
  it("已知平台返回中文名", () => {
    expect(getProviderMeta("github").label).toBe("GitHub");
    expect(getProviderMeta("weibo").label).toBe("微博");
  });
  it("未知平台兜底用 source", () => {
    const m = getProviderMeta("unknownx");
    expect(m.label).toBe("unknownx");
    expect(m.short).toBe("UN");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter web test -- oauth-providers`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

```typescript
interface ProviderMeta {
  label: string;
  short: string;
  color: string;
}

const PROVIDER_MAP: Record<string, ProviderMeta> = {
  github: { label: "GitHub", short: "GH", color: "#24292f" },
  gitee: { label: "Gitee", short: "Ge", color: "#c71d23" },
  qq: { label: "QQ", short: "QQ", color: "#12b7f5" },
  weibo: { label: "微博", short: "Wb", color: "#e6162d" },
  baidu: { label: "百度", short: "Bd", color: "#2932e1" },
};

export function getProviderMeta(source: string): ProviderMeta {
  return (
    PROVIDER_MAP[source] ?? {
      label: source,
      short: source.slice(0, 2).toUpperCase(),
      color: "#555",
    }
  );
}
```

- [ ] **Step 4: 运行确认通过 + Commit**

Run: `pnpm --filter web test -- oauth-providers`
Expected: PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab/oauth-providers.ts apps/web/app/users/[id]/_components/security-tab/oauth-providers.test.ts
git commit -m "feat(security): 新增第三方平台展示映射"
```

---

## Task 4: 提取可复用图形验证码 hook

**Files:**
- Create: `apps/web/hooks/use-captcha-token.tsx`
- Modify: `apps/web/hooks/use-register-form.tsx`
- Test: `apps/web/hooks/use-captcha-token.test.tsx`

**Interfaces:**
- Produces：
  ```typescript
  interface UseCaptchaTokenResult {
    captchaOpen: boolean;
    captchaChallenge: CaptchaChallengeResp | null;
    captchaX: number;
    captchaLoading: boolean;
    setCaptchaX: (x: number) => void;
    setCaptchaOpen: (open: boolean) => void;
    openCaptcha: () => Promise<void>;   // 拉挑战并打开
    handleVerify: (x: number) => Promise<void>; // 校验→成功调 onToken→失败重拉挑战；429 调 onRateLimited
    closeCaptcha: () => void;
  }
  function useCaptchaToken(opts: {
    onToken: (captchaToken: string) => Promise<void>;
    onRateLimited?: (message: string) => void;
  }): UseCaptchaTokenResult;
  ```
- 该 hook 内部调用 `/api/captcha/register/challenge` 与 `/api/captcha/register/verify`（token 通用）。

- [ ] **Step 1: 写失败测试**

`use-captcha-token.test.tsx`（用 `@testing-library/react` 的 `renderHook`，mock `fetch`）：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCaptchaToken } from "./use-captcha-token";

beforeEach(() => vi.restoreAllMocks());

it("openCaptcha 拉挑战并打开", async () => {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
  );
  const { result } = renderHook(() => useCaptchaToken({ onToken: async () => {} }));
  await act(async () => { await result.current.openCaptcha(); });
  expect(result.current.captchaOpen).toBe(true);
  expect(result.current.captchaChallenge?.challenge_id).toBe("c1");
});

it("handleVerify 成功后用拿到的 token 调 onToken", async () => {
  const onToken = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(global, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ captcha_token: "tok123" })));
  const { result } = renderHook(() => useCaptchaToken({ onToken }));
  await act(async () => { await result.current.openCaptcha(); });
  await act(async () => { await result.current.handleVerify(15); });
  expect(onToken).toHaveBeenCalledWith("tok123");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter web test -- use-captcha-token`
Expected: FAIL。

- [ ] **Step 3: 实现 hook**

把 `use-register-form.tsx` 中 `openCaptcha`/`handleCaptchaVerify`/captcha 相关 `useState` 迁入新 hook，泛化为 `onToken` 回调（成功调 `onToken`，429 调 `onRateLimited`，其它失败重拉挑战）。完整实现：

```typescript
"use client";

import { useCallback, useState } from "react";
import type { CaptchaChallengeResp, CaptchaVerifyResp } from "@repo/api";

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { code?: number; message?: string; data?: T };
  if (!res.ok || (data.code != null && data.code !== 0)) {
    const err = new Error(data.message ?? "请求失败") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (data.data ?? (data as unknown)) as T;
}

export function useCaptchaToken(opts: {
  onToken: (captchaToken: string) => Promise<void>;
  onRateLimited?: (message: string) => void;
}) {
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallengeResp | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const closeCaptcha = useCallback(() => {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
  }, []);

  const fetchChallenge = useCallback(async () => {
    const c = await postJson<CaptchaChallengeResp>("/api/captcha/register/challenge");
    setCaptchaChallenge(c);
    setCaptchaX(c.tile_x);
    return c;
  }, []);

  const openCaptcha = useCallback(async () => {
    await fetchChallenge();
    setCaptchaOpen(true);
  }, [fetchChallenge]);

  const handleVerify = useCallback(
    async (x: number) => {
      if (!captchaChallenge) return;
      setCaptchaLoading(true);
      try {
        const result = await postJson<CaptchaVerifyResp>("/api/captcha/register/verify", {
          challenge_id: captchaChallenge.challenge_id,
          x,
          y: captchaChallenge.tile_y,
        });
        await opts.onToken(result.captcha_token);
        closeCaptcha();
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          closeCaptcha();
          opts.onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
          return;
        }
        try {
          await fetchChallenge(); // 失败重拉一张新挑战
        } catch {
          closeCaptcha();
        }
      } finally {
        setCaptchaLoading(false);
      }
    },
    [captchaChallenge, closeCaptcha, fetchChallenge, opts],
  );

  return {
    captchaOpen, captchaChallenge, captchaX, captchaLoading,
    setCaptchaX, setCaptchaOpen, openCaptcha, handleVerify, closeCaptcha,
  };
}
```

然后改 `use-register-form.tsx`：删除迁出的 captcha 状态与函数，改为
`const captcha = useCaptchaToken({ onToken: sendEmailCode, onRateLimited: (m) => addToast(m, "error") });`
并把原暴露给 `register-view` 的 `openCaptcha`/`handleCaptchaVerify`/`captchaChallenge` 等改为转发 `captcha.*`（保持 `register-view` 调用面不变；如字段名不同则同步改 `register-view.tsx`）。

- [ ] **Step 4: 运行全部相关测试确认通过**

Run: `pnpm --filter web test -- use-captcha-token use-register-form register-view`
Expected: PASS（register 既有测试不回归）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-captcha-token.tsx apps/web/hooks/use-captcha-token.test.tsx apps/web/hooks/use-register-form.tsx apps/web/components/auth/register-view.tsx
git commit -m "refactor(captcha): 提取可复用 useCaptchaToken 并接入注册流程"
```

---

## Task 5: 数据容器 + 纯展示列表

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/use-account-security.tsx`
- Create: `apps/web/app/users/[id]/_components/security-tab/security-list.tsx`
- Modify: `apps/web/app/users/[id]/_components/security-tab/security-tab.tsx`
- Test: `apps/web/app/users/[id]/_components/security-tab/security-tab.test.tsx`（已存在，改写）
- Test: `apps/web/app/users/[id]/_components/security-tab/security-list.test.tsx`

**Interfaces:**
- Produces：
  ```typescript
  interface SecurityData {
    username: string;
    passwordSet: boolean;
    mainEmail: string | null;
    subEmail: string | null;
    mailShow: number;            // setting.mail_show
    providers: { source: string; bound: boolean }[];
  }
  function useAccountSecurity(): {
    data: SecurityData | null;
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
  };
  ```
- `SecurityList` 为受控纯展示：`props: { data: SecurityData; onAction: (a: SecurityAction) => void }`，`SecurityAction` 为可辨识联合：`{ type: "username" } | { type: "password" } | { type: "email"; target: "main"|"sub" } | { type: "bind"; source } | { type: "unbind"; source } | { type: "display"; value: "main"|"sub"|"none" }`。

- [ ] **Step 1: 写 `useAccountSecurity` 失败测试**

`security-tab.test.tsx`（mock `@repo/api` client — 配方见 `writing-tests`）：

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SecurityTab } from "./security-tab";

vi.mock("@/lib/client-api", () => ({
  apiClient: {
    users: {
      getMe: vi.fn().mockResolvedValue({
        username: "yevpt", password_set: false, email: "of940417@gmail.com",
        meta: { sub_email: null }, setting: { mail_show: 0 },
      }),
      getProviders: vi.fn().mockResolvedValue(["github", "qq"]),
      getOAuthBindings: vi.fn().mockResolvedValue([{ source: "github", social_user_id: 1 }]),
    },
  },
}));

it("展示真实用户名与邮箱", async () => {
  render(<SecurityTab userId={1} />);
  expect(await screen.findByText("yevpt")).toBeInTheDocument();
  expect(screen.getByText("of940417@gmail.com")).toBeInTheDocument();
});

it("password_set=false 显示「设置」", async () => {
  render(<SecurityTab userId={1} />);
  expect(await screen.findByRole("button", { name: "设置" })).toBeInTheDocument();
});

it("providers∪bindings 合并：github 已绑定，qq 未绑定", async () => {
  render(<SecurityTab userId={1} />);
  expect(await screen.findByText("已绑定")).toBeInTheDocument();
  expect(screen.getByText("未绑定")).toBeInTheDocument();
});
```

> 注：实际 client 引入路径以仓库现有约定为准（如 `@/lib/client-api` 或直接 `@repo/api` 实例），mock 对齐之。

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter web test -- security-tab`
Expected: FAIL。

- [ ] **Step 3: 实现 hook + list + 容器**

`use-account-security.tsx`：挂载时 `Promise.all([getMe(), getProviders(), getOAuthBindings()])`，映射为 `SecurityData`（`mainEmail = me.email ?? null`、`subEmail = me.meta?.sub_email ?? null`、`mailShow = me.setting?.mail_show ?? 0`、`providers = providers.map(s => ({ source: s, bound: bindings.some(b => b.source === s) }))`），暴露 `reload`。失败 set `error`。

`security-list.tsx`：用现有 `SecuritySection`/`SecurityItem` 行结构（从当前 `security-tab.tsx` 抽出复用），按 spec §3 渲染三组：
- 用户名行：值 `data.username`，按钮「修改」→ `onAction({type:"username"})`。
- 密码行：`data.passwordSet` → 徽标「已设置」+「修改」/ 徽标「未设置」+「设置」，按钮 → `onAction({type:"password"})`。
- 主邮箱：`data.mainEmail ?? "未绑定"`，按钮「换绑/绑定」→ `onAction({type:"email",target:"main"})`。
- 副邮箱：同理 `target:"sub"`。
- 对外展示：渲染 `<EmailDisplaySelect>`（Task 8）。
- 第三方：`data.providers.map` → `getProviderMeta(source)`，bound 显示绿徽标+「解绑」(`{type:"unbind"}`)，否则「未绑定」+「绑定」(`{type:"bind"}`)。

`security-tab.tsx` 改为容器：`'use client'`，`const { data, loading, error, reload } = useAccountSecurity();` loading → 复用 `skeleton/`；error → 错误 + 重试按钮；data → `<SecurityList data={data} onAction={dispatch}/>`。`dispatch` 暂时只 `console.warn`（后续 Task 6–10 接 Sheet），但 display 立即可接 Task 8。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter web test -- security-tab security-list`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 账号安全列表对接真实数据"
```

---

## Task 6: 用户名修改 Sheet

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/username-sheet.tsx`
- Modify: `security-tab.tsx`（接 `username` action）
- Test: `username-sheet.test.tsx`

**Interfaces:**
- Consumes：`apiClient.users.updateUsername`、`@repo/ui` `Modal`/`Input`/`Button`/`useToast`。
- Produces：`<UsernameSheet open currentUsername onClose onSuccess />`；`onSuccess` 由容器触发登出流程。

- [ ] **Step 1: 写失败测试**

```typescript
// @vitest-environment jsdom
it("提交新用户名调用 updateUsername", async () => {
  const updateUsername = vi.fn().mockResolvedValue(undefined);
  // mock apiClient.users.updateUsername = updateUsername
  render(<UsernameSheet open currentUsername="yevpt" onClose={() => {}} onSuccess={() => {}} />);
  await userEvent.clear(screen.getByLabelText("用户名"));
  await userEvent.type(screen.getByLabelText("用户名"), "newname");
  await userEvent.click(screen.getByRole("button", { name: "确认修改" }));
  expect(updateUsername).toHaveBeenCalledWith("newname");
});

it("少于 3 字符禁用提交", async () => {
  render(<UsernameSheet open currentUsername="yevpt" onClose={() => {}} onSuccess={() => {}} />);
  await userEvent.clear(screen.getByLabelText("用户名"));
  await userEvent.type(screen.getByLabelText("用户名"), "ab");
  expect(screen.getByRole("button", { name: "确认修改" })).toBeDisabled();
});
```

- [ ] **Step 2: 运行确认失败** — Run: `pnpm --filter web test -- username-sheet` → FAIL。

- [ ] **Step 3: 实现**

`Modal placement="fullscreen-mobile"`，单 `Input`（label「用户名」，3–155 校验），「确认修改」按钮 `disabled={len<3||len>155||submitting}`。提交：`await apiClient.users.updateUsername(value)`；成功 `useToast` 提示「用户名已修改，请重新登录」+ `onSuccess()`；`ApiError` → toast 错误文案。容器 `onSuccess` 调用项目现有登出（参考 `app/api/auth/logout` + 既有登出工具）后跳登录。

- [ ] **Step 4: 运行确认通过 + Commit**

Run: `pnpm --filter web test -- username-sheet security-tab` → PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 用户名修改 Sheet"
```

---

## Task 7: 邮箱换绑/添加 Sheet

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/email-sheet.tsx`
- Modify: `security-tab.tsx`（接 `email` action）
- Test: `email-sheet.test.tsx`

**Interfaces:**
- Consumes：`useCaptchaToken`、`RegisterCaptcha`（复用 `components/auth/register-captcha.tsx`）、`apiClient.users.sendAccountEmailCode`、`apiClient.users.updateEmail`。
- Produces：`<EmailSheet open target currentEmail onClose onSuccess />`，`target: "main"|"sub"`。

- [ ] **Step 1: 写失败测试**

```typescript
it("获取验证码前必须先过图形验证（无 token 不发码）", async () => {
  const sendCode = vi.fn();
  render(<EmailSheet open target="main" currentEmail="a@b.com" onClose={()=>{}} onSuccess={()=>{}} />);
  await userEvent.type(screen.getByLabelText("新邮箱"), "new@x.com");
  await userEvent.click(screen.getByRole("button", { name: "获取验证码" }));
  // 弹出 captcha，未完成滑块前不调用 sendAccountEmailCode
  expect(sendCode).not.toHaveBeenCalled();
});

it("提交调用 updateEmail，带 target/email/code", async () => {
  const updateEmail = vi.fn().mockResolvedValue(undefined);
  render(<EmailSheet open target="sub" currentEmail={null} onClose={()=>{}} onSuccess={()=>{}} />);
  await userEvent.type(screen.getByLabelText("新邮箱"), "sub@x.com");
  await userEvent.type(screen.getByLabelText("邮箱验证码"), "123456");
  await userEvent.click(screen.getByRole("button", { name: /确认/ }));
  expect(updateEmail).toHaveBeenCalledWith({ target: "sub", email: "sub@x.com", code: "123456" });
});
```

- [ ] **Step 2: 运行确认失败** — `pnpm --filter web test -- email-sheet` → FAIL。

- [ ] **Step 3: 实现**

字段：新邮箱 `Input`、`RegisterCaptcha`（受 `useCaptchaToken` 驱动）、验证码行（`Input` +「获取验证码」按钮，60s 倒计时）、提交按钮。
`useCaptchaToken({ onToken: async (t) => { await apiClient.users.sendAccountEmailCode({ email: newEmail, captcha_token: t }); startCountdown(); }, onRateLimited: (m) => toast(m,"error") })`。
「获取验证码」按钮 `onClick={captcha.openCaptcha}`（`disabled` 当邮箱非法或倒计时中）。
提交：`await apiClient.users.updateEmail({ target, email: newEmail, code })` → 成功 toast +`onSuccess()`（容器 `reload`）；错误 toast。
标题：`target==="main" ? "换绑主邮箱" : currentEmail ? "换绑副邮箱" : "添加副邮箱"`。

- [ ] **Step 4: 运行确认通过 + Commit**

Run: `pnpm --filter web test -- email-sheet` → PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 邮箱换绑与添加 Sheet"
```

---

## Task 8: 对外展示邮箱下拉

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/email-display-select.tsx`
- Test: `email-display-select.test.tsx`

**Interfaces:**
- Consumes：`@repo/ui` `Select`、`apiClient.users.updateEmailDisplay`。
- Produces：`<EmailDisplaySelect value subEmailExists onChanged />`；`value: "main"|"sub"|"none"`（由 `mailShow` 数值映射，见实现）。

- [ ] **Step 1: 写失败测试**

```typescript
it("切换为不展示时调用 updateEmailDisplay('none')", async () => {
  const updateEmailDisplay = vi.fn().mockResolvedValue(undefined);
  render(<EmailDisplaySelect value="main" subEmailExists={false} onChanged={()=>{}} />);
  // 通过 @repo/ui Select 选「不展示」
  await selectOption("不展示");
  expect(updateEmailDisplay).toHaveBeenCalledWith("none");
});

it("副邮箱不存在时「副邮箱」选项禁用", async () => {
  render(<EmailDisplaySelect value="main" subEmailExists={false} onChanged={()=>{}} />);
  expect(await findDisabledOption("副邮箱")).toBeTruthy();
});
```

- [ ] **Step 2: 运行确认失败** → FAIL。

- [ ] **Step 3: 实现**

`mailShow` → 展示值映射：约定 `0=none,1=main,2=sub`（**实现前用 `grep mail_show` 核对后端 service 的取值含义，以后端为准**）。`Select` 选项 main/sub/none，sub 在 `!subEmailExists` 时 `isDisabled`。`onSelectionChange`：乐观更新本地值 → `await apiClient.users.updateEmailDisplay(next)` → 失败回滚 + toast；成功 `onChanged()`。

- [ ] **Step 4: 运行确认通过 + 接入 list + Commit**

在 `security-list.tsx` 的「对外展示」行渲染本组件（`value` 由 `mailShow` 映射、`subEmailExists={!!data.subEmail}`、`onChanged={reload}`）。
Run: `pnpm --filter web test -- email-display-select security-list` → PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 对外展示邮箱下拉对接"
```

---

## Task 9: 密码 Sheet（修改 / 设初始 / 找回）

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/password-recovery-form.tsx`
- Create: `apps/web/app/users/[id]/_components/security-tab/password-sheet.tsx`
- Modify: `security-tab.tsx`（接 `password` action）
- Test: `password-recovery-form.test.tsx`、`password-sheet.test.tsx`

**Interfaces:**
- `PasswordRecoveryForm`（可复用，登录页后续复用）：
  `<PasswordRecoveryForm email onDone />`；内部：`useCaptchaToken({ onToken: t => apiClient.auth.passwordResetCode({ email, captcha_token: t }) })` + 验证码 + 新密码 → `apiClient.auth.passwordReset({ email, code, new_password })`。
- `PasswordSheet`：`<PasswordSheet open passwordSet mainEmail onClose onSuccess />`；
  - `passwordSet===true` 默认 A 视图（旧+新+确认 → `updatePassword`），含「忘记原密码？」→ 切 `PasswordRecoveryForm`（email=mainEmail）。
  - `passwordSet===false` 默认 C 视图：`useCaptchaToken({ onToken: t => sendAccountEmailCode({ email: mainEmail, captcha_token: t }) })` + 验证码 + 新密码 → `setInitialPassword({ new_password, code })`。
  - `mainEmail` 为空时 C/B 禁用并提示「请先绑定主邮箱」。

- [ ] **Step 1: 写 `PasswordRecoveryForm` 失败测试**

```typescript
it("重置密码：先发码再 passwordReset", async () => {
  const passwordReset = vi.fn().mockResolvedValue(undefined);
  render(<PasswordRecoveryForm email="a@b.com" onDone={()=>{}} />);
  await userEvent.type(screen.getByLabelText("邮箱验证码"), "123456");
  await userEvent.type(screen.getByLabelText(/新密码/), "Abcd1234");
  await userEvent.click(screen.getByRole("button", { name: "重置密码" }));
  expect(passwordReset).toHaveBeenCalledWith({ email: "a@b.com", code: "123456", new_password: "Abcd1234" });
});
```

- [ ] **Step 2: 写 `PasswordSheet` 失败测试**

```typescript
it("已设密码：默认显示修改表单并可提交 updatePassword", async () => {
  const updatePassword = vi.fn().mockResolvedValue(undefined);
  render(<PasswordSheet open passwordSet mainEmail="a@b.com" onClose={()=>{}} onSuccess={()=>{}} />);
  await userEvent.type(screen.getByLabelText("当前密码"), "Old12345");
  await userEvent.type(screen.getByLabelText(/新密码（/), "New12345");
  await userEvent.type(screen.getByLabelText("确认新密码"), "New12345");
  await userEvent.click(screen.getByRole("button", { name: "确认修改" }));
  expect(updatePassword).toHaveBeenCalledWith("Old12345", "New12345");
});

it("点忘记原密码切到找回视图", async () => {
  render(<PasswordSheet open passwordSet mainEmail="a@b.com" onClose={()=>{}} onSuccess={()=>{}} />);
  await userEvent.click(screen.getByText(/忘记原密码/));
  expect(screen.getByRole("button", { name: "重置密码" })).toBeInTheDocument();
});

it("未设密码：显示设置初始密码（含验证码字段）", async () => {
  render(<PasswordSheet open passwordSet={false} mainEmail="a@b.com" onClose={()=>{}} onSuccess={()=>{}} />);
  expect(screen.getByRole("button", { name: "设置密码" })).toBeInTheDocument();
  expect(screen.getByLabelText("邮箱验证码")).toBeInTheDocument();
});
```

- [ ] **Step 3: 运行确认失败** — `pnpm --filter web test -- password-recovery-form password-sheet` → FAIL。

- [ ] **Step 4: 实现**

先实现 `PasswordRecoveryForm`（主邮箱只读展示 + `RegisterCaptcha` + 验证码行 + 新密码 ≥8 → reset）；再实现 `PasswordSheet`（按 `passwordSet` 选默认视图，A 视图含「忘记原密码？」link `setView("recover")` 渲染 `PasswordRecoveryForm`）。新密码与确认不一致时禁用提交并提示。成功统一 toast +`onSuccess()`（容器：A/C 改密成功提示重新登录并登出；找回成功提示后登出）。

- [ ] **Step 5: 运行确认通过 + Commit**

Run: `pnpm --filter web test -- password-recovery-form password-sheet security-tab` → PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 密码修改/设初始/找回 Sheet"
```

---

## Task 10: 第三方绑定跳转与解绑确认

**Files:**
- Create: `apps/web/app/users/[id]/_components/security-tab/unbind-confirm.tsx`
- Modify: `security-tab.tsx`（接 `bind`/`unbind` action）
- Test: `unbind-confirm.test.tsx`

**Interfaces:**
- `UnbindConfirm`：`<UnbindConfirm open source onClose onSuccess />`；确认 → `apiClient.users.unbindOAuth(source)`；`ApiError` → toast 后端文案（含「最后登录方式」），不关；成功 toast +`onSuccess()`。
- 绑定：容器 `onAction({type:"bind",source})` → `const { authorize_url } = await apiClient.users.authorizeOAuthBind(source, redirectUri); window.location.href = authorize_url;`，`redirectUri = ${location.origin}/users/${userId}?tab=security`。

- [ ] **Step 1: 写失败测试**

```typescript
it("确认解绑调用 unbindOAuth", async () => {
  const unbindOAuth = vi.fn().mockResolvedValue(undefined);
  render(<UnbindConfirm open source="github" onClose={()=>{}} onSuccess={()=>{}} />);
  await userEvent.click(screen.getByRole("button", { name: "解绑" }));
  expect(unbindOAuth).toHaveBeenCalledWith("github");
});

it("后端拒绝时显示错误文案且不触发 onSuccess", async () => {
  // mock unbindOAuth reject ApiError("这是你最后的登录方式，无法解绑")
  const onSuccess = vi.fn();
  render(<UnbindConfirm open source="github" onClose={()=>{}} onSuccess={onSuccess} />);
  await userEvent.click(screen.getByRole("button", { name: "解绑" }));
  expect(await screen.findByText(/最后的登录方式/)).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行确认失败** → FAIL。

- [ ] **Step 3: 实现**

`Modal placement="center" size="sm"`；标题「解绑 {label}？」+ 说明 + 取消/解绑（`Button variant="destructive"`）。解绑：`try { await unbindOAuth(source); toast.success; onSuccess() } catch (e) { setError(e.message) }`，错误用行内红条或 toast 展示。容器接 `bind` action 做跳转（上方 Interfaces）。

- [ ] **Step 4: 运行确认通过 + Commit**

Run: `pnpm --filter web test -- unbind-confirm security-tab` → PASS。

```bash
git add apps/web/app/users/[id]/_components/security-tab
git commit -m "feat(security): 第三方绑定跳转与解绑确认"
```

---

## Task 11: 回跳定位与全量校验

**Files:**
- Modify: `apps/web/app/users/[id]/_components/user-profile-tabs.tsx`（支持 `?tab=security` 初始选中）
- Test: `user-profile-tabs.test.tsx`（已存在，补用例）

- [ ] **Step 1: 写失败测试**

```typescript
it("URL 带 ?tab=security 时初始选中账号安全", () => {
  // mock useSearchParams 返回 tab=security，isEditMode+isOwner
  render(<UserProfileTabs {...ownerEditProps} />);
  expect(screen.getByRole("tab", { name: /账号安全/ })).toHaveAttribute("aria-selected", "true");
});
```

- [ ] **Step 2: 运行确认失败** → FAIL。

- [ ] **Step 3: 实现** — `useState` 初值读 `useSearchParams().get("tab")`，命中 `security` 且该 tab 可见时设为初始 `activeTab`。

- [ ] **Step 4: 全量校验 + Commit**

Run: `pnpm -r check-types && pnpm -r lint && pnpm --filter web test`
Expected: 全 PASS。

```bash
git add apps/web/app/users/[id]/_components/user-profile-tabs.tsx
git commit -m "feat(security): 绑定回跳后定位账号安全 Tab"
```

---

## Self-Review 记录

- **Spec §2 读取**：Task 5 `useAccountSecurity` 覆盖 getMe/providers/bindings 映射。✔
- **Spec §2 写入**：用户名 T6、改密/设初始 T9、邮箱发码+换绑 T7/T9、展示 T8、解绑/绑定 T10、找回 T9。✔
- **Spec §2.3 captcha 复用**：T4 提取 hook，T7/T9 复用。✔
- **Spec §3 主列表**：T5 list + T8 下拉。✔
- **Spec §4 交互**：T6–T10 逐一对应。✔
- **Spec §5 代码改动**：API T1、代理 T2、组件拆分 T3/T5–T11、captcha 提取 T4。✔
- **Spec §6 边界**：无主邮箱(T9 禁用)、改名/改密重登(T6/T9)、回跳(T10/T11)、最后登录方式(T10)、限流倒计时(T7/T9)、token 一次性(T4)。✔
- **类型一致性**：`SecurityData`/`SecurityAction`/`useCaptchaToken` 签名跨任务一致。✔
- **待实现期核对项**（非占位符，是「以后端为准」的显式校验点）：`mail_show` 数值↔main/sub/none 映射（T8 实现前 grep 后端确认）；client 在 web 的引入路径（T5 mock 对齐仓库现有约定）；`register-view` 与 `useCaptchaToken` 字段名衔接（T4）。
