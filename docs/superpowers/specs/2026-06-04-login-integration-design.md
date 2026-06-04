# 登录接口对接设计

**日期**：2026-06-04  
**范围**：`apps/web` 登录表单接口对接、表单校验、登录失败报错、成功后弹窗关闭 + 全局 Toast 通知；不含 OAuth 登录

---

## 背景与约束

- 后端 `POST /auth/login` 接受 `{ identifier, password }`（支持 username / email / phone 三合一），返回双 token + user 信息
- Next.js Route Handler `apps/web/app/api/auth/login/route.ts` 已实现：转发请求 → 写 httpOnly Cookie → 只向客户端返回 `user` 对象
- `LoginView` 目前是纯 UI 存根，表单无状态绑定
- 项目已有 `SessionProvider`（React Context）+ `getSession()`（Server Component 层读 JWT Cookie），登录后调用 `router.refresh()` 即可让服务端重新读 cookie 更新整棵树，无需额外 Zustand auth store
- Toast 系统全站暂缺，本次顺带建立，后续注册/评论等功能可复用

---

## 架构

### 1. Toast 系统（packages/ui + apps/web 分层）

**原则**：UI 组件放 `packages/ui`（无全局状态、可跨 app 复用）；Queue 实例和 helper 放 `apps/web`（app 级状态）

| 文件 | 职责 |
|---|---|
| `packages/ui/src/toast/toast.tsx` | `ToastRegion`（容器）+ 内部 `ToastItem`（单条）纯 UI 组件，接受 `queue` prop |
| `packages/ui/src/toast/toast.test.tsx` | 组件渲染 / 关闭交互 |
| `packages/ui/src/index.ts` | 追加导出 `ToastRegion`、`ToastItem` |
| `apps/web/lib/toast.ts` | 创建全局 `toastQueue` 实例；导出 `addToast(message, type?)` helper |
| `apps/web/app/providers/global-modals.tsx` | 追加渲染 `<ToastRegion queue={toastQueue} />`（Client Component） |

**依赖**：`react-aria-components@1.18.0`（已安装）中的 `UNSTABLE_ToastQueue`、`UNSTABLE_ToastRegion`、`UNSTABLE_Toast`，无需新增依赖。

**Toast 类型**：
```ts
type ToastType = 'success' | 'error' | 'info'
// queue content: { message: string; type?: ToastType }
```

**样式**：固定在视口右下角，`success` 绿色、`error` 红色、`info` 默认色，自动 4s 后消失，支持手动关闭。

---

### 2. LoginView 改造

**新增 prop**：`onSuccess: (user: UserResp) => void`

**新增状态**：`identifier: string`、`password: string`、`loading: boolean`、`error: string | null`

**表单校验**（提交前，不调接口）：

| 条件 | error 文案 |
|---|---|
| `identifier` 为空 | 请输入账号 / 邮箱 / 手机号 |
| `password` 为空 | 请输入密码 |

**提交流程**：
1. 校验不通过 → `setError(message)` 直接返回
2. `setLoading(true)`，`setError(null)`
3. `POST /api/auth/login` with `{ identifier, password }`
4. 成功 → `onSuccess(data.user)`
5. 失败 → `setError(json.message)`（直接展示后端文案：`"账号或密码错误"`、`"账号已被禁用"` 等）
6. `finally`: `setLoading(false)`

**错误展示**：表单底部一行小字（与 `RegisterView` 的 `status` 行风格一致）；submit 按钮在 `loading` 时 disabled 并显示"登录中…"。

---

### 3. LoginModal 改造

向 `LoginView` 传入 `onSuccess`：

```ts
function handleLoginSuccess(user: UserResp) {
  close()           // 关闭弹窗（useLoginModal）
  addToast(`欢迎回来，${user.nickname ?? user.username}`, 'success')
  router.refresh()  // 触发 Server Components 重渲染，SessionProvider 自动更新
}
```

`LoginModal` 新增 `const router = useRouter()` 调用。

---

## 数据流

```
用户提交表单
  → LoginView: 校验 → POST /api/auth/login（Next.js Route Handler）
      → Next.js Route Handler: 转发 Go 后端 → 写 httpOnly Cookie → 返回 { user }
  → LoginView: onSuccess(user)
  → LoginModal: close() + addToast(...) + router.refresh()
      → SessionProvider 更新（Navbar 等 Server Components 重渲染）
      → Toast 在右下角显示 4s
```

---

## 测试策略

### packages/ui/src/toast/toast.test.tsx（新建）
- 渲染 `ToastRegion` 不崩溃
- 有 toast 时渲染消息文字
- 点击关闭按钮触发 dismiss

### apps/web/components/auth/login-view.test.tsx（补充）
- `identifier` / `password` 输入控制（受控输入）
- 空 identifier 提交 → 显示校验提示，不调接口
- 空 password 提交 → 显示校验提示，不调接口
- 接口成功 → 调用 `onSuccess(user)`
- 接口失败 → 显示后端 error message，不调用 `onSuccess`
- loading 期间 submit 按钮 disabled

---

## 不在本次范围内

- OAuth 登录
- 忘记密码
- 登出逻辑
- Navbar 登录态 UI（依赖 `useSession()`，`router.refresh()` 后自动更新）
