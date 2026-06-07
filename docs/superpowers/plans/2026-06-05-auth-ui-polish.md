# Auth UI Polish & Navbar User Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 429 IP-ban to toast notification, unify captcha slider widget, increase form input spacing, and add logged-in user avatar + dropdown menu to navbar (desktop + mobile).

**Architecture:** Extract shared `UserAvatar` from comment-item pattern. Stub `useSnippetModal` Zustand store for future snippet editor. Implement `NavbarUserMenu` for desktop dropdown. Update `NavbarActions` and `NavbarMobileMenu` to branch on login state via `useSession()`. Mobile menu shows user info inline without nesting.

**Tech Stack:** React, TypeScript, Zustand, TailwindCSS, Vitest + @testing-library/react, Next.js App Router

---

## File Map

| Action | File |
|--------|------|
| CREATE | `packages/icons/svg/log-out.svg` |
| CREATE | `apps/web/components/common/user-avatar.tsx` |
| CREATE | `apps/web/components/common/user-avatar.test.tsx` |
| CREATE | `apps/web/store/use-snippet-modal.ts` |
| CREATE | `apps/web/store/use-snippet-modal.test.ts` |
| CREATE | `apps/web/components/navbar/navbar-user-menu.tsx` |
| CREATE | `apps/web/components/navbar/navbar-user-menu.test.tsx` |
| CREATE | `apps/web/components/navbar/navbar-mobile-menu.test.tsx` |
| MODIFY | `apps/web/app/globals.css` |
| MODIFY | `apps/web/components/auth/register-view.tsx` |
| MODIFY | `apps/web/components/auth/register-view.test.tsx` |
| MODIFY | `apps/web/components/auth/login-view.tsx` |
| MODIFY | `apps/web/components/navbar/navbar-actions.tsx` |
| MODIFY | `apps/web/components/navbar/navbar-actions.test.tsx` |
| MODIFY | `apps/web/components/navbar/navbar-mobile-menu.tsx` |
| MODIFY | `apps/web/components/comments/comment-item.tsx` |

---

### Task 1: `UserAvatar` 公共组件

**Files:**
- Create: `apps/web/components/common/user-avatar.tsx`
- Create: `apps/web/components/common/user-avatar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/common/user-avatar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("有 src 时渲染 img 元素", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("无 src 时渲染首字母大写", () => {
    render(<UserAvatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("img 加载失败时回退到首字母", () => {
    render(<UserAvatar src="https://broken.url/img.jpg" name="Charlie" />);
    fireEvent.error(screen.getByRole("img", { name: "Charlie" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("name 为空字符串时显示 ?", () => {
    render(<UserAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("size=xs 应用 h-5 w-5", () => {
    const { container } = render(<UserAvatar name="D" size="xs" />);
    expect(container.firstChild).toHaveClass("h-5");
    expect(container.firstChild).toHaveClass("w-5");
  });

  it("size=md 应用 h-7 w-7（默认）", () => {
    const { container } = render(<UserAvatar name="D" />);
    expect(container.firstChild).toHaveClass("h-7");
    expect(container.firstChild).toHaveClass("w-7");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web test -- user-avatar
```
Expected: FAIL — `Cannot find module './user-avatar'`

- [ ] **Step 3: 实现组件**

```tsx
// apps/web/components/common/user-avatar.tsx
"use client";

import { useState } from "react";
import { cn } from "@repo/ui";

const SIZE = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-[22px] w-[22px] text-[10px]",
  md: "h-7 w-7 text-xs",
} as const;

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function UserAvatar({ src, name, size = "md", className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const base = cn("shrink-0 rounded-full overflow-hidden", SIZE[size], className);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(base, "object-cover")}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        base,
        "flex items-center justify-center bg-border font-bold text-(--fg2)",
      )}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter web test -- user-avatar
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/common/user-avatar.tsx apps/web/components/common/user-avatar.test.tsx
git commit -m "feat(web): 新增 UserAvatar 公共用户头像组件"
```

---

### Task 2: `useSnippetModal` stub store

