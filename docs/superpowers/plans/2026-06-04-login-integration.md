# Login Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对接登录接口，包含表单校验、登录失败报错、成功后关闭弹窗并显示全局 Toast 通知。

**Architecture:** `LoginView` 自管理表单状态 + fetch，通过 `onSuccess(user)` 回调上报成功；`LoginModal` 负责收尾（close + toast + router.refresh）。Toast UI 组件封装在 `packages/ui`，全局队列实例放 `apps/web/lib/toast.ts`，通过 `GlobalModals` 挂载到 layout。

**Tech Stack:** React Aria Components（`react-aria-components/Toast` subpath）、Zustand（`useLoginModal`）、Next.js `router.refresh()`、Vitest + Testing Library

---

## 文件变更清单

| 操作 | 路径                                           | 职责                                      |
| ---- | ---------------------------------------------- | ----------------------------------------- |
| 新建 | `packages/ui/src/__mocks__/client-only.ts`     | 测试环境 client-only mock                 |
| 修改 | `packages/ui/vitest.config.ts`                 | 添加 client-only alias                    |
| 新建 | `packages/ui/src/toast/toast.tsx`              | ToastRegion UI 组件                       |
| 新建 | `packages/ui/src/toast/toast.test.tsx`         | Toast 组件测试                            |
| 修改 | `packages/ui/src/index.ts`                     | 导出 ToastRegion、ToastContent、ToastType |
| 新建 | `apps/web/lib/toast.ts`                        | 全局 toastQueue 实例 + addToast helper    |
| 修改 | `apps/web/app/providers/global-modals.tsx`     | 挂载 `<ToastRegion>`                      |
| 修改 | `apps/web/components/auth/login-view.tsx`      | 表单状态、校验、API 调用、onSuccess prop  |
| 修改 | `apps/web/components/auth/login-view.test.tsx` | 更新全部现有测试 + 新增 5 个              |
| 修改 | `apps/web/components/auth/login-modal.tsx`     | 添加 handleLoginSuccess                   |

---

## Task 1：修复 packages/ui 测试环境（client-only mock）

`react-aria-components/Toast` 在编译产物顶部 `import 'client-only'`，该包在非 RSC 环境会直接 throw。测试运行前必须用空模块替换。

**Files:**

- Create: `packages/ui/src/__mocks__/client-only.ts`
- Modify: `packages/ui/vitest.config.ts`

- [ ] **Step 1：创建 client-only mock**

新建 `packages/ui/src/__mocks__/client-only.ts`，内容为空模块（不 throw）：

```ts
// 测试环境替换：react-aria-components/Toast 引入此包做 RSC 守卫，测试中无需实际效果
export default {};
```

- [ ] **Step 2：在 vitest.config.ts 注册 alias**

编辑 `packages/ui/vitest.config.ts`，在 `plugins` 和 `test` 之间添加 `resolve.alias`：

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "client-only": path.resolve(__dirname, "src/__mocks__/client-only.ts"),
    },
  },
  test: {
    name: "ui",
    environment: "happy-dom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
  },
});
```

- [ ] **Step 3：验证现有 packages/ui 测试仍通过**

```bash
pnpm --filter @repo/ui test
```

预期：全部绿色，无 "client-only" 报错。

- [ ] **Step 4：提交**

```bash
git add packages/ui/src/__mocks__/client-only.ts packages/ui/vitest.config.ts
git commit -m "test(ui): 添加 client-only mock 修复 React Aria Toast 测试环境"
```

---

## Task 2：Toast UI 组件（packages/ui）

**Files:**

- Create: `packages/ui/src/toast/toast.test.tsx`
- Create: `packages/ui/src/toast/toast.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1：先写失败测试**

新建 `packages/ui/src/toast/toast.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";
import { ToastRegion, type ToastContent } from "./toast";

function makeQueue(...items: ToastContent[]) {
  const q = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });
  items.forEach((item) => q.add(item));
  return q;
}

describe("ToastRegion", () => {
  it("没有 toast 时不渲染任何消息文字", () => {
    const queue = makeQueue();
    render(<ToastRegion queue={queue} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("渲染 success toast 消息文字", () => {
    const queue = makeQueue({ message: "登录成功", type: "success" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("登录成功")).toBeInTheDocument();
  });

  it("渲染 error toast 消息文字", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("操作失败")).toBeInTheDocument();
  });

  it("点击关闭按钮后 toast 消失", async () => {
    const user = userEvent.setup();
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("测试通知")).toBeInTheDocument();
    await user.click(screen.getByLabelText("关闭通知"));
    expect(screen.queryByText("测试通知")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2：运行测试，确认 FAIL**

```bash
pnpm --filter @repo/ui test --reporter=verbose
```

预期：4 个测试失败，错误为 "Cannot find module './toast'"。

- [ ] **Step 3：实现 toast.tsx**

新建 `packages/ui/src/toast/toast.tsx`：

```tsx
"use client";

