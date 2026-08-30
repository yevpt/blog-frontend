# 设计文档：用户资料实时化 & 头像对接

日期：2026-06-05  
状态：已通过（第二版）

---

## 背景与问题

1. JWT Claims 存储了 `username`、`roles` 等可变字段，用户修改角色/昵称后旧 token 内的数据不会更新，导致鉴权信息滞后。
2. 前端 `UserResp` 无 `avatar_url`，Navbar 头像只能显示首字母 fallback。
3. 需要在不增加数据库压力的前提下，保证每次页面加载拿到完整且最新的用户资料。

---

## 方案概述

- **后端**：JWT 只存 `userId`，用户资料缓存至 Redis（滑动 7 天 TTL），Auth 中间件从 Redis/DB 实时拉取用户状态；用户信息变更时主动失效缓存。
- **前端**：每次 SSR 首屏加载时，Server Component 通过 `/users/me`（Redis 支撑，极快）获取完整资料，注入 `SessionProvider` 全局状态；客户端侧导航不重复请求。

---

## 后端变更

### 1. JWT 瘦身（`pkg/jwt/jwt.go`）

移除 `Claims` 中的 `Username string` 和 `Roles []string`，只保留 `UserId` 和 `TokenType`：

```go
type Claims struct {
    UserId    int64  `json:"uid"`
    TokenType string `json:"type"` // "access" | "refresh"
    jwtlib.RegisteredClaims
}
```

`GenerateAccess` / `GenerateRefresh` 签名简化为只接受 `userId int64`。

### 2. 用户资料 Redis 缓存层（新建 `internal/service/user_cache.go`）

```go
type UserCacheService interface {
    Get(ctx context.Context, userId int64) (*dto.UserDetailResp, error)
    Set(ctx context.Context, userId int64, profile *dto.UserDetailResp) error
    Invalidate(ctx context.Context, userId int64) error
}
```

- **Key**：`user:profile:{uid}`
- **Value**：JSON 序列化 `UserDetailResp`
- **TTL**：7 天滑动窗口，每次读取通过 `GETEX`（Redis 6.2+）原子刷新；低版本用 GET + EXPIRE pipeline
- **Cache miss**：`repo.FindDetailByID` → 写入 Redis → 返回数据

**性能说明**：`GETEX` 单命令约 0.1–0.5ms，远快于 SQL 主键查询（1–5ms）。

### 3. Auth 中间件增强（`internal/middleware/auth.go`）

```
Bearer token → JWT 解析（仅提取 userId）
  ↓
UserCacheService.Get(userId)   // Redis 优先，miss 则读 DB
  ↓
检查 user.Status ≠ 1 → 401 Unauthorized
  ↓
将 *dto.UserDetailResp 写入 gin.Context（key: userDetailKey）
```

新增辅助函数 `GetUserDetail(c *gin.Context) *dto.UserDetailResp`，供 handler 使用，替代原 `GetClaims(c).Roles`。

### 4. 登录服务更新（`internal/service/auth/auth.go`）

- `Login`：JWT 生成只传 `userId`；登录成功后调用 `UserCacheService.Set()` 预热缓存。
- `Refresh`：解析 refresh token 取 `userId` → `UserCacheService.Get()` 读取最新用户信息（保证角色实时） → 签发仅含 `userId` 的新双 token。

### 5. `/users/me` 使用缓存（`internal/service/user_detail.go`）

`UserService.GetDetail()` 改为调用 `UserCacheService.Get()`，不再直接查 DB。

### 6. 缓存失效时机

| 触发事件                   | 操作                         |
| -------------------------- | ---------------------------- |
| 用户修改昵称/头像/基本资料 | `Invalidate` + `Set`（重建） |
| 管理员修改用户角色         | 同上                         |
| 用户被禁用/注销            | `Invalidate`                 |

---

## 前端变更

### 数据结构

`UserProfileCache` 类型**不再需要**，直接使用 `UserDetailResp`（来自 `@repo/api`）。

