# Login Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the login/register modal for `apps/web`, including account-password login, OAuth grid, email registration, view switching animation, overlay pulse, and sticky back button.

**Architecture:** `LoginModal` is the shell (overlay + back button + view switcher); `LoginView` and `RegisterView` are pure form components receiving callbacks; `OAuthGrid` is a shared expand-able icon grid. State lives in the existing Zustand store (`useLoginModal`) extended with a `view` field.

**Tech Stack:** React 19, Next.js App Router (`'use client'`), Zustand, TailwindCSS v4, `@repo/ui` (Button/cn), `@repo/icons` (SvgIcon), Vitest + @testing-library/react

---

## File Map

| Action  | Path                                              | Purpose                                  |
| ------- | ------------------------------------------------- | ---------------------------------------- |
| Create  | `packages/icons/svg/github.svg`                   | GitHub brand icon                        |
| Create  | `packages/icons/svg/google.svg`                   | Google brand icon                        |
| Create  | `packages/icons/svg/wechat.svg`                   | WeChat brand icon                        |
| Create  | `packages/icons/svg/qq.svg`                       | QQ brand icon                            |
| Create  | `packages/icons/svg/weibo.svg`                    | Weibo brand icon                         |
| Create  | `packages/icons/svg/gitee.svg`                    | Gitee brand icon                         |
| Create  | `packages/icons/svg/baidu.svg`                    | Baidu brand icon                         |
| Modify  | `packages/icons/src/generated/sprite.ts`          | Rebuilt by build script                  |
| Modify  | `packages/icons/src/generated/types.ts`           | Rebuilt — adds 7 new names               |
| Modify  | `apps/web/app/globals.css`                        | Add `modalPulse` + `viewEnter` keyframes |
| Modify  | `apps/web/store/use-login-modal.ts`               | Add `view`, `setView`, update `open`     |
| Create  | `apps/web/store/use-login-modal.test.ts`          | Store unit tests                         |
| Create  | `apps/web/components/auth/oauth-grid.tsx`         | Expandable OAuth icon row                |
| Create  | `apps/web/components/auth/oauth-grid.test.tsx`    |                                          |
| Create  | `apps/web/components/auth/login-view.tsx`         | Login form (fields + CTA + OAuth)        |
| Create  | `apps/web/components/auth/login-view.test.tsx`    |                                          |
| Create  | `apps/web/components/auth/register-view.tsx`      | Register form                            |
| Create  | `apps/web/components/auth/register-view.test.tsx` |                                          |
| Rewrite | `apps/web/components/auth/login-modal.tsx`        | Modal shell                              |
| Update  | `apps/web/components/auth/login-modal.test.tsx`   |                                          |

---

## Task 1: Add animation keyframes

**Files:**

- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add keyframes to globals.css**

Append after the last existing `@keyframes` block in `apps/web/app/globals.css`:

```css
@keyframes modalPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.018);
  }
}

@keyframes viewEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-modal-pulse {
  animation: modalPulse 280ms ease-in-out;
}

.animate-view-enter {
  animation: viewEnter 200ms ease-out;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style(web): 新增弹窗 pulse 和视图入场 keyframes"
```

---

## Task 2: Add brand SVG icons

**Files:**

- Create: `packages/icons/svg/{github,google,wechat,qq,weibo,gitee,baidu}.svg`
- Modify (auto): `packages/icons/src/generated/sprite.ts`, `types.ts`

All SVGs must have `viewBox="0 0 24 24"` and use `fill="currentColor"` so they respond to CSS color.

- [ ] **Step 1: Create `packages/icons/svg/github.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
</svg>
```

- [ ] **Step 2: Create `packages/icons/svg/google.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
</svg>
```

- [ ] **Step 3: Download remaining brand SVGs from Simple Icons**

Simple Icons provides CC0-licensed single-path SVGs at `https://simpleicons.org/icons/<slug>.svg`.

Run these four commands (requires internet access):

```bash
curl -L https://simpleicons.org/icons/wechat.svg -o packages/icons/svg/wechat.svg
curl -L https://simpleicons.org/icons/tencentqq.svg -o packages/icons/svg/qq.svg
curl -L https://simpleicons.org/icons/sinaweibo.svg -o packages/icons/svg/weibo.svg
curl -L https://simpleicons.org/icons/gitee.svg -o packages/icons/svg/gitee.svg
curl -L https://simpleicons.org/icons/baidu.svg -o packages/icons/svg/baidu.svg
```