**Files:**
- Create: `apps/web/store/use-snippet-modal.ts`
- Create: `apps/web/store/use-snippet-modal.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/store/use-snippet-modal.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSnippetModal } from "./use-snippet-modal";

describe("useSnippetModal", () => {
  beforeEach(() => {
    useSnippetModal.setState({ isOpen: false });
  });

  it("初始状态 isOpen 为 false", () => {
    expect(useSnippetModal.getState().isOpen).toBe(false);
  });

  it("open() 将 isOpen 设为 true", () => {
    useSnippetModal.getState().open();
    expect(useSnippetModal.getState().isOpen).toBe(true);
  });

  it("close() 将 isOpen 设为 false", () => {
    useSnippetModal.setState({ isOpen: true });
    useSnippetModal.getState().close();
    expect(useSnippetModal.getState().isOpen).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web test -- use-snippet-modal
```
Expected: FAIL — `Cannot find module './use-snippet-modal'`

- [ ] **Step 3: 实现 store**

```ts
// apps/web/store/use-snippet-modal.ts
import { create } from "zustand";

interface SnippetModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSnippetModal = create<SnippetModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter web test -- use-snippet-modal
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/store/use-snippet-modal.ts apps/web/store/use-snippet-modal.test.ts
git commit -m "feat(web): 新增 useSnippetModal stub store（预留全局碎语弹窗）"
```

---

### Task 3: `log-out` SVG 图标

**Files:**
- Create: `packages/icons/svg/log-out.svg`
- Modify (generated): `packages/icons/src/generated/types.ts`, `packages/icons/src/generated/sprite.ts`

- [ ] **Step 1: 创建 SVG 文件**

新建文件 `packages/icons/svg/log-out.svg`，内容：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <polyline points="16 17 21 12 16 7"/>
  <line x1="21" y1="12" x2="9" y2="12"/>