import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
  UNSTABLE_ToastQueue,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastContent {
  message: string;
  type?: ToastType;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400",
  error: "bg-destructive/10 border-destructive/25 text-destructive",
  info: "bg-primary/10 border-primary/25 text-primary",
};

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

interface ToastRegionProps {
  queue: UNSTABLE_ToastQueue<ToastContent>;
}

export function ToastRegion({ queue }: ToastRegionProps) {
  return (
    <AriaToastRegion
      queue={queue}
      className="fixed bottom-4 right-4 z-[600] flex flex-col gap-2 outline-none"
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={cn(
            "flex w-[320px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg",
            typeStyles[toast.content.type ?? "info"],
          )}
        >
          <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed">
            {toast.content.message}
          </AriaToastContent>
          <Button
            slot="close"
            aria-label="关闭通知"
            className="flex-shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <SvgIcon name="close" size={12} />
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
pnpm --filter @repo/ui test --reporter=verbose
```

预期：4 个 ToastRegion 测试全部绿色。

- [ ] **Step 5：在 packages/ui/src/index.ts 追加导出**

在 `packages/ui/src/index.ts` 末尾追加：

```ts
export { ToastRegion, ToastQueue, type ToastContent, type ToastType } from "./toast/toast";
```

- [ ] **Step 6：类型检查**

```bash
pnpm --filter @repo/ui check-types
```

预期：无错误。

- [ ] **Step 7：提交**

```bash
git add packages/ui/src/toast/ packages/ui/src/index.ts
git commit -m "feat(ui): 新增 ToastRegion 组件（React Aria Toast）"
```

---

## Task 3：全局 Toast 队列（apps/web）

**Files:**

- Create: `apps/web/lib/toast.ts`
- Modify: `apps/web/app/providers/global-modals.tsx`

- [ ] **Step 1：创建全局队列 + addToast helper**

新建 `apps/web/lib/toast.ts`：

```ts
import { ToastQueue } from "@repo/ui";
import type { ToastContent, ToastType } from "@repo/ui";

export const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });

export function addToast(message: string, type?: ToastType): void {
  toastQueue.add({ message, type }, { timeout: 4000 });
}
```

- [ ] **Step 2：在 GlobalModals 挂载 ToastRegion**

替换 `apps/web/app/providers/global-modals.tsx` 全部内容：

```tsx
"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
```

- [ ] **Step 3：类型检查**

```bash
pnpm --filter web check-types
```

预期：无错误。

- [ ] **Step 4：提交**

```bash
git add apps/web/lib/toast.ts apps/web/app/providers/global-modals.tsx
git commit -m "feat(web): 初始化全局 Toast 队列并挂载 ToastRegion"
```

---

## Task 4：LoginView 表单实现（TDD）

**Files:**

- Modify: `apps/web/components/auth/login-view.test.tsx`
- Modify: `apps/web/components/auth/login-view.tsx`

- [ ] **Step 1：更新 login-view.test.tsx（先写所有测试）**

用以下内容**完整替换** `apps/web/components/auth/login-view.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserResp } from "@repo/api";
import { LoginView } from "./login-view";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("LoginView", () => {
  const mockSwitch = vi.fn();
  const mockSuccess = vi.fn();

  beforeEach(() => {
    mockSwitch.mockClear();
    mockSuccess.mockClear();
    mockFetch.mockClear();
  });

  it("渲染账号、密码输入框和继续按钮", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByPlaceholderText("账号 / 邮箱 / 手机号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();
  });

  it("密码输入框默认为 password 类型", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByPlaceholderText("密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    const input = screen.getByPlaceholderText("密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByLabelText("隐藏密码"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("点击注册标签调用 onSwitchToRegister", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.click(screen.getByRole("button", { name: /注册/ }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式登录分割线和 OAuthGrid", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    expect(screen.getByText("其他方式登录")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });

  it("identifier 为空时提交显示校验提示，不调用 fetch", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请输入账号 / 邮箱 / 手机号",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("password 为空时提交显示校验提示，不调用 fetch", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入密码");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("接口成功时调用 onSuccess 并传入 user", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "alice", nickname: "Alice" };
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: mockUser } }),
    });
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("接口返回业务错误时显示错误信息，不调用 onSuccess", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ code: 1001, message: "账号或密码错误" }),
    });
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("账号或密码错误"),
    );
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("loading 期间按钮文字变为"登录中…"", async () => {
    const user = userEvent.setup();
    mockFetch.mockReturnValue(new Promise(() => {})); // 永不 resolve
    render(<LoginView onSwitchToRegister={mockSwitch} onSuccess={mockSuccess} />);
    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: /继续/ }));
    expect(await screen.findByText("登录中…")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2：运行测试，确认新增的 5 个测试 FAIL**

```bash
pnpm --filter web test apps/web/components/auth/login-view.test.tsx
```

预期：前 5 个已有测试通过（或因缺 `onSuccess` prop 导致 TS 错误），后 5 个新测试失败。

- [ ] **Step 3：实现 login-view.tsx**

用以下内容**完整替换** `apps/web/components/auth/login-view.tsx`：

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onSuccess: (user: UserResp) => void;
}

