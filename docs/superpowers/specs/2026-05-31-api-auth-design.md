# API 层与认证架构设计

**日期**：2026-05-31  
**状态**：待实现  
**涉及范围**：`packages/api`（新建）、`apps/admin`（认证层）、`apps/web`（认证层）、`blog-backend`（CORS）

---

## 一、背景与目标

博客前端（Monorepo）需要与 Go 后端建立 API 通信层。后端已实现认证模块（`/auth/*`），采用双 Token 机制（access token + refresh token rotation）。

目标：
1. 在 `packages/api` 封装框架无关的 HTTP 工厂函数，供 `web` 和 `admin` 共用
2. `admin`（Vite SPA）实现客户端 JWT 认证流程
3. `web`（Next.js App Router）实现基于 httpOnly Cookie 的服务端安全认证流程
4. 调通后端 `/auth/*` 四个接口

---

## 二、后端接口概览

基础 URL：`http://localhost:8080`（本地开发）

所有接口返回统一格式：
```json
{ "code": 0, "message": "ok", "data": { ... } }
```
`code` 为 `0` 表示成功，非 `0` 为业务错误（400/401/403/429/500）。HTTP 状态码与 `code` 对齐。

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| POST | `/auth/send-code` | 发送邮箱验证码 | 严格限流 |
| POST | `/auth/register` | 邮箱注册（消耗验证码） | 严格限流 |
| POST | `/auth/login` | 登录（返回双 Token + 用户信息） | 普通限流 |
| POST | `/auth/refresh` | 用 refresh token 换新双 Token | 无限流 |

登录成功响应 `data` 结构：
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 7200,
  "user": { "id": 1, "username": "...", "email": "...", "nickname": "...", "roles": ["admin"] }
}
```

---

## 三、架构方案：共享基础工厂 + 各 App 注入 Token 策略

### 选型依据

- **方案 A**（共享类型 only）：HTTP 逻辑重复写两遍，维护成本高。
- **方案 B（采用）**：`packages/api` 提供类型 + `createApiClient()` 工厂；工厂接受 token 来源回调，两个 App 各自注入适合自身框架的策略。
- **方案 C**（连 token 存储也放共享包）：`web` 用 httpOnly Cookie、`admin` 用 localStorage，策略天然不同，强行共享会使包充满条件分支。

---

## 四、`packages/api` 设计

### 目录结构

```
packages/api/
├── src/
│   ├── types/
│   │   └── auth.ts        # 与后端 DTO 一一对应的 TypeScript 类型
│   ├── errors.ts          # ApiError 统一错误类
│   ├── client.ts          # createApiClient 工厂函数（核心）
│   └── index.ts           # 统一导出
├── package.json
└── tsconfig.json
```

### 类型定义（`src/types/auth.ts`）

与后端 `internal/dto/auth.go` 一一对应：

```typescript
export interface SendCodeReq { email: string }
export interface RegisterReq { email: string; password: string; code: string; nickname?: string }
export interface LoginReq { identifier: string; password: string }
export interface RefreshReq { refresh_token: string }

export interface UserResp { id: number; username: string; email?: string; nickname?: string; roles?: string[] }
export interface LoginResp { access_token: string; refresh_token: string; expires_in: number; user: UserResp }
export interface TokenResp { access_token: string; refresh_token: string; expires_in: number }
```

### 统一错误类（`src/errors.ts`）

```typescript
export class ApiError extends Error {
  constructor(
    public readonly code: number,   // 后端业务错误码（400/401/403/429/500）
    public readonly message: string
  ) { super(message) }
}
```

### 工厂函数配置接口（`src/client.ts`）

```typescript
export interface ApiClientConfig {
  baseUrl: string;

  // token 来源回调（框架无关，支持同步和异步）
  getAccessToken: () => string | null | Promise<string | null>;
  getRefreshToken?: () => string | null | Promise<string | null>;

  // token 刷新成功后的回调，用于各 App 更新本地存储
  onTokenRefreshed?: (tokens: TokenResp) => void | Promise<void>;

  // token 刷新失败（refresh token 也过期），用于各 App 执行登出逻辑
  onRefreshFailed?: () => void | Promise<void>;
}
```

### 内部 fetch 流程

```
调用 api.auth.xxx()
  ↓
附加 Authorization: Bearer <accessToken>（若有）
  ↓
发起 fetch 请求
  ↓
解析响应体 { code, message, data }
  ↓
code !== 0 → 抛出 ApiError(code, message)
  ↓（若 HTTP 401）
