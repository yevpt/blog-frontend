# Auth UI Polish & Navbar User Menu — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

---

## 概述

本次变更涵盖四个独立但相关的 UI/UX 改进：

1. **429 封禁错误改为 Toast 通知**（注册流程）
2. **滑块验证码弹层样式重构**（消除缝合感）
3. **登录 / 注册表单输入框间距调整**
4. **Navbar 登录态展示用户头像 + 下拉菜单**

---

## Task 1 · 429 IP 封禁 → Toast

### 问题

`register-view.tsx` 中 `handleCaptchaVerify` 的 catch 块将 `sendEmailCode` 抛出的所有错误统一视为"验证失败"，静默刷新拼图，用户看不到 429 IP 封禁的真实原因。

### 方案

- 在 `register-view.tsx` 中新增 `ApiError` 类，持有 `code: number` 字段
- 修改 `requestJSON`：遇到非零 `json.code` 时抛出 `new ApiError(message, code)` 而非普通 `Error`
- `handleCaptchaVerify` 的 catch 中检查：
  - `err instanceof ApiError && err.code === 429` → 关闭验证码弹层 + `addToast(err.message, "error")` + 直接 return
  - 其他错误 → 保留现有重试拼图逻辑
- 在 `register-view.tsx` 顶部引入 `addToast`（`@/lib/toast`）

### 数据流

```
sendEmailCode → requestJSON → 后端返回 {code:429}
  → throw new ApiError("IP 已被封禁", 429)
  → handleCaptchaVerify catch
    → 是 429 → setCaptchaOpen(false) + addToast(message, "error")
    → 非 429 → 刷新拼图（现有逻辑）
```

---

## Task 2 · 滑块验证码样式重构

### 问题

拼图图像区域和滑块各有独立 border，中间 `mt-4` 间距，视觉上是"两个零件拼在一起"。

### 方案

将拼图图像区域和 `CaptchaSlider` 合并进同一个容器：

```
<div className="overflow-hidden rounded-xl border border-border bg-foreground/[0.03]">
  <!-- 拼图图像（无独立 border） -->
  <div className="relative" style={{ width, height }}>
    <img master />
    <img tile />
    <!-- loading overlay -->
  </div>
  <!-- 滑块区域作为"底栏" -->
  <div className="border-t border-border/50 p-3">
    <CaptchaSlider ... />
  </div>
</div>
```

`CaptchaSlider` 本身去掉外部 `border border-border`，改为纯轨道形态（`bg-foreground/[0.06]`），因为边框已由父容器提供。

---

## Task 3 · 表单输入框间距

**改动：** `login-view.tsx` 和 `register-view.tsx` 的表单 `flex flex-col` 列间距

- `gap-[10px]` → `gap-[14px]`

---

## Task 4 · Navbar 登录态头像 + 下拉菜单

### 新增文件

#### `apps/web/components/common/user-avatar.tsx`

公共用户头像组件，提取自 `comment-item.tsx` 的本地 `Avatar`，统一博客头像设计语言。

```ts
interface UserAvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md"; // 20px | 26px | 28px
  className?: string;
}
```

- 有 `src` 且未 error：渲染 `<img>`
- 无图时：圆形 `bg-border text-(--fg2) font-bold`，展示 `name[0].toUpperCase()`

同步将 `comment-item.tsx` 中的本地 `Avatar` 替换为 `<UserAvatar>`。

#### `apps/web/store/use-snippet-modal.ts`

Zustand stub store，与 `use-login-modal` 结构一致：

```ts
interface SnippetModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}
```

后期插入全局碎语发表弹窗时直接扩展此 store。

#### `apps/web/components/navbar/navbar-user-menu.tsx`

桌面端头像下拉菜单组件。

**头像按钮：** `UserAvatar size="sm"` 包裹在 `<button>` 中，点击切换 `open` 状态。

**下拉浮层：**

```
position: absolute top-[calc(100%+8px)] right-0
min-w-[160px] rounded-xl border border-border bg-card shadow-xl
transition: scale + opacity（tailwind animate）
```

**菜单项：**

| 图标          | 文字     | 行为                                                                             |
| ------------- | -------- | -------------------------------------------------------------------------------- |
| user          | 我的账号 | `router.push("/profile")` + close                                                |
| pencil / edit | 发表碎语 | `openSnippetModal()` + close                                                     |
| bell          | 消息     | `router.push("/messages")` + close                                               |
| —             | 分隔线   | —                                                                                |
| log-out       | 退出登录 | `POST /api/auth/logout` → `router.refresh()` + close，文字 `text-destructive/80` |

**关闭逻辑：** `useRef` 挂 container，`useEffect` 注册 `mousedown` document listener，点击外部自动关闭。

### 修改文件

#### `navbar-actions.tsx`

```tsx
const { user } = useSession();

// 已登录
{
  user ? <NavbarUserMenu user={user} isGlass={isGlass} /> : <Button>{t("auth.login")}</Button>;
}
```

#### `navbar-mobile-menu.tsx`

底部操作区根据登录态分支：

**未登录（不变）：**

```
[深色模式 toggle]            [登录按钮]
```

**已登录（新增）：**

```
Row 1:
  [UserAvatar xs][昵称/用户名]   [消息 icon][退出 icon]
  (整行 Link → /profile)

Row 2（不变）:
  [深色模式 toggle]
```

- 头像 + 昵称整行：`<Link href="/profile">` 包裹，点击跳转我的账号
- 消息：`<Link href="/messages">` icon button
- 退出：调用 `POST /api/auth/logout` + `router.refresh()` + `onClose()`
- 发表碎语不在移动端用户菜单中出现（nav 链接"碎语"已提供入口）

---

## 测试

按 CLAUDE.md 要求，以下文件需同步新增或更新测试：

| 文件                     | 测试文件                      | 覆盖点                              |
| ------------------------ | ----------------------------- | ----------------------------------- |
| `user-avatar.tsx`        | `user-avatar.test.tsx`        | 渲染图片 / 渲染首字母 / size 映射   |
| `navbar-user-menu.tsx`   | `navbar-user-menu.test.tsx`   | 渲染头像 / 开关下拉 / logout 调用   |
| `use-snippet-modal.ts`   | `use-snippet-modal.test.ts`   | 初始状态 / open / close             |
| `navbar-actions.tsx`     | `navbar-actions.test.tsx`     | 未登录显示登录按钮 / 已登录显示头像 |
| `navbar-mobile-menu.tsx` | `navbar-mobile-menu.test.tsx` | 已登录布局 / 未登录布局             |
| `register-view.tsx`      | `register-view.test.tsx`      | 429 触发 toast 而非重试拼图         |

---

## 不在本次范围

- `/profile`、`/messages` 页面（仅 link，页面后期实现）
- 全局碎语发表弹窗（store stub 预留）
- Token 刷新 / 会话保活
