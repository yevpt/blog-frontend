# Theme Cookie Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将主题系统从 localStorage 迁移到 Cookie 方案，彻底消除 React 19 `<script>` 标签警告，并支持 system/light/dark 三种模式。

**Architecture:** `base.css` 用 Tailwind v4 的 `@custom-variant dark` + `@variant dark` 将深色变量只写一次，编译器自动扩展为 `.dark` 类和媒体查询两条规则。`layout.tsx` 读 Cookie 给 `<html>` 加 class（无 class = system），用 `<style>` 注入关键 CSS 防 FOUC。`ThemeProvider` 读写 Cookie，"system" 模式不操作 class 让 CSS 媒体查询自动处理。

**Tech Stack:** Next.js App Router (cookies), Tailwind CSS v4 (@custom-variant/@variant), TypeScript, Vitest + @testing-library/react

---

## File Map

| 状态 | 文件 | 说明 |
|------|------|------|
| M | `packages/styles/src/base.css` | @custom-variant dark + @variant dark，删除 .dark 块 |
| M | `apps/web/lib/theme-init.ts` | 更新 THEME_CRITICAL_CSS，删除 THEME_INIT_SCRIPT |
| M | `apps/web/lib/theme-init.test.ts` | 删除 THEME_INIT_SCRIPT 测试，补充 CSS 媒体查询断言 |
| M | `apps/web/app/layout.tsx` | 读 Cookie → html class，`<style>` 替换 `<script>` |
| M | `apps/web/app/providers/theme-provider.tsx` | Cookie 读写，applyTheme 管理 dark/light/无 class |
| M | `apps/web/app/providers/theme-provider.test.tsx` | localStorage → Cookie，补充 system class 行为测试 |

---

## Task 1: base.css — @custom-variant dark + @variant dark

**Files:**
- Modify: `packages/styles/src/base.css`

- [ ] **Step 1: 替换整个 base.css**

用以下内容完整替换 `packages/styles/src/base.css`：

```css
@import "tailwindcss";

/* 让 Tailwind 扫描共享包里的 className，避免只在 package 中出现的样式被裁掉。 */
@source "../../ui/src";
@source "../../hooks/src";

/*
  dark 变体：匹配 .dark 类（显式深色）或媒体查询（系统深色，且未被 .light 覆盖）。
  Tailwind 编译时会为所有使用 dark: 前缀的工具类以及 @variant dark { } 块
  分别生成这两条规则，深色配置只需在源码写一次。
*/
@custom-variant dark {
  &.dark {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:not(.light) {
      @slot;
    }
  }
}

/* 这里定义的是整个 monorepo 共享的设计令牌，两个应用都会使用同一套颜色语义。 */
@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222.2 84% 4.9%);
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(222.2 84% 4.9%);
}

/* 页面级基础样式放在共享包里，应用只保留自己特有的布局限制。 */
html {
  background-color: var(--color-background);
  color-scheme: light;
}

body {
  margin: 0;
  /* 使用 CSS 变量确保与 Tailwind bg-background 保持一致 */
  background: var(--color-background);
  color: var(--color-foreground);
}

/*
  深色主题令牌：通过 @custom-variant dark 同时覆盖 .dark 类和系统媒体查询。
  Tailwind 编译输出：
    :root.dark { ... }
    @media (prefers-color-scheme: dark) { :root:not(.light) { ... } }
  深色颜色值仅在此处定义一次。
*/
:root {
  @variant dark {
    --color-background: hsl(222.2 84% 4.9%);
    --color-foreground: hsl(210 40% 98%);
    --color-card: hsl(222.2 84% 4.9%);
    --color-card-foreground: hsl(210 40% 98%);
    --color-primary: hsl(210 40% 98%);
    --color-primary-foreground: hsl(222.2 47.4% 11.2%);
    --color-secondary: hsl(217.2 32.6% 17.5%);
    --color-secondary-foreground: hsl(210 40% 98%);
    --color-muted: hsl(217.2 32.6% 17.5%);
    --color-muted-foreground: hsl(215 20.2% 65.1%);
    --color-accent: hsl(217.2 32.6% 17.5%);
    --color-accent-foreground: hsl(210 40% 98%);
    --color-border: hsl(217.2 32.6% 17.5%);
    --color-input: hsl(217.2 32.6% 17.5%);
    --color-ring: hsl(212.7 26.8% 83.9%);
    color-scheme: dark;
  }
}

/* 心形点赞跳动动效，用于 ArticleCardStats 的 heart 图标 */
@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.3);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.3);
  }
  70% {
    transform: scale(1);
  }
}
```