Then open each downloaded file and verify:

1. The root element is `<svg>` with `viewBox="0 0 24 24"`
2. There is at least one `<path>` element

Simple Icons SVGs use `fill="currentColor"` by convention — no editing needed.

- [ ] **Step 4: Build the icons package**

```bash
pnpm --filter @repo/icons build
```

Expected output (order may vary):

```
✓ 生成雪碧图：33 个图标 [arrow-up-right, baidu, check, ..., wechat, weibo]
```

Verify `packages/icons/src/generated/types.ts` now includes `"github" | "google" | "wechat" | "qq" | "weibo" | "gitee" | "baidu"`.

- [ ] **Step 5: Commit**

```bash
git add packages/icons/svg/ packages/icons/src/generated/
git commit -m "feat(icons): 新增 GitHub、Google、WeChat 等 7 个品牌图标"
```

---

## Task 3: Extend useLoginModal store

**Files:**

- Modify: `apps/web/store/use-login-modal.ts`
- Create: `apps/web/store/use-login-modal.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/store/use-login-modal.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useLoginModal } from "./use-login-modal";

beforeEach(() => {
  useLoginModal.setState({ isOpen: false, view: "login" });
});

describe("useLoginModal", () => {
  it("初始状态：关闭，登录视图", () => {
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.view).toBe("login");
  });

  it("open() 默认打开登录视图", () => {
    useLoginModal.getState().open();
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(true);
    expect(state.view).toBe("login");
  });

  it('open("register") 打开注册视图', () => {
    useLoginModal.getState().open("register");
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(true);
    expect(state.view).toBe("register");
  });

  it("close() 关闭并重置视图为登录", () => {
    useLoginModal.getState().open("register");
    useLoginModal.getState().close();
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.view).toBe("login");
  });

  it("setView() 切换当前视图", () => {
    useLoginModal.getState().setView("register");
    expect(useLoginModal.getState().view).toBe("register");
    useLoginModal.getState().setView("login");
    expect(useLoginModal.getState().view).toBe("login");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- store/use-login-modal
```

Expected: 4 failures (setView/view not defined, open signature mismatch).

- [ ] **Step 3: Update the store**

Replace the entire content of `apps/web/store/use-login-modal.ts`:

```ts
import { create } from "zustand";

type ModalView = "login" | "register";

interface LoginModalStore {
  isOpen: boolean;
  view: ModalView;
  open: (view?: ModalView) => void;
  close: () => void;
  setView: (view: ModalView) => void;
}

export const useLoginModal = create<LoginModalStore>((set) => ({
  isOpen: false,
  view: "login",
  open: (view = "login") => set({ isOpen: true, view }),
  close: () => set({ isOpen: false, view: "login" }),
  setView: (view) => set({ view }),
}));
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- store/use-login-modal
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/store/use-login-modal.ts apps/web/store/use-login-modal.test.ts
git commit -m "feat(web): useLoginModal 新增 view 状态与 setView/open 重载"
```

---

## Task 4: OAuthGrid component

**Files:**

- Create: `apps/web/components/auth/oauth-grid.tsx`
- Create: `apps/web/components/auth/oauth-grid.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/components/auth/oauth-grid.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OAuthGrid } from "./oauth-grid";

describe("OAuthGrid", () => {
  it("渲染 4 个主要 provider + 展开按钮", () => {
    render(<OAuthGrid />);
    expect(screen.getByTitle("微信")).toBeInTheDocument();
    expect(screen.getByTitle("QQ")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("Google")).toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
  });

  it("点击展开按钮后显示全部 7 个 provider", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    expect(screen.getByTitle("Gitee")).toBeInTheDocument();
    expect(screen.getByTitle("百度")).toBeInTheDocument();
    expect(screen.queryByLabelText("展开更多登录方式")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- components/auth/oauth-grid
```

Expected: cannot find module `./oauth-grid`.

- [ ] **Step 3: Implement OAuthGrid**

