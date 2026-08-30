# GitHub OAuth 登录对接设计文档

**日期：** 2026-06-12  
**状态：** 已批准，待实现

---

## 背景

后端已完整实现 GitHub OAuth 流程（`/oauth/:source/authorize` 和 `/oauth/:source/callback`）。前端登录弹窗中的 `OAuthGrid` 图标按钮目前是静态的，点击无任何行为。本设计将前端与后端 OAuth 流程完整对接。

---

## 核心流程（Popup 方案）

```
用户点击 GitHub 按钮
  → 前端调用 /api/oauth/github/authorize 取得 authorize_url
  → window.open(authorize_url) 弹出 popup
  → 用户在 GitHub 完成授权
  → GitHub 重定向至 https://www.yevpt.com/oauth/github/callback?code=...&state=...
  → 回调页调用 /api/oauth/github/callback（服务端代理 + 设 Cookie）
  → 回调页 postMessage({ type: 'oauth_success', user }) 给父窗口
  → 父窗口监听消息 → 关闭登录弹窗 → 显示欢迎 toast
```

选择 Popup（而非整页跳转）的原因：用户始终留在原页面，与已有 Modal 交互体验一致，无需处理"回跳后恢复滚动位置/弹窗状态"等问题。

---

## 架构

### 1. 类型定义（`packages/api/src/types/auth.ts`）

新增：

- `OAuthAuthorizeResp` — `{ authorize_url: string }`
- `OAuthCallbackResp` — `{ action: string; login?: LoginResp }`
- 同步导出至 `packages/api/src/index.ts`

### 2. Next.js API 代理路由

**`GET /api/oauth/[source]/authorize`**

- 从 query 接收 `redirect_uri`
- 服务端转发至 `{API_BASE_URL}/oauth/:source/authorize?action=login&redirect_uri=...`
- 直接透传后端响应（`{ authorize_url }`）给客户端

**`GET /api/oauth/[source]/callback`**

- 从 query 接收 `code`、`state`
- 服务端转发至 `{API_BASE_URL}/oauth/:source/callback?code=...&state=...`
- 成功时（`login` 字段存在）：写入 `access_token` / `refresh_token` httpOnly Cookie（与 `/api/auth/login` 一致）
- 向客户端返回 `{ code: 0, data: { user } }`

### 3. 回调页（`app/oauth/[source]/callback/page.tsx`）

- 客户端组件（`'use client'`）
- `useEffect` 中读取 `useSearchParams()` 的 `code` 和 `state`
- 调用 `/api/oauth/[source]/callback`
- **有 opener**：`window.opener.postMessage` 传递结果后 `window.close()`
- **无 opener**（直接导航）：重定向至 `/`，通过 sessionStorage 传递 toast 信息

### 4. OAuthGrid（`components/auth/oauth-grid.tsx`）

新增 `onSuccess?: (user: UserResp) => void` prop。

GitHub 按钮点击逻辑：

1. 调用 `/api/oauth/github/authorize?action=login&redirect_uri=<origin>/oauth/github/callback`
2. `window.open(authorize_url, '_blank', 'width=600,height=700')`
3. `window.addEventListener('message', handler)` 监听回调结果
4. 收到 `{ type: 'oauth_success', user }` → 调用 `onSuccess(user)` → 移除监听器

非 GitHub 的其他按钮：暂时点击后显示"暂未开放"toast（现有行为）。

### 5. LoginView（`components/auth/login-view.tsx`）

将 `onSuccess` 传递给 `OAuthGrid`。

---

## 错误处理

| 场景                           | 处理方式                                            |
| ------------------------------ | --------------------------------------------------- |
| 后端返回 `code != 0`           | 回调页显示错误信息，3 秒后关闭                      |
| popup 被浏览器拦截             | OAuthGrid 捕获异常，显示 toast 提示"请允许弹出窗口" |
| 用户关闭 popup                 | 超时或监听 `storage` 事件清理，父窗口静默           |
| state 校验失败（后端返回 400） | 同"后端 code != 0"处理                              |

---

## 测试覆盖

- `app/api/oauth/[source]/authorize/route.test.ts` — 代理请求、参数透传
- `app/api/oauth/[source]/callback/route.test.ts` — Cookie 写入逻辑、错误透传
- `app/oauth/[source]/callback/page.test.tsx` — postMessage 发送、无 opener 重定向
- `components/auth/oauth-grid.test.tsx` — 更新现有测试，覆盖 onSuccess prop 和 popup 触发

---

## 不在本次范围内

- 动态从 `/oauth/providers` 拉取支持的平台列表
- 账号绑定（bind）流程
- 解绑（unbind）功能