- [ ] **Step 2: 验证 TypeScript 类型检查通过**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test 2>&1 | tail -6
```

期望：所有测试通过（CSS 变更不影响 JS 测试）。

- [ ] **Step 3: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
git add packages/styles/src/base.css
git commit -m "refactor(styles): @custom-variant dark 合并媒体查询，深色变量只写一次"
```

---

## Task 2: theme-init.ts + 测试 — 更新关键 CSS，删除脚本

**Files:**
- Modify: `apps/web/lib/theme-init.ts`
- Modify: `apps/web/lib/theme-init.test.ts`

- [ ] **Step 1: 更新测试，删除 THEME_INIT_SCRIPT 相关用例，补充媒体查询断言**

完整替换 `apps/web/lib/theme-init.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { shouldUseDarkTheme, THEME_CRITICAL_CSS } from "./theme-init";

describe("shouldUseDarkTheme", () => {
  it("cookie 为 dark 时始终使用暗色", () => {
    expect(shouldUseDarkTheme("dark", false)).toBe(true);
    expect(shouldUseDarkTheme("dark", true)).toBe(true);
  });

  it("cookie 为 light 时始终使用亮色", () => {
    expect(shouldUseDarkTheme("light", false)).toBe(false);
    expect(shouldUseDarkTheme("light", true)).toBe(false);
  });

  it("未设置或 system 时跟随系统偏好", () => {
    expect(shouldUseDarkTheme(null, true)).toBe(true);
    expect(shouldUseDarkTheme(null, false)).toBe(false);
    expect(shouldUseDarkTheme("system", true)).toBe(true);
    expect(shouldUseDarkTheme("system", false)).toBe(false);
  });
});

describe("THEME_CRITICAL_CSS", () => {
  it("包含默认浅色背景和 color-scheme", () => {
    expect(THEME_CRITICAL_CSS).toContain("hsl(0 0% 100%)");
    expect(THEME_CRITICAL_CSS).toContain("color-scheme:light");
  });

  it("包含 .dark 的深色背景", () => {
    expect(THEME_CRITICAL_CSS).toContain("html.dark");
    expect(THEME_CRITICAL_CSS).toContain("hsl(222.2 84% 4.9%)");
    expect(THEME_CRITICAL_CSS).toContain("color-scheme:dark");
  });

  it("包含系统深色媒体查询（排除 .light 覆盖）", () => {
    expect(THEME_CRITICAL_CSS).toContain("prefers-color-scheme:dark");
    expect(THEME_CRITICAL_CSS).toContain(":not(.light)");
  });

  it("不包含任何 script 或 JS 代码", () => {
    expect(THEME_CRITICAL_CSS).not.toContain("document");
    expect(THEME_CRITICAL_CSS).not.toContain("localStorage");
    expect(THEME_CRITICAL_CSS).not.toContain("function");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter web run test -- lib/theme-init.test 2>&1 | tail -10
```

期望：`THEME_CRITICAL_CSS` 相关测试失败（尚未更新实现）。

- [ ] **Step 3: 更新 theme-init.ts**

完整替换 `apps/web/lib/theme-init.ts`：

```ts
/** 根据 cookie/存储值与系统偏好判断首屏是否应使用暗色主题 */
export function shouldUseDarkTheme(stored: string | null, prefersDark: boolean): boolean {
  return stored === "dark" || (stored !== "light" && prefersDark);
}

/**
 * 首屏关键内联样式：在外部 CSS 加载前防止背景闪烁（FOUC）。
 * 覆盖三种状态：
 *   html（无 class）= system → 媒体查询决定
 *   html.dark       = 强制深色
 *   html.light      = 强制浅色（覆盖媒体查询）
 *
 * 注意：深色背景值在此处重复出现（.dark 和 @media），这是防 FOUC 内联样式
 * 的必要代价，仅含 background-color 与 color-scheme 两个属性，不影响
 * base.css 中完整色板的单一来源原则。
 */
export const THEME_CRITICAL_CSS =
  "html{background-color:hsl(0 0% 100%);color-scheme:light}" +
  "html.dark{background-color:hsl(222.2 84% 4.9%);color-scheme:dark}" +
  "@media(prefers-color-scheme:dark){html:not(.light){background-color:hsl(222.2 84% 4.9%);color-scheme:dark}}";
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter web run test -- lib/theme-init.test 2>&1 | tail -6
```

