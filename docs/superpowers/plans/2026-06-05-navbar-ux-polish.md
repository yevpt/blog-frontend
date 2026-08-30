# Navbar UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Navbar 移动端/桌面端的 cursor-pointer 缺失、移动端未登录主题切换区视觉薄弱、桌面端下拉框头部失衡等问题，并重设计桌面端下拉框结构。

**Architecture:** 纯 UI 层改动，不涉及状态管理或路由变更。移动端两个组件文件各自独立修改；桌面端 `NavbarUserMenu` 重构下拉 JSX，添加 `unreadCount` 可选 prop（暂时默认 0，数据接入留后续）。

**Tech Stack:** Next.js App Router, React, TailwindCSS, `clsx`/`tailwind-merge`（通过 `cn`）, `@repo/icons` SvgIcon, Vitest + @testing-library/react

---

## 文件清单

| 操作   | 路径                                                     |
| ------ | -------------------------------------------------------- |
| Create | `packages/icons/svg/bell.svg`                            |
| Modify | `apps/web/components/navbar/navbar-mobile-menu.tsx`      |
| Modify | `apps/web/components/navbar/navbar-mobile-menu.test.tsx` |
| Modify | `apps/web/components/navbar/navbar-user-menu.tsx`        |
| Modify | `apps/web/components/navbar/navbar-user-menu.test.tsx`   |

---

## Task 1: 添加 bell 图标到 @repo/icons

**Files:**

- Create: `packages/icons/svg/bell.svg`

- [ ] **Step 1: 写入 bell.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</svg>
```

保存到 `packages/icons/svg/bell.svg`。

- [ ] **Step 2: 构建图标包，生成类型和 sprite**

```bash
pnpm --filter @repo/icons build
```

预期：无报错，`packages/icons/src/` 下生成更新文件，`bell` 出现在类型联合中。

- [ ] **Step 3: 验证类型可用**

```bash
pnpm --filter @repo/icons check-types
```

预期：PASS，无 TypeScript 错误。

- [ ] **Step 4: 提交**

```bash
git add packages/icons/svg/bell.svg packages/icons/src
git commit -m "chore(icons): 新增 bell 通知铃铛图标"
```

---

## Task 2: 移动端基础修复——cursor-pointer + 退出按钮背景色增强

**Files:**

- Modify: `apps/web/components/navbar/navbar-mobile-menu.tsx`
- Test: `apps/web/components/navbar/navbar-mobile-menu.test.tsx`

- [ ] **Step 1: 写失败测试——cursor-pointer 和退出背景色**

在 `navbar-mobile-menu.test.tsx` 的 `describe` 块末尾追加：

```tsx
it("已登录：主题切换按钮有 cursor-pointer 样式", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  const themeBtn = screen.getByRole("button", {
    name: "当前生效主题：light，点击切换到 dark",
  });
  expect(themeBtn.className).toContain("cursor-pointer");
});

