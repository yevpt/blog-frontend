# Mobile Menu Bottom Actions 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重设计移动端导航栏下拉菜单登录态底部操作区——退出按钮移入用户卡片、消息与主题改为列表行、两种状态主题切换统一为图标色块样式。

**Architecture:** 只改动单个组件文件 `navbar-mobile-menu.tsx`：用户卡片重构为外层 `div` + 内层 `Link`（头像/名字）+ 独立退出 `button`；底部三列网格替换为全宽列表行；新增 `themeRow` 变量共享于登录/未登录两个分支；新增 `unreadCount?: number` prop 控制消息徽标。

**Tech Stack:** React, TypeScript, TailwindCSS, Next.js App Router, Vitest + @testing-library/react

---

## 文件一览

| 操作   | 路径                                                     |
| ------ | -------------------------------------------------------- |
| Modify | `apps/web/components/navbar/navbar-mobile-menu.tsx`      |
| Modify | `apps/web/components/navbar/navbar-mobile-menu.test.tsx` |

---

## Task 1：更新测试文件（先写失败测试）

**Files:**

- Modify: `apps/web/components/navbar/navbar-mobile-menu.test.tsx`

- [ ] **步骤 1：删除将失效的两个测试**

删除以下两个 `it` 块（新设计中这些 class 不再存在）：

```
it("已登录：底部消息、主题、退出区域使用紧凑高度", ...)   // 检查 h-10，新设计无此 class
it("已登录：退出按钮 class 包含 bg-destructive", ...)      // 退出按钮已移至用户卡片，无 bg-destructive
```

- [ ] **步骤 2：在文件末尾（`})`前）追加新测试**

将以下内容追加到 `describe("NavbarMobileMenu", () => {` 块内最后一个 `it` 之后：

```tsx
it("已登录：退出按钮在用户卡片区，aria-label 为「退出登录」", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  const logoutBtn = screen.getByRole("button", { name: "退出登录" });
  expect(logoutBtn).toBeInTheDocument();
  // 退出按钮不在底部三列网格中，不含 bg-destructive
  expect(logoutBtn.className).not.toMatch(/bg-destructive/);
});

it("已登录：unreadCount 未传时不渲染徽标", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  expect(screen.queryByText(/^\d+$|^99\+$/)).not.toBeInTheDocument();
});

it("已登录：unreadCount=5 时消息行渲染 '5'", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} unreadCount={5} />);
  expect(screen.getByText("5")).toBeInTheDocument();
});

it("已登录：unreadCount=100 时消息行渲染 '99+'", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} unreadCount={100} />);
  expect(screen.getByText("99+")).toBeInTheDocument();
});

it("已登录：主题行含 amber 图标（icon-sun 或 icon-moon）", () => {
  vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  // 浅色模式下显示 moon 图标
  expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
});

it("未登录：主题行含 amber 图标（icon-moon）", () => {
  render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
  expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
});
```

- [ ] **步骤 3：运行测试，确认新增测试失败、已有测试通过**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @apps/web test -- --reporter=verbose navbar-mobile-menu
```

预期：新增的 6 个测试 **FAIL**，原有测试（除被删除的 2 个）**PASS**。

---

## Task 2：实现组件变更

**Files:**

- Modify: `apps/web/components/navbar/navbar-mobile-menu.tsx`

- [ ] **步骤 1：用以下完整内容替换文件**

```tsx
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
import { NAV_ITEMS } from "./nav-items";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export function NavbarMobileMenu({ isOpen, onClose, unreadCount }: NavbarMobileMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { userId, profile } = useSession();
  const router = useRouter();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const displayName = profile?.nickname ?? profile?.username ?? "我的账号";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
    onClose();
  }

  const navLinkClass =
    "flex min-h-10 items-center justify-between rounded-[14px] px-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.05] dark:hover:bg-white/10";

  const cardClass = "rounded-2xl bg-gradient-to-br from-primary/[0.08] to-amber-500/[0.10]";

  const listRowClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] transition-colors hover:bg-foreground/[0.04]";

  // 登录态和未登录态共用同一主题切换行
  const themeRow = (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={listRowClass}
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/[0.10]">
        <SvgIcon
          name={resolvedTheme === "dark" ? "moon" : "sun"}
          size={14}
          className="text-amber-500"
        />
      </div>
      <span className="flex-1 text-[13px] font-medium text-foreground">
        {resolvedTheme === "dark" ? "深色模式" : "浅色模式"}
      </span>
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
        <div className="px-3 pb-3">
          <div className="border-t border-border/60 pt-3">
            {/* ── 用户卡片区 ── */}
            {userId != null ? (
              <div className={cn("flex min-w-0 items-center gap-2 px-3 py-[11px]", cardClass)}>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
                >
                  <UserAvatar
                    src={profile?.avatar_url ?? undefined}
                    name={displayName}
                    size="md"
                    className="h-9 w-9 text-[13px]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold leading-tight text-foreground">
                      {displayName}
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-medium text-(--fg3)">
                      查看个人主页
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="退出登录"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-foreground/[0.28] transition-all duration-150 hover:bg-destructive/[0.10] hover:text-destructive/70 active:scale-90 dark:text-foreground/[0.45] dark:hover:bg-destructive/[0.15] dark:hover:text-destructive/80"
                >
                  <SvgIcon name="log-out" size={16} />
                </button>
              </div>
            ) : (
              <div className={cn("flex items-center gap-3 px-3 py-3", cardClass)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.14] text-primary">
                  <SvgIcon name="user" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-tight text-foreground">
                    欢迎回来
                  </p>
                  <p className="mt-1 truncate text-[11px] font-medium text-(--fg3)">
                    登录后可查看消息与个人主页
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => {
                    openLoginModal();
                    onClose();
                  }}
                  className="h-8 shrink-0 rounded-full bg-foreground px-4 text-[12px] font-bold text-background hover:bg-foreground/85"
                >
                  {t("auth.login")}
                </Button>
              </div>
            )}

            {/* ── 导航项 ── */}
            <div className="mt-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={navLinkClass}>
                  <span>{item.label}</span>
                  <SvgIcon name="chevron-right" size={15} className="text-(--fg3)" />
                </Link>
              ))}
            </div>

            {/* ── 底部操作区 ── */}
            <div className="mt-2 border-t border-border/60 pt-2">
              {userId != null && (
                <Link
                  href="/messages"
                  onClick={onClose}
                  aria-label="我的消息"
                  className={listRowClass}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.10]">
                    <SvgIcon name="bell" size={14} className="text-primary" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-foreground">我的消息</span>
                  {unreadCount != null && unreadCount > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </span>
                  )}
                </Link>
              )}
              {themeRow}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：运行 TypeScript 类型检查**

