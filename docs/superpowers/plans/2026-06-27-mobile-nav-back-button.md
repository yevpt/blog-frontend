# 移动端导航返回按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让移动端非首页的顶部返回按钮回到「用户真正访问过的上一页」，仅在站内无历史时兜底首页；并把碎语页统一为返回按钮样式。

**Architecture:** 新增 `useBackNavigation` Hook 封装分层返回决策：优先用浏览器 `window.navigation.canGoBack`（权威、零失同步，覆盖 Android Chrome），不支持时退回「落地页路径比对」启发式；动作统一走 Next `router.back()` / `router.push("/")`。`navbar-route-config` 把 `/moments` 从 `home` 改为 `default` variant。`NavbarMobileHeader` 消费 `goBack`。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Vitest + @testing-library/react（jsdom）。

## Global Constraints

- 禁 `any`：用精确类型或 `unknown`；优先纯函数 + Early Return（来自 `AGENTS.md`）。
- 改 Hook → `*.test.ts`，改组件 → `*.test.tsx`，缺测 = 未完成（来自 `AGENTS.md`）。
- `apps/web` 测试环境为 **jsdom**；包名 `web`；单测运行 `pnpm --filter web test <相对路径>`（脚本 `test` = `vitest --run`）。
- 兜底父级统一为 `/`，不做 per-route 映射表。
- Commit message 走 `<type>(<scope>): <中文主题>`，冒号后留空格，主题中文动词开头 ≤50 字、结尾无句号（`commit-msg` 钩子强校验）。

---

### Task 1: 碎语路由改为 default variant + 标题

**Files:**
- Modify: `apps/web/components/navbar/navbar-route-config.ts`
- Test: `apps/web/components/navbar/navbar-route-config.test.ts`
- Test: `apps/web/components/navbar/use-navbar-context.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces: `matchNavbarRoute("/moments")` 返回 `{ mobileVariant: "default", title: "碎语" }`；仅 `/` 仍为 `home` variant。

- [ ] **Step 1: 改测试 — navbar-route-config.test.ts 的 moments 期望**

把文件中现有的 moments 用例（`it("moments 复用 home variant，无标题", ...)` 整块）替换为：

```ts
  it("moments 命中 default，标题为碎语", () => {
    expect(matchNavbarRoute("/moments")).toEqual({
      mobileVariant: "default",
      title: "碎语",
    });
  });
```

- [ ] **Step 2: 改测试 — use-navbar-context.test.ts 的 moments 期望**

把文件中现有的 moments 用例（`it("碎语页复用 home variant，无标题", ...)` 整块）替换为：

```ts
  it("碎语页命中 default variant，标题为碎语，显示返回", () => {
    mockPathname = "/moments";

    const { result } = renderHook(() => useNavbarContext());

    expect(result.current.title).toBe("碎语");
    expect(result.current.mobileVariant).toBe("default");
    expect(result.current.showHomeBack).toBe(true);
    expect(result.current.desktopCapsuleThreshold).toBe(24);
  });
```

- [ ] **Step 3: 跑测试，确认失败**

Run: `pnpm --filter web test components/navbar/navbar-route-config.test.ts components/navbar/use-navbar-context.test.ts`
Expected: FAIL — moments 仍返回 `home`/`undefined`，新断言不满足。

- [ ] **Step 4: 改实现 — navbar-route-config.ts**

删除 `/moments` 的 home 分支，并在标题表登记碎语。把：

```ts
const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  "/guestbook": "留言",
  "/friend-links": "友邻",
  "/circle": "圈子",
  "/notifications": "消息中心",
};