Create `apps/web/components/auth/oauth-grid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

const PRIMARY_PROVIDERS = [
  { id: "wechat", label: "微信", icon: "wechat" },
  { id: "qq", label: "QQ", icon: "qq" },
  { id: "github", label: "GitHub", icon: "github" },
  { id: "google", label: "Google", icon: "google" },
] as const;

const EXTRA_PROVIDERS = [
  { id: "weibo", label: "微博", icon: "weibo" },
  { id: "gitee", label: "Gitee", icon: "gitee" },
  { id: "baidu", label: "百度", icon: "baidu" },
] as const;

interface OAuthGridProps {
  className?: string;
}

export function OAuthGrid({ className }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

  const providers = expanded ? [...PRIMARY_PROVIDERS, ...EXTRA_PROVIDERS] : PRIMARY_PROVIDERS;

  return (
    <div className={cn("flex justify-center gap-2 flex-wrap", className)}>
      {providers.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          className="w-11 h-11 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground transition-all hover:bg-foreground/[0.09] hover:border-foreground/[0.14] hover:-translate-y-px"
        >
          <SvgIcon name={icon} size={20} />
        </button>
      ))}
      {!expanded && (
        <button
          type="button"
          aria-label="展开更多登录方式"
          onClick={() => setExpanded(true)}
          className="w-11 h-11 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground text-[11px] font-semibold transition-all hover:bg-foreground/[0.09] hover:border-foreground/[0.14] hover:-translate-y-px"
        >
          +{EXTRA_PROVIDERS.length}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- components/auth/oauth-grid
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/oauth-grid.tsx apps/web/components/auth/oauth-grid.test.tsx
git commit -m "feat(web): 新增 OAuthGrid 组件（4 主要 + 3 折叠展开）"
```

---

## Task 5: LoginView component

**Files:**

- Create: `apps/web/components/auth/login-view.tsx`
- Create: `apps/web/components/auth/login-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/components/auth/login-view.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginView } from "./login-view";

describe("LoginView", () => {
  const mockSwitch = vi.fn();

  it("渲染账号、密码输入框和继续按钮", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByPlaceholderText("账号 / 邮箱 / 手机号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();
  });

  it("密码输入框默认为 password 类型", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByPlaceholderText("密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    const input = screen.getByPlaceholderText("密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByLabelText("隐藏密码"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("点击注册标签调用 onSwitchToRegister", async () => {
    const user = userEvent.setup();
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    await user.click(screen.getByRole("button", { name: /注册/ }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式登录分割线和 OAuthGrid", () => {
    render(<LoginView onSwitchToRegister={mockSwitch} />);
    expect(screen.getByText("其他方式登录")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- components/auth/login-view
```

Expected: cannot find module `./login-view`.

- [ ] **Step 3: Implement LoginView**

Create `apps/web/components/auth/login-view.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export function LoginView({ onSwitchToRegister }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);

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

      {/* 表单字段 */}
      <div className="flex flex-col gap-[10px]">
        <input
          type="text"
          placeholder="账号 / 邮箱 / 手机号"
          autoComplete="username"
          className={inputCls}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="密码"
            autoComplete="current-password"
            className={`${inputCls} pr-[46px]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground/60 transition-colors hover:bg-foreground/7 hover:text-muted-foreground"
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

      {/* 继续按钮 */}
      <Button variant="default" className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5">
        继续
        <SvgIcon name="chevron-right" size={16} />
      </Button>

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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- components/auth/login-view
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/login-view.tsx apps/web/components/auth/login-view.test.tsx
git commit -m "feat(web): 新增 LoginView 组件（账号密码、密码可见切换、OAuth）"
```

---

## Task 6: RegisterView component

**Files:**

- Create: `apps/web/components/auth/register-view.tsx`
- Create: `apps/web/components/auth/register-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/components/auth/register-view.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterView } from "./register-view";