it("已登录：退出按钮 class 包含 bg-destructive", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  const logoutBtn = screen.getByRole("button", { name: "退出登录" });
  expect(logoutBtn.className).toMatch(/bg-destructive/);
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：新增的 2 个测试 FAIL。

- [ ] **Step 3: 修改 navbar-mobile-menu.tsx**

定位 `actionClass` 变量（第 38-39 行），添加 `cursor-pointer`：

```tsx
const actionClass =
  "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[13px] bg-foreground/[0.04] px-3 text-[12px] font-semibold text-(--fg2) transition-colors hover:bg-primary/[0.10] hover:text-primary dark:bg-white/[0.06]";
```

定位退出按钮的 `cn(actionClass, ...)` 调用，将背景色从 `0.07` 加深到 `0.10`，hover 从 `0.10` 到 `0.14`：

```tsx
className={cn(
  actionClass,
  "bg-destructive/[0.10] text-destructive/80 hover:bg-destructive/[0.14] hover:text-destructive",
)}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/navbar/navbar-mobile-menu.tsx \
        apps/web/components/navbar/navbar-mobile-menu.test.tsx
git commit -m "fix(web): 移动端 Navbar 操作按钮加 cursor-pointer，退出背景色加深"
```

---

## Task 3: 移动端未登录状态主题切换区 A2-1 重设计

**Files:**

- Modify: `apps/web/components/navbar/navbar-mobile-menu.tsx`
- Test: `apps/web/components/navbar/navbar-mobile-menu.test.tsx`

- [ ] **Step 1: 更新现有主题切换测试，使其与新设计匹配**

找到测试文件中的 **"未登录：底部主题切换紧凑显示当前浅色主题"**（约第 73 行），替换为：

```tsx
it("未登录：底部主题切换行渲染，显示「浅色模式」文字", () => {
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  const themeBtn = screen.getByRole("button", {
    name: "当前生效主题：light，点击切换到 dark",
  });
  expect(themeBtn).toBeInTheDocument();
  expect(themeBtn).toHaveTextContent("浅色模式");
});
```

找到 **"深色主题下显示当前深色主题"**（约第 82 行），替换为：

```tsx
it("深色主题下底部切换行显示「深色模式」", () => {
  mockResolvedTheme = "dark";
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  const themeBtn = screen.getByRole("button", {
    name: "当前生效主题：dark，点击切换到 light",
  });
  expect(themeBtn).toBeInTheDocument();
  expect(themeBtn).toHaveTextContent("深色模式");
});
```

- [ ] **Step 2: 运行测试，确认这两个测试失败（其余通过）**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：更新后的 2 个测试 FAIL（文字不符）。

- [ ] **Step 3: 在 navbar-mobile-menu.tsx 中替换未登录主题切换区**

找到以下代码段（约第 149-151 行）：

```tsx
) : (
  <div className="mt-3 flex">{themeToggle}</div>
)}
```

替换为：

```tsx
) : (
  <div className="mt-3 border-t border-border/60 pt-3">
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-foreground/[0.04]"
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
    >
      <div className="flex items-center gap-2.5">
        <SvgIcon
          name={resolvedTheme === "dark" ? "moon" : "sun"}
          size={15}
          className="text-(--fg2) opacity-75"
        />
        <span className="text-[13px] font-medium text-(--fg2)">
          {resolvedTheme === "dark" ? "深色模式" : "浅色模式"}
        </span>
      </div>
      <div
        className={cn(
          "relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          resolvedTheme === "dark" ? "bg-primary/80" : "bg-foreground/20",
        )}
      >
        <div
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            resolvedTheme === "dark" ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  </div>
)}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/navbar/navbar-mobile-menu.tsx \
        apps/web/components/navbar/navbar-mobile-menu.test.tsx
git commit -m "feat(web): 移动端未登录主题切换区重设计为扁平 Toggle 行"
```

---

## Task 4: 移动端消息项改名 + 换 bell 图标

**Files:**

- Modify: `apps/web/components/navbar/navbar-mobile-menu.tsx`
- Test: `apps/web/components/navbar/navbar-mobile-menu.test.tsx`

- [ ] **Step 1: 更新测试中的「消息」引用**

在测试文件中找到 **"已登录：底部消息、主题、退出区域使用紧凑高度"**（约第 135 行），将：

```tsx
expect(screen.getByRole("link", { name: "消息" }).className).toContain("h-10");
```

改为：

```tsx
expect(screen.getByRole("link", { name: "我的消息" }).className).toContain("h-10");
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：上述 1 个测试 FAIL（找不到 "我的消息"）。

- [ ] **Step 3: 修改 navbar-mobile-menu.tsx 中的消息链接**

找到已登录状态的消息 `<Link>`（约第 128-134 行）：

```tsx
<Link href="/messages" onClick={onClose} aria-label="消息" className={actionClass}>
  <SvgIcon name="message-circle" size={18} />
  <span>消息</span>
</Link>
```

替换为：

```tsx
<Link href="/messages" onClick={onClose} aria-label="我的消息" className={actionClass}>
  <SvgIcon name="bell" size={18} />
  <span>我的消息</span>
</Link>
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/web test -- --run navbar-mobile-menu
```

预期：所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/navbar/navbar-mobile-menu.tsx \
        apps/web/components/navbar/navbar-mobile-menu.test.tsx
git commit -m "feat(web): 移动端消息项改名为「我的消息」，图标换 bell"
```

---

## Task 5: 桌面端 cursor-pointer + 下拉框完整重设计

**Files:**

- Modify: `apps/web/components/navbar/navbar-user-menu.tsx`
- Test: `apps/web/components/navbar/navbar-user-menu.test.tsx`

### 5-A: 先更新测试文件（删旧增新）

- [ ] **Step 1: 更新 navbar-user-menu.test.tsx**

用以下内容完整替换测试文件（保留所有 mock 和 `makeProfile` 不变，只更新 `describe` 块内的测试用例）：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserDetailResp } from "@repo/api";
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
  UserAvatar: ({ src, name }: { src?: string; name: string }) =>
    src ? (
      <img data-testid="user-avatar-img" src={src} alt={name} />
    ) : (
      <span data-testid="user-avatar-fallback">{name[0]?.toUpperCase() ?? "?"}</span>
    ),
}));