export function matchNavbarRoute(pathname: string): NavbarRouteMatch {
  if (pathname === "/") {
    return { mobileVariant: "home", title: undefined };
  }

  if (pathname === "/moments") {
    return { mobileVariant: "home", title: undefined };
  }

  if (/^\/articles\/\d+$/.test(pathname)) {
```

替换为：

```ts
const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  "/moments": "碎语",
  "/guestbook": "留言",
  "/friend-links": "友邻",
  "/circle": "圈子",
  "/notifications": "消息中心",
};

export function matchNavbarRoute(pathname: string): NavbarRouteMatch {
  if (pathname === "/") {
    return { mobileVariant: "home", title: undefined };
  }

  if (/^\/articles\/\d+$/.test(pathname)) {
```

- [ ] **Step 5: 跑测试，确认通过**

Run: `pnpm --filter web test components/navbar/navbar-route-config.test.ts components/navbar/use-navbar-context.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/navbar/navbar-route-config.ts \
        apps/web/components/navbar/navbar-route-config.test.ts \
        apps/web/components/navbar/use-navbar-context.test.ts
git commit -m "feat(navbar): 碎语移动端改用 default 变体显示返回按钮"
```

---

### Task 2: 新增 useBackNavigation Hook

**Files:**
- Create: `apps/web/components/navbar/use-back-navigation.ts`
- Test: `apps/web/components/navbar/use-back-navigation.test.ts`

**Interfaces:**
- Consumes: `next/navigation` 的 `useRouter()`（`back()`/`push()`）与 `usePathname()`。
- Produces: `useBackNavigation(): () => void` —— 返回一个 `goBack` 函数。决策：`window.navigation` 存在时 `canGoBack ? router.back() : router.push("/")`；否则落地页（首次挂载捕获的 pathname）或未捕获时 `router.push("/")`，其余 `router.back()`。

- [ ] **Step 1: 写失败测试 — use-back-navigation.test.ts**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

// 读写 window.navigation 的精确类型（不污染全局 lib 类型）
type NavWindow = { navigation?: { canGoBack?: boolean } };

function setNavigation(value: { canGoBack: boolean } | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(window, "navigation");
    return;
  }
  (window as unknown as NavWindow).navigation = value;
}

async function loadHook() {
  // 每个用例需要全新模块（重置模块级 entryPath）
  const mod = await import("./use-back-navigation");
  return mod.useBackNavigation;
}

describe("useBackNavigation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPathname = "/";
    setNavigation(undefined);
  });

  afterEach(() => {
    setNavigation(undefined);
  });

  it("支持 Navigation API 且 canGoBack=true 时调用 router.back", async () => {
    setNavigation({ canGoBack: true });
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("支持 Navigation API 且 canGoBack=false 时兜底 push('/')", async () => {
    setNavigation({ canGoBack: false });
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且停留在落地页时兜底 push('/')", async () => {
    mockPathname = "/guestbook";
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且已离开落地页时调用 router.back", async () => {
    mockPathname = "/";
    const useBackNavigation = await loadHook();

    const { result, rerender } = renderHook(() => useBackNavigation());
    // 模拟站内软导航：落地页捕获为 "/"，现跳到 /guestbook
    mockPathname = "/guestbook";
    rerender();
    result.current();

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且导航后又回到落地页时兜底 push('/')", async () => {
    mockPathname = "/";
    const useBackNavigation = await loadHook();

    const { result, rerender } = renderHook(() => useBackNavigation());
    mockPathname = "/guestbook";
    rerender();
    mockPathname = "/"; // 退回落地页（地板）
    rerender();
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `pnpm --filter web test components/navbar/use-back-navigation.test.ts`
Expected: FAIL — `Cannot find module './use-back-navigation'`。

- [ ] **Step 3: 写实现 — use-back-navigation.ts**

```ts
"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const FALLBACK_PATH = "/";

// 模块级：跨软导航持久，硬刷新/直接落地时随模块重新初始化为 null。
// 记录「本次页面加载的落地页路径」，即返回的「地板」。
let entryPath: string | null = null;

/** 读取浏览器 Navigation API 的 canGoBack；不支持时返回 undefined。 */
function readCanGoBack(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const candidate = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
  if (candidate && typeof candidate.canGoBack === "boolean") return candidate.canGoBack;
  return undefined;
}

/**
 * 移动端返回按钮的导航决策：
 * 1. 浏览器支持 Navigation API → 用内核权威信号 canGoBack 决定真返回还是兜底。
 * 2. 否则启发式 → 停在落地页（或尚未捕获）兜底首页，已离开落地页则真返回。
 */
export function useBackNavigation(): () => void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (entryPath === null) entryPath = pathname;
  }, [pathname]);

  return useCallback(() => {
    const canGoBack = readCanGoBack();
    if (canGoBack !== undefined) {
      if (canGoBack) router.back();
      else router.push(FALLBACK_PATH);
      return;
    }

    if (entryPath === null || pathname === entryPath) {
      router.push(FALLBACK_PATH);
      return;
    }
    router.back();
  }, [router, pathname]);
}
```

- [ ] **Step 4: 跑测试，确认通过**

Run: `pnpm --filter web test components/navbar/use-back-navigation.test.ts`
Expected: PASS（5 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/navbar/use-back-navigation.ts \
        apps/web/components/navbar/use-back-navigation.test.ts
git commit -m "feat(navbar): 新增 useBackNavigation 分层返回决策 Hook"
```

---

### Task 3: NavbarMobileHeader 接入 goBack 与返回语义