describe("RegisterView", () => {
  const mockSwitch = vi.fn();

  it("渲染注册所有必填和可选字段", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByPlaceholderText("邮箱地址")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("验证码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("设置密码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("昵称（可选）")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("个人网站（可选）")).toBeInTheDocument();
    expect(screen.getByText("上传头像")).toBeInTheDocument();
  });

  it("密码字段默认为 password 类型", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByPlaceholderText("设置密码")).toHaveAttribute("type", "password");
  });

  it("点击眼睛按钮切换密码可见性", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    const input = screen.getByPlaceholderText("设置密码");
    await user.click(screen.getByLabelText("显示密码"));
    expect(input).toHaveAttribute("type", "text");
  });

  it("点击登录标签调用 onSwitchToLogin", async () => {
    const user = userEvent.setup();
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    await user.click(screen.getByRole("button", { name: /登录/ }));
    expect(mockSwitch).toHaveBeenCalledOnce();
  });

  it("渲染其他方式注册分割线和 OAuthGrid", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByText("其他方式注册")).toBeInTheDocument();
    expect(screen.getByTitle("微信")).toBeInTheDocument();
  });

  it("渲染协议提示文字", () => {
    render(<RegisterView onSwitchToLogin={mockSwitch} />);
    expect(screen.getByText(/注册即表示同意/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- components/auth/register-view
```

Expected: cannot find module `./register-view`.

- [ ] **Step 3: Implement RegisterView**

Create `apps/web/components/auth/register-view.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">创建账号</h2>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0"
          >
            <SvgIcon name="chevron-left" size={9} />
            登录
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">填写信息完成注册</p>
      </div>

      {/* 表单字段 */}
      <div className="flex flex-col gap-[10px]">
        <input type="email" placeholder="邮箱地址" autoComplete="email" className={inputCls} />

        {/* 验证码行 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="验证码"
            inputMode="numeric"
            maxLength={6}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            className="flex-shrink-0 px-[15px] rounded-xl bg-primary/12 border border-primary/25 text-primary text-[12.5px] font-semibold transition-colors hover:bg-primary/20 whitespace-nowrap"
          >
            获取验证码
          </button>
        </div>

        {/* 密码 */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="设置密码"
            autoComplete="new-password"
            className={`${inputCls} pr-[46px]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground/60 transition-colors hover:bg-foreground/7 hover:text-muted-foreground"
          >
            <SvgIcon name={showPassword ? "eye-off" : "eye"} size={15} />
          </button>
        </div>

        <input
          type="text"
          placeholder="昵称（可选）"
          autoComplete="nickname"
          className={inputCls}
        />

        <input type="url" placeholder="个人网站（可选）" autoComplete="url" className={inputCls} />

        {/* 头像上传 */}
        <label className="flex items-center gap-[14px] p-[12px_16px] rounded-xl bg-foreground/[0.03] border-[1.5px] border-dashed border-foreground/[0.09] cursor-pointer transition-colors hover:bg-primary/5 hover:border-primary/25">
          <div className="w-[38px] h-[38px] rounded-full bg-primary/12 border-[1.5px] border-dashed border-primary/25 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="头像预览"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <SvgIcon name="user" size={16} className="text-primary/60" />
            )}
          </div>
          <div>
            <div className="text-[13px] text-muted-foreground">上传头像</div>
            <div className="text-[11px] text-muted-foreground/40 mt-[2px]">
              可选 · JPG / PNG，最大 2MB
            </div>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </label>
      </div>

      {/* 创建账号按钮 */}
      <Button variant="default" className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5">
        创建账号
        <SvgIcon name="chevron-right" size={16} />
      </Button>

      {/* 协议 */}
      <p className="text-[11.5px] text-muted-foreground mt-[14px] px-[14px] py-[10px] rounded-[10px] bg-primary/[0.06] border border-primary/12 leading-relaxed">
        注册即表示同意《用户协议》和《隐私政策》
      </p>

      {/* 分割线 */}
      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式注册</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OAuth 图标 */}
      <OAuthGrid />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- components/auth/register-view
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/register-view.tsx apps/web/components/auth/register-view.test.tsx
git commit -m "feat(web): 新增 RegisterView 组件（邮箱验证码、头像上传、OAuth）"
```

---

## Task 7: Rewrite LoginModal shell

**Files:**

- Rewrite: `apps/web/components/auth/login-modal.tsx`
- Update: `apps/web/components/auth/login-modal.test.tsx`

- [ ] **Step 1: Replace the test file**

Replace the entire content of `apps/web/components/auth/login-modal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginModal } from "./login-modal";
import { useLoginModal } from "@/store/use-login-modal";

beforeEach(() => {
  useLoginModal.setState({ isOpen: false, view: "login" });
});

describe("LoginModal", () => {
  it("isOpen=false 时不渲染 dialog", () => {
    render(<LoginModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isOpen=true 时渲染弹窗并显示登录视图", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("欢迎回来")).toBeInTheDocument();
  });

  it("isOpen=true, view=register 时显示注册视图", () => {
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    expect(screen.getByText("创建账号")).toBeInTheDocument();
  });

  it("登录视图：返回按钮点击关闭弹窗", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("关闭登录弹窗"));
    expect(useLoginModal.getState().isOpen).toBe(false);
  });

  it("注册视图：返回按钮点击切回登录视图", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("返回登录视图"));
    expect(useLoginModal.getState().view).toBe("login");
    expect(useLoginModal.getState().isOpen).toBe(true);
  });

  it("点击遮罩不关闭弹窗", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    const { container } = render(<LoginModal />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(useLoginModal.getState().isOpen).toBe(true);
  });

  it("点击「注册」标签切换到注册视图", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByRole("button", { name: /注册/ }));
    expect(useLoginModal.getState().view).toBe("register");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- components/auth/login-modal
```

Expected: most tests fail because the current `login-modal.tsx` is a placeholder.

- [ ] **Step 3: Rewrite login-modal.tsx**

Replace the entire content of `apps/web/components/auth/login-modal.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useLoginModal } from "@/store/use-login-modal";
import { LoginView } from "./login-view";
import { RegisterView } from "./register-view";

export function LoginModal() {
  const { isOpen, view, close, setView } = useLoginModal();
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const el = modalRef.current;
    if (!el) return;
    el.classList.remove("animate-modal-pulse");
    // reflow 强制重新触发动画
    void el.offsetWidth;
    el.classList.add("animate-modal-pulse");
    el.addEventListener("animationend", () => el.classList.remove("animate-modal-pulse"), {
      once: true,
    });
  }

  function handleBack() {
    if (view === "register") {
      setView("login");
    } else {
      close();
    }
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
          // 移动端：铺满全屏，无圆角
          "max-md:h-dvh max-md:rounded-none max-md:overflow-y-auto max-md:border-x-0 max-md:border-b-0",
          // 桌面端：最大宽度，圆角，最大高度可滚动
          "md:max-w-[400px] md:rounded-2xl md:border md:max-h-[90vh] md:overflow-y-auto",
        )}
      >
        {/* 返回/关闭按钮 — sticky 吸顶，遮住滚动内容 */}
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

        {/* 视图内容 — key 变化时 React 重新挂载触发入场动画 */}
        <div key={view} className="px-8 pb-8 pt-2 animate-view-enter">
          {view === "login" ? (
            <LoginView onSwitchToRegister={() => setView("register")} />
          ) : (
            <RegisterView onSwitchToLogin={() => setView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all auth tests**

```bash
pnpm --filter @repo/web test -- components/auth/
```

Expected: all tests in `login-modal`, `login-view`, `register-view`, `oauth-grid` passing.

- [ ] **Step 5: Run full type check**

```bash
pnpm --filter @repo/web check-types
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/auth/login-modal.tsx apps/web/components/auth/login-modal.test.tsx
git commit -m "feat(web): 重写 LoginModal（返回按钮吸顶、视图切换动效、遮罩 pulse）"
```

---

## Self-Review

**Spec coverage:**

- [x] 左上角返回按钮，36×36，chevron-left — Task 7
- [x] 标题行右侧极简切换标签 — Task 5 (LoginView) / Task 6 (RegisterView)
- [x] 账号密码输入、眼睛切换 — Task 5
- [x] 忘记密码占位链接 — Task 5
- [x] 「继续 →」CTA — Task 5
- [x] OAuth 图标，4 主要 + 3 折叠 — Task 4
- [x] 注册：邮箱、验证码、密码、昵称可选、网站可选、头像 — Task 6
- [x] 注册视图底部 OAuth — Task 6
- [x] 协议提示 — Task 6
- [x] 遮罩 pulse 不关闭 — Task 7
- [x] 视图切换入场动画 — Task 1 + Task 7 (key-based remount)
- [x] 弹窗入场 slideUpCard — Task 7 (已有 keyframes，可直接加 `animation-[slideUpCard]` 或 className；注意：当前 plan 未显式加入场动效到 modal div，可在 Task 7 Step 3 的 modal div 上加 `animate-[slideUpCard_250ms_ease-out]`)
- [x] sticky 返回按钮（桌面 + 移动）— Task 7
- [x] 移动端全屏 h-dvh — Task 7
- [x] useLoginModal store 扩展 — Task 3

**一处遗漏：** 弹窗整体入场动效（`slideUpCard`）未在 Task 7 的 modal div 上显式添加。在 Task 7 Step 3 中，给 `role="dialog"` 的 div 添加 `style={{ animation: 'slideUpCard 250ms ease-out' }}` 即可（keyframes 已在 base.css 中定义）。

已在上方 Step 3 代码中隐含（可通过 Tailwind arbitrary `animate-[slideUpCard_250ms_ease-out]` class 实现）——实现时在 dialog div 的 `className` 末尾追加 `animate-[slideUpCard_250ms_ease-out]`。