export function LoginView({ onSwitchToRegister, onSuccess }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!identifier.trim()) {
      setError("请输入账号 / 邮箱 / 手机号");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || "登录失败，请稍后重试");
        return;
      }
      onSuccess(json.data.user as UserResp);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">欢迎回来</h2>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0"
          >
            注册
            <SvgIcon name="arrow-up-right" size={10} />
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">请填写以下信息进行登录</p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[10px]">
          <input
            type="text"
            placeholder="账号 / 邮箱 / 手机号"
            autoComplete="username"
            className={inputCls}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="密码"
              autoComplete="current-password"
              className={`${inputCls} pr-[46px]`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-muted-foreground"
            >
              <SvgIcon name={showPassword ? "eye-off" : "eye"} size={15} />
            </button>
          </div>
          <div className="text-right">
            <button
              type="button"
              className="text-[11.5px] text-muted-foreground/60 transition-colors hover:text-primary"
            >
              忘记密码？
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[12px] leading-relaxed text-destructive/80">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
          isDisabled={loading}
        >
          {loading ? (
            "登录中…"
          ) : (
            <>
              继续
              <SvgIcon name="chevron-right" size={16} />
            </>
          )}
        </Button>
      </form>

      {/* 分割线 */}
      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式登录</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OAuth 图标 */}
      <OAuthGrid />
    </div>
  );
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
pnpm --filter web test apps/web/components/auth/login-view.test.tsx
```

预期：10 个测试全部绿色。

- [ ] **Step 5：类型检查**

```bash
pnpm --filter web check-types
```

预期：无错误。

- [ ] **Step 6：提交**

```bash
git add apps/web/components/auth/login-view.tsx apps/web/components/auth/login-view.test.tsx
git commit -m "feat(web): 实现登录表单接口对接与校验逻辑"
```

---

## Task 5：LoginModal 成功处理

**Files:**

- Modify: `apps/web/components/auth/login-modal.tsx`

- [ ] **Step 1：更新 login-modal.tsx**

用以下内容**完整替换** `apps/web/components/auth/login-modal.tsx`：

```tsx
"use client";

import { useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { LoginView } from "./login-view";
import { RegisterView } from "./register-view";

export function LoginModal() {
  const { isOpen, view, close, setView } = useLoginModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (!isOpen) return null;

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const el = modalRef.current;
    if (!el) return;
    el.classList.remove("animate-modal-pulse");
    void el.offsetWidth;
    el.classList.add("animate-modal-pulse");
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      el.addEventListener("animationend", () => el.classList.remove("animate-modal-pulse"), {
        once: true,
      });
    } else {
      el.classList.remove("animate-modal-pulse");
    }
  }

  function handleBack() {
    if (view === "register") {
      setView("login");
    } else {
      close();
    }
  }

  function handleLoginSuccess(user: UserResp) {
    close();
    addToast(`欢迎回来，${user.nickname ?? user.username}`, "success");
    router.refresh();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[400] flex items-end justify-center md:items-center md:px-4 bg-black/45 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === "login" ? "登录" : "注册"}
        className={cn(
          "relative flex flex-col w-full bg-card border-t border-border shadow-2xl",
          "animate-[slideUpCard_250ms_ease-out]",
          "max-md:h-dvh max-md:rounded-none max-md:overflow-y-auto max-md:border-x-0 max-md:border-b-0",
          "md:max-w-[400px] md:rounded-2xl md:border md:max-h-[90vh] md:overflow-y-auto",
        )}
      >
        {/* 返回/关闭按钮 */}
        <div className="sticky top-0 z-10 flex px-8 pt-6 pb-2 bg-card">
          <button
            type="button"
            onClick={handleBack}
            aria-label={view === "register" ? "返回登录视图" : "关闭登录弹窗"}
            className="w-9 h-9 rounded-[11px] bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <SvgIcon name="chevron-left" size={16} />
          </button>
        </div>

        {/* 视图内容 */}
        <div key={view} className="px-8 pb-8 pt-2 animate-view-enter">
          {view === "login" ? (
            <LoginView
              onSwitchToRegister={() => setView("register")}
              onSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterView onSwitchToLogin={() => setView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2：类型检查**

```bash
pnpm --filter web check-types
```

预期：无错误。

- [ ] **Step 3：全量测试**

```bash
pnpm test
```

预期：全部绿色（packages/ui、apps/web 所有测试通过）。

- [ ] **Step 4：提交**

```bash
git add apps/web/components/auth/login-modal.tsx
git commit -m "feat(web): 登录成功后关闭弹窗并显示 Toast 通知"
```

---

## 完成验收

全部 Task 完成后运行：

```bash
pnpm test && pnpm -r check-types && pnpm -r lint
```

预期：零错误，零警告。