读取 refreshToken → 调用 POST /auth/refresh
  ↓ 成功 → 调用 onTokenRefreshed → 重试原请求
  ↓ 失败 → 调用 onRefreshFailed → 抛出 ApiError(401, ...)
```

### 工厂返回结构

```typescript
createApiClient(config) → {
  auth: {
    sendCode(req: SendCodeReq): Promise<void>
    register(req: RegisterReq): Promise<UserResp>
    login(req: LoginReq): Promise<LoginResp>
    refresh(req: RefreshReq): Promise<TokenResp>
  }
  // 后续扩展：posts, users, comments ...
}
```

### 测试覆盖要求

`packages/api/src/client.test.ts`：
- `sendCode` / `register` / `login` / `refresh` 正常调用
- `code !== 0` 时抛出 `ApiError`
- HTTP 401 触发自动刷新并重试
- 刷新失败时调用 `onRefreshFailed`

---

## 五、`admin` 认证架构

Admin 是纯客户端 Vite SPA，无服务端，直连 Go 后端。

### Token 存储策略

| Token | 存储位置 | 原因 |
|---|---|---|
| `access_token` | Zustand 内存状态 | 短期有效（2h），不需持久化；内存存储防止 XSS 直接读取 |
| `refresh_token` | `localStorage` | 长期有效，需跨页面刷新持久化，用于静默续期 |

### 前置依赖

Admin 目前没有路由库，需安装 `react-router-dom`（v7）以支持 `<Route>`、`useNavigate` 等。

### 目录结构

```
apps/admin/src/
├── lib/
│   └── api.ts             # 创建并导出全局 apiClient 实例（注入 Zustand token provider）
├── store/
│   └── auth.ts            # Zustand auth store：user 信息 + accessToken + 刷新/登出逻辑
├── components/
│   └── AuthGuard.tsx      # 路由守卫：读 Zustand，未登录则跳转 /login
└── pages/
    └── LoginPage.tsx      # 登录页，调用 apiClient.auth.login()
```

### App 启动时的静默续期流程

```
App 挂载（main.tsx）
  ↓
读取 localStorage 中的 refresh_token
  ↓ 存在
调用 POST /auth/refresh
  ↓ 成功 → 新 accessToken 存入 Zustand，新 refreshToken 写入 localStorage
  ↓ 失败 → 清除 localStorage → 用户需手动登录
  ↓
AuthGuard 检查 Zustand 中 accessToken 是否存在，决定是否放行路由
```

### `apiClient` 注入配置

```typescript
// apps/admin/src/lib/api.ts
import { createApiClient } from '@repo/api'
import { useAuthStore } from '../store/auth'

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,

  // 从 Zustand store 读取（在组件树外可用，无需 hook）
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => localStorage.getItem('refresh_token'),

  // 刷新成功：更新 Zustand 状态和 localStorage
  onTokenRefreshed: (tokens) => {
    useAuthStore.getState().setAccessToken(tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
  },

  // 刷新失败：清除所有认证状态，跳转登录页
  onRefreshFailed: () => {
    useAuthStore.getState().logout()
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
  },
})
```

### 测试覆盖要求

- `store/auth.test.ts`：初始状态、login/logout 状态变更、token 更新
- `components/AuthGuard.test.tsx`：已登录放行、未登录重定向

---

## 六、`web` 认证架构

Web 是 Next.js App Router 应用，安全要求更高。核心原则：**JS 永远拿不到 token，token 只在服务器之间流转**。

### Token 存储策略

| Token | 存储位置 | 谁能读取 |
|---|---|---|
| `access_token` | httpOnly Cookie | Server Component、Middleware、Route Handler |
| `refresh_token` | httpOnly Cookie | 同上 |
| 当前用户信息 | React Context（内存） | Client Component（从 Server 传入，不含 token） |

选择 React Context 而非 Zustand 的原因：
- 用户信息由 Server Component 读 cookie 后作为 props 注入 `SessionProvider`，契合 Context 单向传递模型
- 登录/退出均会整页刷新，Context 随之重建，无需 Zustand 的细粒度更新
- Zustand 在 Next.js App Router 中需要"store per request"模式防止跨请求状态污染，复杂度等同于 Context

### 目录结构

```
apps/web/
├── middleware.ts                    # 拦截所有请求：检查 token → 静默刷新 → 保护路由
├── app/
│   ├── api/auth/
│   │   ├── login/route.ts          # POST：调 Go → 设 httpOnly Cookie → 返回 user 信息
│   │   ├── register/route.ts       # POST：透传 Go → 返回 user 信息（注册后需单独登录）
│   │   ├── send-code/route.ts      # POST：透传 Go（纯转发）
│   │   └── logout/route.ts         # POST：清除 Cookie
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx            # Client Component：表单 → POST /api/auth/login
│   │   └── register/
│   │       └── page.tsx            # Client Component：表单 → POST /api/auth/register
│   └── layout.tsx                  # Server Component：读 cookie → 注入 SessionProvider
└── lib/
    ├── server-api.ts               # createServerApiClient()：Server Component / Action 专用
    └── session.ts                  # getSession()：从 cookies() 解析当前用户信息