</svg>
```

- [ ] **Step 2: 重新构建图标包**

```bash
pnpm --filter @repo/icons build
```
Expected: `packages/icons/src/generated/types.ts` 中出现 `'log-out'`

验证：
```bash
grep "log-out" packages/icons/src/generated/types.ts
```

- [ ] **Step 3: Commit**

```bash
git add packages/icons/svg/log-out.svg packages/icons/src/generated/sprite.ts packages/icons/src/generated/types.ts
git commit -m "feat(icons): 新增 log-out 图标"
```

---

### Task 4: `globals.css` 添加下拉入场动画

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: 在 globals.css 中添加 dropdown 动画**

在 `@media (prefers-reduced-motion: reduce)` 块中，给已有列表追加 `.animate-dropdown-enter`：

```css
@media (prefers-reduced-motion: reduce) {
  body::before,
  body::after,
  .animate-modal-pulse,
  .animate-modal-enter,
  .animate-modal-leave,
  .animate-view-enter,
  .animate-dropdown-enter {
    animation: none;
  }
}
```

在文件末尾追加：

```css
@keyframes dropdownEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-dropdown-enter {
  animation: dropdownEnter 150ms ease-out both;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style(web): 新增 dropdown 入场动画 keyframe"
```

---

### Task 5: `NavbarUserMenu` 桌面端下拉组件

**Files:**
- Create: `apps/web/components/navbar/navbar-user-menu.tsx`
- Create: `apps/web/components/navbar/navbar-user-menu.test.tsx`

**Dependency:** Tasks 1, 2, 3, 4 must be complete.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/components/navbar/navbar-user-menu.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarUserMenu } from "./navbar-user-menu";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockOpenSnippetModal = vi.fn();
vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: () => ({ open: mockOpenSnippetModal }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => (
    <span data-testid="user-avatar">{name[0]?.toUpperCase()}</span>
  ),
}));

const mockUser = { id: 1, username: "alice", nickname: "小A", email: "alice@example.com" };

describe("NavbarUserMenu", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockOpenSnippetModal.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("渲染头像按钮，aria-label 包含用户昵称", () => {
    render(<NavbarUserMenu user={mockUser} />);
    expect(screen.getByRole("button", { name: "小A 的账号菜单" })).toBeInTheDocument();
  });

  it("初始状态下拉菜单不可见", () => {
    render(<NavbarUserMenu user={mockUser} />);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击头像按钮展开下拉，显示所有菜单项和邮箱", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    expect(screen.getByText("消息")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("点击容器外部关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「我的账号」跳转 /profile 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    await user.click(screen.getByText("我的账号"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「发表碎语」调用 openSnippetModal 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    await user.click(screen.getByText("发表碎语"));
    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「消息」跳转 /messages 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    await user.click(screen.getByText("消息"));
    expect(mockPush).toHaveBeenCalledWith("/messages");
    expect(screen.queryByText("消息")).not.toBeInTheDocument();
  });

  it("点击「退出登录」调用 /api/auth/logout 并 refresh 页面", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu user={mockUser} />);
    await user.click(screen.getByRole("button", { name: "小A 的账号菜单" }));
    await user.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web test -- navbar-user-menu
```
Expected: FAIL — `Cannot find module './navbar-user-menu'`

- [ ] **Step 3: 实现组件**

```tsx
// apps/web/components/navbar/navbar-user-menu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSnippetModal } from "@/store/use-snippet-modal";

interface NavbarUserMenuProps {
  user: UserResp;
  isGlass?: boolean;
}

export function NavbarUserMenu({ user, isGlass = false }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openSnippetModal } = useSnippetModal();
  const displayName = user.nickname ?? user.username;

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，服务端 token 过期后自然拦截
    }
    router.refresh();
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${displayName} 的账号菜单`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
          "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
          isGlass && "hover:ring-white/30",
        )}
      >
        <UserAvatar name={displayName} size="md" />
      </button>

      {open && (
        <div className="animate-dropdown-enter absolute right-0 top-[calc(100%+8px)] z-[60] min-w-[168px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* 用户信息头 */}
          <div className="border-b border-border/60 px-3.5 py-2.5">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            {user.email && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
                {user.email}
              </p>
            )}
          </div>
          {/* 菜单项 */}
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon name="user" size={14} className="shrink-0 text-muted-foreground/60" />
              我的账号
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); openSnippetModal(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon name="plus" size={14} className="shrink-0 text-muted-foreground/60" />
              发表碎语
            </button>
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon
                name="message-circle"
                size={14}
                className="shrink-0 text-muted-foreground/60"
              />
              消息
            </button>
            <div className="my-1 h-px bg-border/60" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive/80 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
            >
              <SvgIcon name="log-out" size={14} className="shrink-0" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter web test -- navbar-user-menu
```
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/navbar/navbar-user-menu.tsx apps/web/components/navbar/navbar-user-menu.test.tsx
git commit -m "feat(web): 新增 NavbarUserMenu 桌面端用户下拉菜单"
```

---

### Task 6: `NavbarActions` 登录态适配

**Files:**
- Modify: `apps/web/components/navbar/navbar-actions.tsx`
- Modify: `apps/web/components/navbar/navbar-actions.test.tsx`

**Dependency:** Task 5 must be complete.

- [ ] **Step 1: 在 navbar-actions.test.tsx 中添加 mock 和新测试用例**

在文件顶部 import 之后追加：

```tsx
import { useSession } from "@/app/providers/session-provider";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ user: null })),
}));

vi.mock("./navbar-user-menu", () => ({
  NavbarUserMenu: ({ user }: { user: { nickname?: string; username: string } }) => (
    <span data-testid="user-menu">{user.nickname ?? user.username}</span>
  ),
}));
```

在 `beforeEach` 块中追加：

```tsx
vi.mocked(useSession).mockReturnValue({ user: null });
```

在 `describe("NavbarActions")` 末尾追加新测试用例：

```tsx
it("已登录：显示 NavbarUserMenu，不显示登录按钮", () => {
  vi.mocked(useSession).mockReturnValue({
    user: { id: 1, username: "alice", nickname: "小A" },
  });
  render(<NavbarActions />);
  expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  expect(screen.getByText("小A")).toBeInTheDocument();
  expect(screen.queryByText("登录")).not.toBeInTheDocument();
});

it("未登录：显示登录按钮，不显示 UserMenu", () => {
  render(<NavbarActions />);
  expect(screen.getByText("登录")).toBeInTheDocument();
  expect(screen.queryByTestId("user-menu")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认两个新 case 失败**

```bash
pnpm --filter web test -- navbar-actions
```
Expected: 2 new FAIL（现有 5 个 PASS 不变）

- [ ] **Step 3: 修改 navbar-actions.tsx**

完整替换文件内容：

```tsx
// apps/web/components/navbar/navbar-actions.tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { NavbarUserMenu } from "./navbar-user-menu";

type ResolvedTheme = "light" | "dark";

const THEME_ICONS: Record<ResolvedTheme, "sun" | "moon"> = {
  light: "sun",
  dark: "moon",
};

function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === "dark" ? "light" : "dark";
}