期望：4 个测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/theme-init.ts apps/web/lib/theme-init.test.ts
git commit -m "refactor(web): THEME_CRITICAL_CSS 加入系统深色媒体查询，删除 THEME_INIT_SCRIPT"
```

---

## Task 3: layout.tsx — Cookie 读取 + style 标签

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: 更新 layout.tsx**

完整替换 `apps/web/app/layout.tsx`：

```tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SvgSprite } from "@repo/icons";
import { SiteFooter } from "@/components/footer";
import { SiteNavbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { THEME_CRITICAL_CSS } from "@/lib/theme-init";
import { ThemeProvider } from "./providers/theme-provider";
import { LocaleProvider } from "./providers/locale-provider";
import { SessionProvider } from "./providers/session-provider";
import type { Metadata } from "next";
import "./globals.css";

const SITE_TITLE = "Yevpt's Blog";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "分享编程、工具、文学的个人博客",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  // 读取主题 Cookie，决定 <html> 的初始 class：
  //   "dark"   → class="dark"    强制深色
  //   "light"  → class="light"   强制浅色（CSS 媒体查询不会覆盖）
  //   其他/无   → 无 class        CSS 媒体查询跟随系统偏好
  const cookieStore = await cookies();
  const themePref = cookieStore.get("theme")?.value;
  const themeClass =
    themePref === "dark" ? "dark" : themePref === "light" ? "light" : undefined;

  return (
    <html lang="zh-CN" className={themeClass} suppressHydrationWarning>
      <head>
        {/* 关键内联样式：外部 CSS 加载前防止背景闪烁 */}
        <style dangerouslySetInnerHTML={{ __html: THEME_CRITICAL_CSS }} />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <SessionProvider user={session?.user ?? null}>
              <div className="flex flex-col min-h-screen">
                {/* SvgSprite 将雪碧图注入 DOM，必须在所有使用 SvgIcon 的组件之前渲染 */}
                <SvgSprite />
                <SiteNavbar />
                <main className="flex-1 pt-16">{children}</main>
                <SiteFooter />
              </div>
            </SessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 运行类型检查与测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test 2>&1 | tail -6
```

期望：所有测试通过（layout 无单元测试，page.test.tsx 已 mock layout 组件）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "refactor(web): layout 读 Cookie 设主题 class，style 标签替代 script"
```

---

## Task 4: theme-provider.tsx + 测试 — Cookie 读写 + 新 class 管理

**Files:**
- Modify: `apps/web/app/providers/theme-provider.tsx`
- Modify: `apps/web/app/providers/theme-provider.test.tsx`

- [ ] **Step 1: 更新测试，localStorage → Cookie**

完整替换 `apps/web/app/providers/theme-provider.test.tsx`：

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeDisplay() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>set dark</button>
      <button onClick={() => setTheme("light")}>set light</button>
      <button onClick={() => setTheme("system")}>set system</button>
    </div>
  );
}

/** 在 jsdom 中清除指定 cookie */
function clearThemeCookie() {
  document.cookie = "theme=; Max-Age=0; path=/";
}