const mockUseSession = vi.fn();
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

let mobileMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

function makeProfile(overrides: Partial<UserDetailResp> = {}): UserDetailResp {
  return {
    id: 1,
    username: "testuser",
    roles: [],
    status: 1,
    ...overrides,
  };
}

describe("NavbarUserMenu", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockOpenSnippetModal.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
    mobileMediaListener = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === "change" && query === "(max-width: 767px)") {
            mobileMediaListener = listener;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    mockUseSession.mockReturnValue({ userId: 1, profile: makeProfile() });
  });

  it("渲染头像按钮，aria-label 包含账号菜单文字", () => {
    render(<NavbarUserMenu />);
    expect(screen.getByRole("button", { name: /账号菜单/ })).toBeInTheDocument();
  });

  it("头像触发按钮含 cursor-pointer 样式", () => {
    render(<NavbarUserMenu />);
    expect(screen.getByRole("button", { name: /账号菜单/ }).className).toContain("cursor-pointer");
  });

  it("初始状态下拉菜单不可见", () => {
    render(<NavbarUserMenu />);
    expect(screen.queryByText("管理账号", { exact: false })).not.toBeInTheDocument();
  });

  it("点击头像展开下拉，显示昵称行、功能项、退出登录", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("管理账号", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    expect(screen.getByText("我的消息")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("下拉展开后不显示邮箱", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ email: "alice@example.com" }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
  });

  it("点击容器外部关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击昵称行跳转 /profile 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("管理账号", { exact: false }));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「发表碎语」调用 openSnippetModal 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("发表碎语"));
    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「我的消息」跳转 /messages 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("我的消息"));
    expect(mockPush).toHaveBeenCalledWith("/messages");
    expect(screen.queryByText("我的消息")).not.toBeInTheDocument();
  });

  it("点击「退出登录」调用 /api/auth/logout 并 refresh 页面", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });

  // ── unreadCount 徽标 ────────────────────────────────────────────

  it("unreadCount 为 0 时不显示徽标", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={0} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });

  it("unreadCount 为 10 时显示数字 10", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={10} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("10");
  });

  it("unreadCount 超过 99 时显示 99+", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={100} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("99+");
  });

  // ── profile 场景 ────────────────────────────────────────────────

  it("profile.avatar_url 有值时渲染 <img> 头像", () => {
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ avatar_url: "https://example.com/avatar.png" }),
    });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-img")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
  });

  it("profile 无 avatar_url 时渲染首字母 fallback", () => {
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ username: "alice" }),
    });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("A");
  });

  it("profile 为 null 时不崩溃，显示 ? fallback", () => {
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("?");
  });

  it("下拉展开时显示 nickname（优先于 username）", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ username: "alice", nickname: "爱丽丝" }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("爱丽丝")).toBeInTheDocument();
  });

  it("下拉展开后切换到移动端断点时自动关闭 portal 菜单", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("发表碎语")).toBeInTheDocument();

    act(() => {
      mobileMediaListener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认新测试失败、老测试行为一致**

```bash
pnpm --filter @repo/web test -- --run navbar-user-menu
```

预期：新增的「cursor-pointer」「管理账号」「我的消息」「unreadCount」等测试 FAIL。

### 5-B: 修改 navbar-user-menu.tsx

- [ ] **Step 3: 更新 NavbarUserMenuProps + 函数签名**

将文件顶部接口和函数签名替换为：

```tsx
interface NavbarUserMenuProps {
  isGlass?: boolean;
  unreadCount?: number;
}

export function NavbarUserMenu({ isGlass = false, unreadCount = 0 }: NavbarUserMenuProps) {
```

- [ ] **Step 4: 头像触发按钮加 cursor-pointer**

找到 `<button ref={buttonRef}` 的 `className`（约第 153-157 行），加入 `cursor-pointer`：

```tsx
className={cn(
  "relative cursor-pointer overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
  "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
  isGlass && "hover:ring-white/30",
)}
```

- [ ] **Step 5: 替换下拉框 JSX**

将 `const dropdown = (` 到 `);`（约第 85-143 行）的整个下拉 JSX 替换为：

```tsx
const dropdown = (
  <div
    ref={dropdownRef}
    style={dropdownStyle}
    className="animate-dropdown-enter z-[200] min-w-[190px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
  >
    {/* 昵称行：点击跳主页/设置 */}
    <div className="px-1.5 pt-1.5 pb-1">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-primary/[0.07] px-3 py-2 text-left transition-colors hover:bg-primary/[0.10]"
      >
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold leading-tight text-foreground">
            {displayName || "我的账号"}
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-primary/70">管理账号 →</span>
        </span>
        <SvgIcon name="chevron-right" size={13} className="shrink-0 text-(--fg3) opacity-50" />
      </button>
    </div>

    {/* 功能区 */}
    <div className="flex flex-col gap-0.5 border-t border-border/60 px-1.5 py-1.5">
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          openSnippetModal();
        }}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
      >
        <SvgIcon name="plus" size={14} className="shrink-0 text-muted-foreground/60" />
        发表碎语
      </button>
      <button
        type="button"
        onClick={() => navigate("/messages")}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
      >
        <SvgIcon name="bell" size={14} className="shrink-0 text-muted-foreground/60" />
        <span className="flex-1">我的消息</span>
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>

    {/* 退出区（G2：普通分割线隔离） */}
    <div className="border-t border-border/60 px-1.5 pb-1.5 pt-1">
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive/80 transition-colors hover:bg-destructive/[0.07] hover:text-destructive"
      >
        <SvgIcon name="log-out" size={14} className="shrink-0" />
        退出登录
      </button>
    </div>
  </div>
);
```

- [ ] **Step 6: 运行测试，确认全部通过**

```bash
pnpm --filter @repo/web test -- --run navbar-user-menu
```

预期：所有测试 PASS。

- [ ] **Step 7: 运行全量测试，确认无回归**

```bash
pnpm --filter @repo/web test -- --run
```

预期：全部 PASS，无新失败。

- [ ] **Step 8: 提交**

```bash
git add apps/web/components/navbar/navbar-user-menu.tsx \
        apps/web/components/navbar/navbar-user-menu.test.tsx
git commit -m "feat(web): 桌面端 Navbar 下拉框重设计——昵称行、我的消息、unreadCount 徽标、G2 退出区"
```

---

## 自检清单

- [x] 规格 §1 cursor-pointer → Task 2
- [x] 规格 §2 退出按钮背景色 → Task 2
- [x] 规格 §3 未登录主题切换 A2-1 → Task 3
- [x] 规格 §4 桌面端 cursor-pointer → Task 5-B Step 4
- [x] 规格 §5 下拉框结构重设计（F3+H2）→ Task 5-B Step 5
- [x] 规格 §5 未读数徽标 → Task 5-B Step 5 + 测试 Step 1
- [x] 规格 §6 退出 G2 普通分割线 + hover 动效 → Task 5-B Step 5
- [x] 规格 §7 移动端消息改名 + bell 图标 → Task 4