**Files:**
- Modify: `apps/web/components/navbar/navbar-mobile-header.tsx`
- Test: `apps/web/components/navbar/navbar-mobile-header.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `useBackNavigation(): () => void`。
- Produces: 返回按钮 `aria-label="返回"`，点击触发 `goBack()`（不再直接 `router.push("/")`）。

- [ ] **Step 1: 改测试 — navbar-mobile-header.test.tsx 的 mock 与断言**

将文件顶部的 `mockPush` 声明与 `next/navigation` mock 替换为对 Hook 的 mock。即把：

```ts
const mockPush = vi.fn();
const mockToggleMenu = vi.fn();
```

改为：

```ts
const mockGoBack = vi.fn();
const mockToggleMenu = vi.fn();
```

并把：

```ts
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

替换为：

```ts
vi.mock("./use-back-navigation", () => ({
  useBackNavigation: () => mockGoBack,
}));
```

把 `beforeEach` 里的 `mockPush.mockReset();` 改为 `mockGoBack.mockReset();`。

- [ ] **Step 2: 改测试 — 全部「返回首页」标签改「返回」，并改点击断言**

将该文件中所有出现的 `"返回首页"`（共 4 处：`queryByLabelText("返回首页")` 1 处、`getByLabelText("返回首页")` 3 处）统一改为 `"返回"`。

把现有点击用例（`it("点击返回首页调用 router.push('/')", ...)` 整块）替换为：

```ts
  it("点击返回按钮调用 goBack", async () => {
    const user = userEvent.setup();
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="留言"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByLabelText("返回"));
    expect(mockGoBack).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 3: 跑测试，确认失败**

Run: `pnpm --filter web test components/navbar/navbar-mobile-header.test.tsx`
Expected: FAIL — 组件仍渲染 `aria-label="返回首页"` 且调用 `router.push`，新断言找不到「返回」按钮 / `mockGoBack` 未被调用。

- [ ] **Step 4: 改实现 — navbar-mobile-header.tsx**

替换导入：把

```ts
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
```

改为

```ts
import { SvgIcon } from "@repo/icons";
```

并在 `NavbarLogo` 那行之后新增一行导入：

```ts
import { useBackNavigation } from "./use-back-navigation";
```

在组件体内，把：

```ts
  const router = useRouter();

  if (mobileVariant === "home") {
```

改为：

```ts
  const goBack = useBackNavigation();

  if (mobileVariant === "home") {
```

把返回按钮那段：

```ts
      <Button
        type="button"
        variant="ghost"
        aria-label="返回首页"
        onPress={() => router.push("/")}
        className="flex h-8 w-8 items-center justify-center rounded-full p-0 text-foreground transition-colors hover:bg-foreground/5"
      >
```

改为：

```ts
      <Button
        type="button"
        variant="ghost"
        aria-label="返回"
        onPress={goBack}
        className="flex h-8 w-8 items-center justify-center rounded-full p-0 text-foreground transition-colors hover:bg-foreground/5"
      >
```

- [ ] **Step 5: 跑测试，确认通过**

Run: `pnpm --filter web test components/navbar/navbar-mobile-header.test.tsx`
Expected: PASS。

- [ ] **Step 6: 跑整组 navbar 测试 + 类型检查回归**

Run: `pnpm --filter web test components/navbar`
Expected: PASS（含 site-navbar、route-config、context、header 等）。

Run: `pnpm --filter web check-types`
Expected: 无类型错误（验证 `window.navigation` 访问与移除的 `useRouter` 导入）。

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/navbar/navbar-mobile-header.tsx \
        apps/web/components/navbar/navbar-mobile-header.test.tsx
git commit -m "feat(navbar): 移动端返回按钮改用 goBack 回到上一页"
```

---

## Self-Review

**Spec coverage：**
- 兜底统一 `/` → `useBackNavigation` 中 `FALLBACK_PATH = "/"`（Task 2）。✓
- Navigation API 优先 + A+ 回退 → Task 2 `readCanGoBack` + 落地页比对，测试覆盖 5 条路径。✓
- 碎语统一返回按钮 + 标题「碎语」→ Task 1。✓
- `NavbarMobileHeader` 接 `goBack`、`aria-label` 改「返回」→ Task 3。✓
- 配套测试三处（hook 新增、header 更新、route-config/context 更新）→ Task 1–3。✓

**Placeholder 扫描：** 无 TBD/TODO，所有步骤含完整代码与精确命令。✓

**Type 一致性：** `useBackNavigation(): () => void` 在 Task 2 定义、Task 3 消费（`const goBack = useBackNavigation()`，`onPress={goBack}`）一致；`matchNavbarRoute` 返回结构跨 Task 1 实现与测试一致。✓

**简化说明：** spec 中 A+ 的「`hasNavigatedInApp` 布尔 + `entryPath`」两信号，在实现中等价收敛为单一 `entryPath` 比对（停在/回到落地页即地板 → 兜底；否则真返回），行为与残留边界完全一致，代码更简且更易测。