/** 在 jsdom 中设置指定 cookie */
function setThemeCookie(value: string) {
  document.cookie = `theme=${value}; path=/`;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    clearThemeCookie();
    document.documentElement.classList.remove("dark", "light");

    // mock matchMedia，默认返回 prefers-color-scheme: light
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("渲染不崩溃，children 正常显示", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("cookie 无存储值时，默认 theme 为 system", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("cookie 已存储 dark 时，挂载后 theme 恢复为 dark", async () => {
    setThemeCookie("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });
  });

  it("cookie 已存储 light 时，挂载后 theme 恢复为 light", async () => {
    setThemeCookie("light");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light");
    });
  });

  it("setTheme('dark') 后 theme 状态变为 dark，并写入 cookie", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
  });

  it("setTheme('light') 后 theme 状态变为 light，并写入 cookie", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.cookie).toContain("theme=light");
  });

  it("theme 为 dark 时，html 有 dark class，无 light class", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("theme 为 light 时，html 有 light class，无 dark class", async () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("theme 为 system 时，html 既无 dark 也无 light class（CSS 媒体查询接管）", async () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set system").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("theme 为 dark 时，resolvedTheme 为 dark", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set dark").click();
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });

  it("theme 为 light 时，resolvedTheme 为 light", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it("cookie 为 dark 且系统为亮色时，挂载后仍保持 dark class", async () => {
    setThemeCookie("dark");
    document.documentElement.classList.add("dark");

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    });
  });

  it("system 模式且系统为暗色时，resolvedTheme 为 dark", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    });
  });

  it("setTheme('system') 后写入 cookie theme=system", async () => {
    setThemeCookie("dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText("set system").click();
    });

    expect(document.cookie).toContain("theme=system");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web run test -- theme-provider.test 2>&1 | tail -15
```

期望：多个测试失败（cookie 相关逻辑和 system class 行为）。

- [ ] **Step 3: 更新 theme-provider.tsx**

完整替换 `apps/web/app/providers/theme-provider.tsx`：

```tsx
"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** 用户选择的主题模式（system / light / dark） */
  theme: ThemeMode;
  /** 实际应用的主题（light 或 dark），system 模式下根据系统偏好解析 */
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => undefined,
});

/** 根据系统媒体查询判断当前系统偏好主题 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 将 theme 模式解析为实际可见的 light / dark（供 UI 组件读取） */
function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return getSystemTheme();
}

/**
 * 将 ThemeMode 写入浏览器 Cookie。
 * 开发环境不加 Secure 标志（本地 HTTP），生产环境加 Secure（仅 HTTPS）。
 */
function writeThemeCookie(value: ThemeMode) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `theme=${value}; path=/; SameSite=Lax${secure}; Max-Age=${365 * 24 * 3600}`;
}

/** 从 document.cookie 读取主题偏好 */
function readThemeCookie(): ThemeMode {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
  const value = match?.[1];
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

/**
 * 将选择的 ThemeMode 应用到 documentElement class。
 *   "dark"   → 添加 dark，移除 light
 *   "light"  → 添加 light，移除 dark
 *   "system" → 移除 dark 和 light，由 CSS 媒体查询自动处理
 */
function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const { classList } = document.documentElement;
  if (mode === "dark") {
    classList.add("dark");
    classList.remove("light");
  } else if (mode === "light") {
    classList.add("light");
    classList.remove("dark");
  } else {
    classList.remove("dark");
    classList.remove("light");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const isInitialMount = useRef(true);

  // 监听系统主题变化（仅在 system 模式下更新 resolvedTheme，不操作 class）
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(media.matches ? "dark" : "light");
        // system 模式下 CSS 媒体查询已处理样式，无需操作 class
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  // 首帧读 Cookie 并应用，后续由 setTheme 驱动
  useEffect(() => {
    const mode = isInitialMount.current ? readThemeCookie() : theme;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (mode !== theme) {
        setThemeState(mode);
      }
    }
    applyTheme(mode);
    setResolvedTheme(resolveThemeMode(mode));
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    writeThemeCookie(mode);
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 在 Client Component 中获取当前主题状态及切换方法 */
export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 4: 运行测试，确认全部通过**

```bash
pnpm --filter web run test -- theme-provider.test 2>&1 | tail -8
```

期望：13 个测试全部通过。

- [ ] **Step 5: 全量测试**

```bash
pnpm --filter web run test 2>&1 | tail -6
```

期望：所有测试通过。

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/providers/theme-provider.tsx apps/web/app/providers/theme-provider.test.tsx
git commit -m "refactor(web): ThemeProvider 迁移至 Cookie，system 模式由 CSS 媒体查询处理"
```