```bash
pnpm --filter apps/web check-types
```

预期：无类型错误。

---

## Task 3：运行所有测试，验证通过，提交

**Files:** 无新增文件，仅验证前两个任务的结果

- [ ] **步骤 1：运行该组件的完整测试套件**

```bash
pnpm --filter @apps/web test -- --reporter=verbose navbar-mobile-menu
```

预期（共 11 个测试，全部 PASS）：

```
✓ 未登录：显示登录按钮，不显示头像
✓ 未登录：底部主题切换行渲染，显示「浅色模式」文字
✓ 深色主题下底部切换行显示「深色模式」
✓ 已登录：显示用户区域和头像，不显示登录提示
✓ 按主页、碎语、留言、友邻、圈子的顺序渲染移动导航
✓ 已登录：点击退出登录调用 /api/auth/logout 并 refresh 和 onClose
✓ 已登录：主题切换按钮有 cursor-pointer 样式
✓ 已登录：退出按钮在用户卡片区，aria-label 为「退出登录」
✓ 已登录：unreadCount 未传时不渲染徽标
✓ 已登录：unreadCount=5 时消息行渲染 '5'
✓ 已登录：unreadCount=100 时消息行渲染 '99+'
✓ 已登录：主题行含 amber 图标（icon-sun 或 icon-moon）
✓ 未登录：主题行含 amber 图标（icon-moon）
```

如测试失败，对照 Task 2 步骤 1 的代码检查对应行。

- [ ] **步骤 2：运行全量测试确认无回归**

```bash
pnpm --filter @apps/web test
```

预期：所有测试通过，无新增失败。

- [ ] **步骤 3：提交**

```bash
git add apps/web/components/navbar/navbar-mobile-menu.tsx \
        apps/web/components/navbar/navbar-mobile-menu.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): 重设计移动端菜单底部操作区

- 退出按钮移至用户卡片右侧（log-out 图标，hover 变红，active 缩放）
- 深色模式退出按钮透明度提高（/0.28 → /0.45）修复不可见问题
- 用户卡片背景统一为 from-primary/[0.08] to-amber-500/[0.10]
- 底部三列网格替换为全宽列表行（消息行 + 主题行）
- 消息行支持未读徽标（1-99 数字，≥100 显示 99+）
- 登录态与未登录态主题切换统一为图标色块 + toggle 开关样式
- 新增 unreadCount 可选 prop
EOF
)"
```

---

## 自检：规格覆盖

| 规格条目                                         | 对应 Task                |
| ------------------------------------------------ | ------------------------ |
| 用户卡片重构为 div + Link + button               | Task 2                   |
| 卡片背景 from-primary/[0.08] to-amber-500/[0.10] | Task 2                   |
| 退出按钮交互（hover/active/dark）                | Task 2                   |
| 底部替换为列表行 + border-t                      | Task 2                   |
| 消息行 + 徽标（99+截断）                         | Task 2                   |
| 无 chevron-right                                 | Task 2（代码中无该元素） |
| 主题行统一为图标色块样式                         | Task 2                   |
| 未登录态主题行同步更新                           | Task 2                   |
| unreadCount prop                                 | Task 1 + Task 2          |
| 测试：徽标显示逻辑                               | Task 1                   |
| 测试：退出按钮位置                               | Task 1                   |
