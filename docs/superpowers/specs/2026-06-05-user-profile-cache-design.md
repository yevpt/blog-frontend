# 设计文档：用户详情缓存 & 头像对接

日期：2026-06-05  
状态：已通过

---

## 背景

登录后从 JWT 解码的 `UserResp` 只含基础字段（id / username / nickname / email / roles），不含 `avatar_url`。`GET /users/me` 接口返回完整用户详情（`UserDetailResp`），包含头像 URL 等扩展字段。

目标：
1. 登录完成时调用一次 `/users/me`，将扩展字段存入客户端可读 cookie。
2. 后续页面加载从 cookie 读取，无需再次请求 API。
3. Navbar 头像对接真实 `avatar_url`。

---

## 方案选择

采用**方案 A：Route Handler 写 Cookie + SSR 读取**。

- `/api/auth/login` route handler 在登录成功后立即调一次 `/users/me`，写入 `user_profile` cookie。
- `getSession()` 在每次 SSR 时读取该 cookie，注入 `SessionProvider`。
- `/users/me` 严格只在登录时调用一次，页面导航/刷新仅读 cookie。

---

## 数据结构

### `UserProfileCache`（新增，`packages/api/src/types/user.ts`）

只存 `UserResp` 中不存在的扩展字段，避免冗余：

```typescript
export interface UserProfileCache {
  avatar_url?: string;  // 头像（核心需求）
  site?: string;        // 个人网站
  mark?: string;        // 个人简介
}
```

排除字段：`phone`（隐私）、`status / last_login_at`（UI 无关）、`meta / setting / social_links`（体积过大）。

### `Session`（修改，`apps/web/lib/session.ts`）

```typescript
export interface Session {
  user: UserResp;
  profile: UserProfileCache | null;
}
```

### `SessionContextValue`（修改，`apps/web/app/providers/session-provider.tsx`）

```typescript
interface SessionContextValue {
  user: UserResp | null;
  profile: UserProfileCache | null;
}
```

---

## Cookie 规范

| 属性 | 值 |
|------|----|
| 名称 | `user_profile` |
| 内容 | `JSON.stringify(UserProfileCache)` |
| httpOnly | `false`（客户端 JS 可读可改） |
| secure | `true`（生产环境） |
| sameSite | `lax` |
| maxAge | `60 * 60 * 24 * 7`（7 天，与 refresh token 对齐） |
| path | `/` |

---

## 数据流

### 登录时（写入）

```
POST /api/auth/login
  ↓ Go 后端返回 access_token + refresh_token + UserResp
  ↓ 写入 access_token、refresh_token（httpOnly cookie）
  ↓ 用新 access_token 调用 GET /users/me（一次，仅此一次）
  ↓ 摘取 UserProfileCache 字段，写入 user_profile cookie
  ↓ 返回 { code: 0, data: { user } } 给前端
```

`/users/me` 失败时：catch 后继续，登录仍成功，`user_profile` 不写（降级为基础信息）。

### 页面加载时（读取）

```
layout.tsx（Server Component）
  ↓ getSession()
      ↓ 读取 access_token cookie → 解码 JWT → UserResp
      ↓ 读取 user_profile cookie → JSON.parse → UserProfileCache
      ↓ 返回 Session { user, profile }
  ↓ SessionProvider user={session.user} profile={session.profile}
  ↓ 客户端组件 useSession() → { user, profile }
```

### 退出登录时（清除）

`/api/auth/logout` 同步清除 `access_token`、`refresh_token`、`user_profile` 三个 cookie（`maxAge: 0`）。

---

## 头像对接

`NavbarUserMenu` 改为从 `useSession()` 获取 `profile`，传给 `UserAvatar`：

```typescript
const { user, profile } = useSession();
const displayName = user.nickname ?? user.username;
<UserAvatar src={profile?.avatar_url} name={displayName} size="md" />
```

`UserAvatar` 已支持 `src` prop，无需修改。

---

## 变更文件清单

| 文件 | 变更类型 |
|------|---------|
| `packages/api/src/types/user.ts` | 新增 `UserProfileCache` 类型 |
| `packages/api/src/index.ts` | 导出 `UserProfileCache` |
| `apps/web/lib/session.ts` | `Session` 新增 `profile`，读取 `user_profile` cookie |
| `apps/web/lib/session.test.ts` | 新增 `profile` 解析测试 |
| `apps/web/app/providers/session-provider.tsx` | `SessionContextValue` 新增 `profile` |
| `apps/web/app/api/auth/login/route.ts` | 登录后调用 `/users/me`，写入 `user_profile` cookie |
| `apps/web/app/api/auth/login/route.test.ts` | 新增 `user_profile` cookie 写入测试 |
| `apps/web/app/api/auth/logout/route.ts` | 清除 `user_profile` cookie |
| `apps/web/components/navbar/navbar-user-menu.tsx` | 从 `useSession()` 获取 `profile`，传 `src` 给 `UserAvatar` |
| `apps/web/components/navbar/navbar-user-menu.test.tsx` | 新增头像 src 传入测试 |

---

## 测试要求

### `lib/session.test.ts`
- `user_profile` cookie 存在且合法时，`profile` 正确解析
- `user_profile` cookie 缺失时，`profile` 为 `null`
- `user_profile` cookie 内容非法 JSON 时，`profile` 降级为 `null`，不抛异常

### `app/api/auth/login/route.test.ts`
- 登录成功 + `/users/me` 成功 → 响应包含 `user_profile` cookie
- 登录成功 + `/users/me` 失败 → 登录仍成功，无 `user_profile` cookie
- 登录失败 → 无任何 cookie

### `navbar-user-menu.test.tsx`
- `profile.avatar_url` 有值时，`UserAvatar` 渲染 `<img>` 元素
- `profile` 为 `null` 时，`UserAvatar` 渲染首字母 fallback