interface NavbarActionsProps {
  isGlass?: boolean;
}

export function NavbarActions({ isGlass = false }: NavbarActionsProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { user } = useSession();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className="h-8 w-8 rounded-lg p-0 text-(--fg2) hover:bg-foreground/5 hover:text-foreground data-[glass=true]:text-(--fg2) data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary"
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
        data-glass={isGlass}
      >
        <SvgIcon name={THEME_ICONS[resolvedTheme]} size={18} />
      </Button>

      <div className="hidden md:flex items-center gap-2">
        {user ? (
          <NavbarUserMenu user={user} isGlass={isGlass} />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={() => openLoginModal()}
            className={cn(
              "h-8 rounded-full border-border bg-foreground/5 px-4 text-xs font-semibold text-foreground hover:bg-foreground/10 hover:text-foreground",
              "data-[glass=true]:border-border data-[glass=true]:bg-transparent data-[glass=true]:text-(--fg2) data-[glass=true]:hover:border-primary data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary",
            )}
            data-glass={isGlass}
          >
            {t("auth.login")}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm --filter web test -- navbar-actions
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/navbar/navbar-actions.tsx apps/web/components/navbar/navbar-actions.test.tsx
git commit -m "feat(web): NavbarActions 登录态显示用户头像下拉菜单"
```

---

### Task 7: `NavbarMobileMenu` 登录态布局

**Files:**
- Create: `apps/web/components/navbar/navbar-mobile-menu.test.tsx`
- Modify: `apps/web/components/navbar/navbar-mobile-menu.tsx`

**Dependency:** Tasks 1, 3 must be complete.

- [ ] **Step 1: 新建测试文件**

```tsx
// apps/web/components/navbar/navbar-mobile-menu.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileMenu } from "./navbar-mobile-menu";
import { useSession } from "@/app/providers/session-provider";

vi.mock("../../app/providers/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => (key === "auth.login" ? "登录" : key) }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ user: null })),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => (
    <span data-testid="user-avatar">{name[0]?.toUpperCase()}</span>
  ),
}));

const mockOnClose = vi.fn();