```typescript
// apps/web/lib/session.ts
export interface Session {
  userId: number; // 仅从 JWT 解码
}

// apps/web/app/providers/session-provider.tsx
interface SessionContextValue {
  userId: number | null;
  profile: UserDetailResp | null; // 来自 /users/me；未登录或请求失败时为 null
}
```

### SSR 数据流（`layout.tsx`）

```
每次首屏 SSR（非客户端侧导航）：

getSession()                         // 解码 JWT → userId
  ↓（已登录）
createServerApiClient().users.getMe() // 读 Redis，~0.2ms
  ↓
<SessionProvider userId={userId} profile={profile}>
  ↓
useSession() → { userId, profile }
```

客户端侧路由切换（Next.js SPA 导航）不触发 SSR，`/users/me` 不重复调用。

### 头像接入

```typescript
// NavbarUserMenu / NavbarActions
const { userId, profile } = useSession();
const displayName = profile?.nickname ?? profile?.username ?? "";
<UserAvatar src={profile?.avatar_url} name={displayName} size="md" />
```

`UserAvatar` 已支持 `src` prop，无需修改。

### 登录 Route Handler 简化

`/api/auth/login/route.ts` 不再调用 `/users/me`，仅设置 `access_token`/`refresh_token` cookie，返回基础 `UserResp`（用于登录成功 Toast）。

`/api/auth/logout/route.ts` 无需清除 `user_profile` cookie（该 cookie 不再存在）。

`proxy.ts` 无需修改。

---

## 变更文件清单

### 后端（`blog-backend`）

| 文件                              | 变更类型                                     |
| --------------------------------- | -------------------------------------------- |
| `pkg/jwt/jwt.go`                  | 移除 Username/Roles，精简 Generate 方法签名  |
| `internal/service/user_cache.go`  | **新建** Redis 缓存服务                      |
| `internal/middleware/auth.go`     | 中间件增强：Redis 读取用户资料，设置 context |
| `internal/service/auth/auth.go`   | Login/Refresh 适配精简 JWT + 缓存预热        |
| `internal/service/user_detail.go` | GetDetail 走缓存层                           |
| `internal/wire/` 或 DI 入口       | 注入 UserCacheService                        |

### 前端（`blog-frontend`）

| 文件                                                   | 变更类型                             |
| ------------------------------------------------------ | ------------------------------------ |
| `packages/api/src/types/user.ts`                       | 移除 UserProfileCache（不再需要）    |
| `packages/api/src/index.ts`                            | 同步更新导出                         |
| `apps/web/lib/session.ts`                              | Session 只含 userId，getSession 精简 |
| `apps/web/lib/session.test.ts`                         | 更新测试                             |
| `apps/web/app/layout.tsx`                              | 首屏 SSR 调用 /users/me              |
| `apps/web/app/providers/session-provider.tsx`          | Context 增加 profile                 |
| `apps/web/app/api/auth/login/route.ts`                 | 移除 /users/me 调用（简化）          |
| `apps/web/components/navbar/navbar-actions.tsx`        | 用 userId 判断登录态                 |
| `apps/web/components/navbar/navbar-user-menu.tsx`      | 用 profile 取头像/名称               |
| `apps/web/components/navbar/navbar-user-menu.test.tsx` | 更新头像测试                         |

---

## 测试要求

### 后端

- `UserCacheService.Get`：Redis 命中返回缓存；miss 时读 DB 并回填；用户不存在返回 nil
- Auth 中间件：无 token → 401；token 过期 → 401；用户被禁用 → 401；正常 → context 含用户资料
- `Refresh`：用旧 token 签发新 token，roles 来自 Redis/DB（不来自旧 token）

### 前端

- `getSession()`：有效 token → `{ userId }`；无 token → null；过期 token → null
- `layout.tsx`：已登录时 `SessionProvider` 接收到 `profile`；未登录时 `profile` 为 null
- `NavbarUserMenu`：`profile.avatar_url` 有值时渲染 `<img>`；`profile` 为 null 时显示首字母 fallback