```

### 三种认证调用路径

**路径 ①：Server Component 直接读数据**
```
Server Component
  → createServerApiClient()（从 cookies() 读 access_token）
  → 直接请求 Go 后端（token 不经过浏览器）
```

**路径 ②：Client Component 需要认证操作（如评论、收藏）**
```
Client Component
  → fetch('/api/auth/xxx') 或业务 Route Handler
  → Route Handler 从 httpOnly Cookie 读 token → 请求 Go 后端
  （token 全程不暴露给浏览器 JS）
```

**路径 ③：当前用户信息流向 Client Component**
```
layout.tsx（Server Component）
  → getSession() 读 cookie → 解析 user 信息
  → <SessionProvider initialUser={user}>   // React Context
  → Client Component 通过 useSession() Hook 读取用户信息
```

### Next.js Middleware 流程

Next.js Middleware 运行在 **Edge Runtime**（非 Node.js），不能使用 `jsonwebtoken`。需安装 `jose`（Edge 兼容的 JWT 库）来解码 token 的 `exp` 字段判断是否过期。

```
每次请求进来
  ↓
路径是否匹配保护名单（/profile、/vip/* 等）？
  ↓ 否 → 放行
  ↓ 是 → 读取 access_token Cookie
    ↓ 存在且 exp > now（用 jose 解码 JWT payload）→ 放行
    ↓ 不存在或已过期 → 读取 refresh_token Cookie
      ↓ 存在 → 调 Go POST /auth/refresh → 写入新 Cookie → 放行
      ↓ 不存在/刷新失败 → redirect('/login?from=原路径')
```

### `createServerApiClient` 设计

```typescript
// apps/web/lib/server-api.ts
// 只能在 Server Component / Server Action / Route Handler 中调用（依赖 next/headers）
import { cookies } from 'next/headers'
import { createApiClient } from '@repo/api'

export async function createServerApiClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value ?? null

  return createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => accessToken,
    // 服务端不做自动刷新：middleware 已在请求到达页面前完成刷新
    // 若到这里还 401，说明用户真的未登录，直接报错即可
    onRefreshFailed: () => {},
  })
}
```

### 测试覆盖要求

- `app/api/auth/login/route.test.ts`：成功设置 Cookie、Go 后端报错时返回正确状态码
- `lib/session.test.ts`：Cookie 存在返回 user、Cookie 不存在返回 null
- `app/(auth)/login/page.test.tsx`：表单渲染、提交成功跳转

---

## 七、后端 CORS 配置（需同步修改）

Go 后端 `router.go` 目前没有 CORS 中间件，浏览器发起的跨域请求会被拦截。需要在实现阶段补充。

**允许 `*` 的原因分析：**
- `web` 的认证请求经由 Next.js Route Handler 转发（服务器间通信），CORS 规则不适用
- `admin` 直接请求 Go，使用 `Authorization: Bearer` header，不使用 `credentials: 'include'`（Cookie 模式），`*` 无浏览器限制
- 生产环境由 Nginx 在前，Go 层的 `*` 不直接对外暴露

**配置方式：**
- 允许来源：通过环境变量 `CORS_ALLOWED_ORIGINS` 控制，默认值 `*`
- 允许方法：`GET, POST, PUT, DELETE, OPTIONS`
- 允许 Headers：`Content-Type, Authorization`
- 建议使用 `github.com/gin-contrib/cors`

---

## 八、实现结束后的收尾任务

实现完成后需同步更新以下两个文件，补充 `packages/api` 相关规范：

- `/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/CLAUDE.md`
- `/Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/.cursorrules`

补充内容：
- HTTP 请求统一通过 `@repo/api` 的 `createApiClient()` 初始化，禁止在 `apps/*` 手写 fetch 封装
- `packages/api` 只含类型和框架无关工厂，不含 token 存储和框架特定代码
- 新增 API 接口：先在 `packages/api/src/types/` 补充类型，再添加调用方法