describe("NavbarMobileMenu", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ user: null });
    mockRefresh.mockClear();
    mockOnClose.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("未登录：显示登录按钮，不显示头像", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
  });

  it("已登录：显示用户昵称和头像，不显示登录按钮", () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 1, username: "alice", nickname: "小A" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("小A")).toBeInTheDocument();
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });

  it("已登录：无昵称时显示 username", () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 2, username: "bob" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("已登录：点击退出登录调用 /api/auth/logout 并 refresh 和 onClose", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      user: { id: 1, username: "alice", nickname: "小A" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    await user.click(screen.getByLabelText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web test -- navbar-mobile-menu.test
```
Expected: FAIL（useSession / UserAvatar / useRouter 等调用均不存在于当前实现）

- [ ] **Step 3: 修改 navbar-mobile-menu.tsx**

完整替换文件内容：

```tsx
// apps/web/components/navbar/navbar-mobile-menu.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { UserAvatar } from "@/components/common/user-avatar";

const MOBILE_ITEMS = [
  { label: "碎语", href: "/snippets" },
  { label: "留言", href: "/guestbook" },
  { label: "友邻", href: "/friends" },
  { label: "圈子", href: "/circle" },
] as const;

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavbarMobileMenu({ isOpen, onClose }: NavbarMobileMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { user } = useSession();
  const router = useRouter();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const displayName = user ? (user.nickname ?? user.username) : "";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
    onClose();
  }

  const themeToggle = (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-(--fg2)"
    >
      <span
        className={cn(
          "relative h-[22px] w-10 rounded-full border transition-colors",
          resolvedTheme === "dark" ? "border-primary bg-primary" : "border-border bg-border",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            resolvedTheme === "dark" && "translate-x-[18px]",
          )}
        />
      </span>
      深色模式
    </button>
  );

  return (
    <div
      data-testid="mobile-nav-menu"
      className={cn(
        "grid opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-4 pb-[18px]">
          <div className="mb-2 h-px bg-border" />
          <div className="mb-4 flex flex-col gap-0.5">
            {MOBILE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between rounded-[10px] px-2.5 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span>{item.label}</span>
                <span className="text-[15px] text-(--fg3)">›</span>
              </Link>
            ))}
          </div>

          {user ? (
            <>
              {/* 用户信息行：头像+名字 → /profile，右侧消息+退出图标 */}
              <div className="mb-1 flex items-center justify-between px-0.5">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <UserAvatar name={displayName} size="xs" />
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {displayName}
                  </span>
                </Link>
                <div className="ml-2 flex shrink-0 items-center gap-0.5">
                  <Link
                    href="/messages"
                    onClick={onClose}
                    aria-label="消息"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-(--fg2) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <SvgIcon name="message-circle" size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="退出登录"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/70 transition-colors hover:bg-destructive/[0.08]"
                  >
                    <SvgIcon name="log-out" size={16} />
                  </button>
                </div>
              </div>
              {/* 主题行 */}
              <div className="flex items-center px-0.5 pt-1">{themeToggle}</div>
            </>
          ) : (
            <div className="flex items-center justify-between px-0.5 pt-0.5">
              {themeToggle}
              <Button
                variant="default"
                size="sm"
                onPress={() => {
                  openLoginModal();
                  onClose();
                }}
                className="h-8 rounded-full bg-foreground px-5 text-[13px] font-bold text-background hover:bg-foreground/85"
              >
                {t("auth.login")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter web test -- navbar-mobile-menu.test
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/navbar/navbar-mobile-menu.tsx apps/web/components/navbar/navbar-mobile-menu.test.tsx
git commit -m "feat(web): NavbarMobileMenu 登录态展示用户信息与快捷操作"
```

---

### Task 8: `register-view.tsx` 429 → Toast

**Files:**
- Modify: `apps/web/components/auth/register-view.tsx`
- Modify: `apps/web/components/auth/register-view.test.tsx`

- [ ] **Step 1: 在 register-view.test.tsx 顶部添加 toast mock，并写失败测试**

在文件顶部所有 import 之后，`describe` 之前追加：

```tsx
const mockAddToast = vi.fn();
vi.mock("@/lib/toast", () => ({ addToast: mockAddToast }));
```

在 `beforeEach` 块中追加：

```tsx
mockAddToast.mockClear();
```

在 `describe("RegisterView")` 末尾追加：

```tsx
it("send-code 返回 429 时关闭验证码弹层并 toast 通知，不重试拼图", async () => {
  const user = userEvent.setup();
  vi.mocked(global.fetch)
    .mockResolvedValueOnce({
      json: async () => ({
        code: 0,
        message: "ok",
        data: {
          challenge_id: "c1",
          master_image: "data:image/jpeg;base64,m",
          tile_image: "data:image/png;base64,t",
          tile_x: 10,
          tile_y: 80,
          tile_width: 60,
          tile_height: 60,
          image_width: 300,
          image_height: 220,
        },
      }),
    } as Response)
    .mockResolvedValueOnce({
      json: async () => ({ code: 0, message: "ok", data: { captcha_token: "tok" } }),
    } as Response)
    .mockResolvedValueOnce({
      json: async () => ({ code: 429, message: "IP 已被封禁，请稍后再试", data: null }),
    } as Response);

  render(<RegisterView onSwitchToLogin={mockSwitch} />);
  await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
  await user.click(screen.getByRole("button", { name: "获取验证码" }));

  const track = await screen.findByTestId("captcha-track");
  Object.defineProperty(track, "getBoundingClientRect", {
    value: () => ({
      left: 0, top: 0, right: 300, bottom: 52,
      width: 300, height: 52, x: 0, y: 0, toJSON: () => ({}),
    }),
    configurable: true,
  });
  fireEvent.pointerDown(track, { clientX: 10, pointerId: 1 });
  fireEvent.pointerMove(track, { clientX: 162 });
  fireEvent.pointerUp(track, { clientX: 162, pointerId: 1 });

  await waitFor(() => {
    expect(screen.queryByTestId("captcha-track")).not.toBeInTheDocument();
  });
  expect(mockAddToast).toHaveBeenCalledWith("IP 已被封禁，请稍后再试", "error");
  expect(global.fetch).toHaveBeenCalledTimes(3); // 无第 4 次拼图重试
});
```

- [ ] **Step 2: 运行测试确认新 case 失败**

```bash
pnpm --filter web test -- register-view
```
Expected: 1 new FAIL，其余 PASS

- [ ] **Step 3: 修改 register-view.tsx**

**3a.** 在 import 区末尾追加：
```tsx
import { addToast } from "@/lib/toast";
```

**3b.** 在 `// ── 自定义拼图滑块` 注释行之前，追加 `ApiError` 类（模块级）：
```tsx
class ApiError extends Error {
  constructor(message: string, public readonly code: number) {
    super(message);
    this.name = "ApiError";
  }
}
```

**3c.** 在 `RegisterView` 组件内，将 `requestJSON` 函数中的：
```tsx
if (json.code !== 0) throw new Error(json.message || "请求失败");
```
改为：
```tsx
if (json.code !== 0) throw new ApiError(json.message || "请求失败", json.code);
```

**3d.** 在 `handleCaptchaVerify` 的第一个 `catch (err)` 块，将：
```tsx
} catch {
  // 验证失败：自动刷新新一轮拼图
  try {
    const challenge = await requestJSON<CaptchaChallenge>("/api/captcha/register/challenge", {
      method: "POST",
    });
    setCaptchaChallenge(challenge);
    setCaptchaX(challenge.tile_x);
  } catch {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
  }
}
```
改为：
```tsx
} catch (err) {
  if (err instanceof ApiError && err.code === 429) {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
    addToast(err.message, "error");
    return;
  }
  // 验证失败：自动刷新新一轮拼图
  try {
    const challenge = await requestJSON<CaptchaChallenge>("/api/captcha/register/challenge", {
      method: "POST",
    });
    setCaptchaChallenge(challenge);
    setCaptchaX(challenge.tile_x);
  } catch {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
  }
}
```

- [ ] **Step 4: 运行所有 register-view 测试确认全部通过**

```bash
pnpm --filter web test -- register-view
```
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/register-view.tsx apps/web/components/auth/register-view.test.tsx
git commit -m "fix(web): send-code 429 封禁改为 Toast 通知，不再重试拼图"
```

---

### Task 9: 滑块无缝化 + 输入框间距

**Files:**
- Modify: `apps/web/components/auth/register-view.tsx`
- Modify: `apps/web/components/auth/login-view.tsx`

- [ ] **Step 1: 修改 CaptchaSlider 轨道样式**

在 `register-view.tsx` 的 `CaptchaSlider` 组件中，将 track div 的 className 从：
```tsx
className={cn(
  "relative w-full h-[48px] rounded-xl select-none touch-none overflow-hidden",
  "bg-foreground/[0.05] border border-border",
  disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
)}
```
改为：
```tsx
className={cn(
  "relative w-full h-[44px] rounded-lg select-none touch-none overflow-hidden",
  "bg-foreground/[0.06]",
  disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
)}
```

- [ ] **Step 2: 修改弹层中的拼图区域 + 滑块结构**

在 `register-view.tsx` 的 captchaOpen portal 中，将旧的 `{/* 拼图区域 */}` + `{/* 滑块 */}` 两块结构替换为统一容器：

```tsx
{/* 验证码统一容器（拼图 + 滑块无缝整合） */}
<div className="overflow-hidden rounded-xl border border-border">
  {/* 拼图区域 */}
  <div
    className="relative mx-auto overflow-hidden bg-foreground/[0.03]"
    style={{
      width: captchaChallenge.image_width,
      height: captchaChallenge.image_height,
      maxWidth: "100%",
    }}
  >
    <img
      src={captchaChallenge.master_image}
      alt=""
      className="h-full w-full select-none object-cover"
      draggable={false}
    />
    <img
      src={captchaChallenge.tile_image}
      alt=""
      className="absolute select-none drop-shadow-lg"
      draggable={false}
      style={{
        width: captchaChallenge.tile_width,
        height: captchaChallenge.tile_height,
        left: captchaX,
        top: captchaChallenge.tile_y,
      }}
    />
    {captchaLoading && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    )}
  </div>
  {/* 滑块底栏 */}
  <div className="border-t border-border/50 p-3">
    <CaptchaSlider
      value={captchaX}
      max={Math.max(0, captchaChallenge.image_width - captchaChallenge.tile_width)}
      disabled={captchaLoading}
      onChange={(x) => setCaptchaX(x)}
      onRelease={(x) => handleCaptchaVerify(x)}
    />
  </div>
</div>
```

- [ ] **Step 3: 调整两个表单的输入框间距**

在 `register-view.tsx` 中，找到（表单区域）：
```tsx
<div className="flex flex-col gap-[10px]">
```
改为：
```tsx
<div className="flex flex-col gap-[14px]">
```

在 `login-view.tsx` 中，找到：
```tsx
<div className="flex flex-col gap-[10px]">
```
改为：
```tsx
<div className="flex flex-col gap-[14px]">
```

- [ ] **Step 4: 运行相关测试确认无回归**

```bash
pnpm --filter web test -- register-view login-modal
```
Expected: PASS（全部现有测试通过）

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/register-view.tsx apps/web/components/auth/login-view.tsx
git commit -m "style(web): 验证码滑块弹层无缝化，调整表单输入框间距"
```

---

### Task 10: `comment-item.tsx` 改用公共 UserAvatar

**Files:**
- Modify: `apps/web/components/comments/comment-item.tsx`

- [ ] **Step 1: 修改 comment-item.tsx**

**1a.** 删除文件中的本地 `Avatar` 函数组件（整个 `function Avatar(...)` 定义，约第 20-33 行）。

**1b.** 在 import 区末尾追加：
```tsx
import { UserAvatar } from "@/components/common/user-avatar";
```

**1c.** 将 `ReplyItem` 中的：
```tsx
<Avatar url={reply.from_user?.avatar_url} name={fromName} size="sm" />
```
改为：
```tsx
<UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
```

**1d.** 将 `CommentItem` 中的：
```tsx
<Avatar url={comment.user?.avatar_url} name={displayName} size="md" />
```
改为：
```tsx
<UserAvatar src={comment.user?.avatar_url} name={displayName} size="md" />
```

`UserAvatar` 的 `sm`（22px）和 `md`（28px = `h-7 w-7`）与原始实现尺寸一致，`bg-border text-(--fg2)` 保持一致。

- [ ] **Step 2: 类型检查**

```bash
pnpm --filter web check-types
```
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/comments/comment-item.tsx
git commit -m "refactor(web): comment-item 改用公共 UserAvatar 组件"
```

---

## 执行顺序建议

```
Task 1 (UserAvatar) → Task 2 (SnippetModal) → Task 3 (log-out icon) → Task 4 (CSS)
  → Task 5 (NavbarUserMenu)
  → Task 6 (NavbarActions) + Task 7 (NavbarMobileMenu)  [可并行]
  → Task 8 (429 Toast) + Task 9 (slider/spacing) + Task 10 (comment-item)  [可并行]
```

---

## Self-Review

**Spec Coverage:**
- ✅ 429 → Toast: Task 8
- ✅ 滑块无缝化: Task 9
- ✅ 输入框间距: Task 9
- ✅ UserAvatar 公共组件: Task 1
- ✅ useSnippetModal stub: Task 2
- ✅ log-out 图标: Task 3
- ✅ dropdown 动画: Task 4
- ✅ NavbarUserMenu: Task 5
- ✅ NavbarActions 登录态: Task 6
- ✅ NavbarMobileMenu 登录态: Task 7
- ✅ comment-item 重构: Task 10

**Placeholder scan:** 无 TBD/TODO，所有代码完整。

**Type consistency:**
- `UserAvatar` `{ src?, name, size?, className? }` — Task 1 定义，Task 5/7/10 使用，一致。
- `useSnippetModal` `{ isOpen, open, close }` — Task 2 定义，Task 5 调用 `open`，一致。
- `NavbarUserMenu` `{ user: UserResp, isGlass?: boolean }` — Task 5 定义，Task 6 使用，一致。
- `ApiError` `{ message, code: number }` — Task 8 定义并使用，一致。
- `'log-out'` IconName — Task 3 生成，Task 5/7 使用，一致（需在 Task 3 后执行 5/7）。
