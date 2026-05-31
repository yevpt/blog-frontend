# Homepage Redesign with Untitled UI React

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `packages/ui` 里的自定义组件替换为 Untitled UI React 官方组件，并修复首页 7 个已知 Bug，使首页完全基于 Untitled UI 设计系统呈现。

**Architecture:** Untitled UI React 是开源 copy-paste 组件库（Tailwind CSS v4 + React Aria + Embla Carousel），CLI 可将组件代码直接输出到 `packages/ui/src/`。项目已满足 React 19 + Tailwind v4 前提条件，只需新增 `react-aria-components`、`@untitledui/icons`、`embla-carousel-react` 等依赖，并将 Untitled UI 设计 token 合并进共享 CSS。

**Tech Stack:** React 19, Next.js App Router, TypeScript, Tailwind CSS v4, React Aria v1.16, Embla Carousel, pnpm workspaces monorepo

---

## 预备知识

### Untitled UI CLI 用法
```bash
# 在 packages/ui 目录内运行，输出到 src/
cd packages/ui
npx untitledui@latest add <component> --path src --yes
```

组件名清单（本计划涉及的）：
| 网站名称 | CLI 名称 | 依赖 |
|---------|---------|-----|
| Tabs | `tabs` | react-aria-components |
| Buttons | `button` | react-aria-components |
| Inputs | `input` | react-aria-components |
| Badges | `badges` | — |
| Carousels | `carousel-base` | embla-carousel-react |

### 组件 API 关键差异（旧 → 新）

**Button:**
- `variant="default"` → `color="primary"`
- `variant="outline"` → `color="secondary"`
- `variant="ghost"` → `color="tertiary"`
- `disabled` → `isDisabled`
- `size="default"` → `size="md"`

**Tabs:**
- 由 `<Tabs>` + `<Tabs.List>` + `<Tabs.Item>` + `<Tabs.Panel>` 组成
- `selectedKey` / `onSelectionChange` 控制选中项
- 变体名：`button-brand-horizontal`（这就是用户要求的"Button brand horizontal"风格）

**Input:**
- `label`, `hint`, `isInvalid`, `icon` props
- 搜索框用 `icon` prop 传入搜索图标（自动左侧定位）

### 暗色模式适配
- 当前项目：`documentElement.classList.add("dark")`
- Untitled UI：`.dark-mode` class  
- **修复**：在 `applyTheme` 函数中同时操作两个 class，并在 CSS 中添加双 variant

---

## 文件结构总览

| 操作 | 文件 |
|------|------|
| Modify | `packages/ui/package.json` |
| Create | `packages/ui/src/utils/cx.ts` |
| Modify | `packages/styles/src/base.css` |
| Modify | `apps/web/app/providers/theme-provider.tsx` |
| Create | `packages/ui/src/tabs.tsx` (via CLI) |
| Replace | `packages/ui/src/button.tsx` (via CLI) |
| Create | `packages/ui/src/input.tsx` (via CLI) |
| Replace | `packages/ui/src/badge.tsx` (via CLI) |
| Create | `packages/ui/src/carousel.tsx` (via CLI) |
| Modify | `packages/ui/src/index.ts` |
| Modify | `apps/web/app/providers/locale-provider.tsx` |
| Modify | `apps/web/components/navbar/site-navbar.tsx` |
| Modify | `apps/web/components/navbar/navbar-actions.tsx` |
| Modify | `apps/web/components/navbar/navbar-mobile-drawer.tsx` |
| Modify | `apps/web/components/articles/article-list-header.tsx` |
| Modify | `apps/web/components/sidebar/tags-cloud.tsx` |
| Modify | `apps/web/components/sidebar/recent-visitors.tsx` |
| Modify | `apps/web/components/featured/featured-carousel.tsx` |
| Modify | `apps/web/components/featured/featured-carousel-slide.tsx` |
| Modify | `apps/web/components/snippets/snippets-section.tsx` |
| Modify | `apps/web/app/page.tsx` |
| Modify (tests) | `apps/web/components/navbar/site-navbar.test.tsx` |
| Modify (tests) | `apps/web/app/providers/locale-provider.test.tsx` |
| Modify (tests) | `apps/web/components/articles/article-section.test.tsx` |

---

## Task 1: 安装 Untitled UI 依赖

**目标：** 在 `packages/ui` 安装所有 Untitled UI 运行时依赖。

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/ui add react-aria-components tailwindcss-react-aria-components tailwindcss-animate @untitledui/icons embla-carousel-react
```

- [ ] **Step 2: 确认 package.json dependencies 已更新**

```bash
cat packages/ui/package.json | grep -A 20 '"dependencies"'
```

Expected: 能看到以上 5 个包及版本号。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): 安装 Untitled UI React 运行时依赖"
```

---

## Task 2: 创建 packages/ui/src/utils/cx.ts

**目标：** Untitled UI 使用扩展版 tailwind-merge 处理其自定义字体大小 class（`text-display-*`）。

**Files:**
- Create: `packages/ui/src/utils/cx.ts`

- [ ] **Step 1: 创建文件**

```ts
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-xs", "display-sm", "display-md", "display-lg", "display-xl", "display-2xl"],
    },
  },
});

/** Untitled UI 专用 class 合并函数，支持 text-display-* 自定义尺寸 */
export const cx = twMerge;

/**
 * 辅助函数：对 style 对象内的 class 排序（Tailwind IntelliSense 不直接支持对象内排序）
 */
export function sortCx<
  T extends Record<string, string | number | Record<string, string | number | Record<string, string | number>>>,
>(classes: T): T {
  return classes;
}
```

- [ ] **Step 2: 验证 TypeScript 无错误**

```bash
pnpm --filter @repo/ui exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/utils/cx.ts
git commit -m "chore(ui): 新增 Untitled UI 专用 cx 工具函数"
```

---

## Task 3: 更新共享 CSS — 添加 Untitled UI 设计 token 和插件

**背景：** Untitled UI 需要：
1. `tailwindcss-animate` 插件
2. `tailwindcss-react-aria-components` 插件
3. `@custom-variant dark` 同时支持 `.dark` 和 `.dark-mode`（双 class 适配）
4. Untitled UI 的完整设计 token（颜色、字体、阴影等）

**Files:**
- Modify: `packages/styles/src/base.css`

- [ ] **Step 1: 获取 Untitled UI 完整 theme.css 内容**

访问 https://www.untitledui.com/react/docs/installation 页面的 Step 2，完整复制 `theme.css` 内容（约 300 行 CSS 变量）。这些内容定义了 Untitled UI 的所有设计 token（颜色、字体、间距、阴影等）。

> **注意**：如果在其他 AI 工具中执行，可以运行：
> ```bash
> npx untitledui@latest add --type foundations --path packages/styles/src --yes
> ```
> CLI 会自动输出 theme.css，但需要确认输出位置正确。

- [ ] **Step 2: 在 `packages/styles/src/base.css` 文件末尾添加以下内容**

在现有内容（`@import "tailwindcss"` 及现有 `@theme` 块）**之后**追加：

```css
/* ========== Untitled UI 插件 ========== */
@plugin "tailwindcss-animate";
@plugin "tailwindcss-react-aria-components";

/* 双 dark-mode variant：支持本项目的 .dark 和 Untitled UI 的 .dark-mode */
@custom-variant dark (&:where(.dark, .dark *, .dark-mode, .dark-mode *));

/* label / focus-input-within 辅助 variant（Untitled UI Input 组件依赖） */
@custom-variant label (& [data-label]);
@custom-variant focus-input-within (&:has(input:focus));

/* scrollbar-hide 工具类 */
@utility scrollbar-hide {
  &::-webkit-scrollbar {
    display: none;
    -webkit-appearance: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* ========== Untitled UI 设计 Token ========== */
/* 将从 https://www.untitledui.com/react/docs/installation 复制的 @theme { ... } 块粘贴在此处 */
/* 包含：字体、颜色（brand/neutral/utility）、radius、shadow、animation 等 */
/* 以下为 Untitled UI 默认品牌色（紫色系），可替换为项目实际品牌色 */
@theme {
  --color-brand-50: rgb(249 245 255);
  --color-brand-100: rgb(244 235 255);
  --color-brand-200: rgb(233 215 254);
  --color-brand-300: rgb(214 187 251);
  --color-brand-400: rgb(182 146 246);
  --color-brand-500: rgb(158 119 237);
  --color-brand-600: rgb(127 86 217);
  --color-brand-700: rgb(105 65 198);
  --color-brand-800: rgb(83 56 158);
  --color-brand-900: rgb(66 48 125);
  --color-brand-950: rgb(44 28 95);

  /* 语义颜色 token（Untitled UI 组件依赖这些变量） */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-tertiary: var(--color-neutral-600);
  --color-text-quaternary: var(--color-neutral-500);
  --color-text-placeholder: var(--color-neutral-500);
  --color-text-brand-primary: var(--color-brand-900);
  --color-text-brand-secondary: var(--color-brand-700);
  --color-text-brand-tertiary: var(--color-brand-600);
  --color-text-primary_on-brand: var(--color-white);
  --color-text-white: var(--color-white);
  --color-text-error-primary: var(--color-red-600);

  --color-bg-primary: var(--color-white);
  --color-bg-secondary: var(--color-neutral-50);
  --color-bg-tertiary: var(--color-neutral-100);
  --color-bg-quaternary: var(--color-neutral-200);
  --color-bg-brand-solid: var(--color-brand-600);
  --color-bg-brand-solid_hover: var(--color-brand-700);
  --color-bg-brand-primary: var(--color-brand-50);
  --color-bg-brand-secondary: var(--color-brand-100);
  --color-bg-secondary_hover: var(--color-neutral-100);
  --color-bg-primary_hover: var(--color-neutral-50);
  --color-bg-active: var(--color-neutral-50);
  --color-bg-error-primary: var(--color-red-50);
  --color-bg-error-secondary: var(--color-red-100);
  --color-bg-error-solid: var(--color-red-600);
  --color-bg-success-primary: var(--color-green-50);
  --color-bg-success-solid: var(--color-green-600);
  --color-bg-overlay: var(--color-neutral-950);
  --color-bg-primary-solid: var(--color-neutral-950);

  --color-fg-primary: var(--color-neutral-900);
  --color-fg-secondary: var(--color-neutral-700);
  --color-fg-tertiary: var(--color-neutral-600);
  --color-fg-quaternary: var(--color-neutral-400);
  --color-fg-brand-primary: var(--color-brand-600);
  --color-fg-brand-secondary: var(--color-brand-500);
  --color-fg-white: var(--color-white);
  --color-fg-error-primary: var(--color-red-600);
  --color-fg-error-secondary: var(--color-red-500);
  --color-fg-success-primary: var(--color-green-600);
  --color-fg-warning-primary: var(--color-yellow-600);
  --color-fg-secondary_hover: var(--color-neutral-800);
  --color-fg-tertiary_hover: var(--color-neutral-700);
  --color-fg-quaternary_hover: var(--color-neutral-500);
  --color-fg-brand-secondary_hover: var(--color-brand-600);

  --color-border-primary: var(--color-neutral-300);
  --color-border-secondary: var(--color-neutral-200);
  --color-border-tertiary: var(--color-neutral-100);
  --color-border-brand: var(--color-brand-500);
  --color-border-brand_alt: var(--color-brand-600);
  --color-border-error: var(--color-red-500);

  --color-focus-ring: var(--color-brand-500);
  --color-focus-ring-error: var(--color-red-500);

  /* Radius */
  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-xs: 0px 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1);
  --shadow-md: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0px 12px 16px -4px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0px 20px 24px -4px rgba(0, 0, 0, 0.08), 0px 8px 8px -4px rgba(0, 0, 0, 0.03), 0px 3px 3px -1.5px rgba(0, 0, 0, 0.04);

  /* Font */
  --font-body: "Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --font-display: "Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif;

  /* Text sizes（Untitled UI 自定义） */
  --text-xs: calc(var(--spacing) * 3);
  --text-xs--line-height: calc(var(--spacing) * 4.5);
  --text-sm: calc(var(--spacing) * 3.5);
  --text-sm--line-height: calc(var(--spacing) * 5);
  --text-md: calc(var(--spacing) * 4);
  --text-md--line-height: calc(var(--spacing) * 6);
  --text-display-xs: calc(var(--spacing) * 6);
  --text-display-xs--line-height: calc(var(--spacing) * 8);
  --text-display-sm: calc(var(--spacing) * 7.5);
  --text-display-sm--line-height: calc(var(--spacing) * 9.5);
  --text-display-md: calc(var(--spacing) * 9);
  --text-display-md--line-height: calc(var(--spacing) * 11);
  --text-display-md--letter-spacing: -0.72px;
}

/* 暗色 token 覆盖（适配 Untitled UI dark-mode 变量） */
.dark-mode, .dark {
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-300);
  --color-text-tertiary: var(--color-neutral-400);
  --color-text-quaternary: var(--color-neutral-400);
  --color-text-placeholder: var(--color-neutral-500);
  --color-text-brand-secondary: var(--color-neutral-300);

  --color-bg-primary: var(--color-neutral-950);
  --color-bg-secondary: var(--color-neutral-900);
  --color-bg-tertiary: var(--color-neutral-800);
  --color-bg-quaternary: var(--color-neutral-700);
  --color-bg-brand-solid: var(--color-brand-600);
  --color-bg-secondary_hover: var(--color-neutral-800);
  --color-bg-primary_hover: var(--color-neutral-900);
  --color-bg-active: var(--color-neutral-800);

  --color-fg-primary: var(--color-white);
  --color-fg-secondary: var(--color-neutral-300);
  --color-fg-tertiary: var(--color-neutral-400);
  --color-fg-quaternary: var(--color-neutral-600);

  --color-border-primary: var(--color-neutral-700);
  --color-border-secondary: var(--color-neutral-800);
  --color-border-tertiary: var(--color-neutral-800);
}
```

> **完整 token 说明**：上方仅包含首页组件（Tabs、Button、Input、Badge）所需的核心 token。如遇渲染异常，访问 https://www.untitledui.com/react/docs/installation 的 Step 2 获取完整 700+ 行 theme.css 并追加。

- [ ] **Step 3: 验证 Next.js 可正常启动（无 CSS 编译错误）**

```bash
pnpm --filter @repo/web build 2>&1 | grep -E "error|Error|warn" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add packages/styles/src/base.css
git commit -m "feat(styles): 集成 Untitled UI 设计 token 和插件配置"
```

---

## Task 4: 适配 ThemeProvider — 同时操作 .dark 和 .dark-mode

**背景：** 项目当前 ThemeProvider 只切换 `.dark` class，但 Untitled UI 组件的暗色样式监听 `.dark-mode`。需同时维护两个 class。

**Files:**
- Modify: `apps/web/app/providers/theme-provider.tsx`

- [ ] **Step 1: 修改 `applyTheme` 函数**

找到（第 28-36 行）：

```ts
/** 将 resolved theme 应用到 documentElement（添加/移除 dark class） */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
```

替换为：

```ts
/** 将 resolved theme 应用到 documentElement（同时维护 .dark 和 .dark-mode 两个 class） */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark", "dark-mode");
  } else {
    document.documentElement.classList.remove("dark", "dark-mode");
  }
}
```

- [ ] **Step 2: 同步更新 layout.tsx 中的 FOUC 防闪烁脚本**

在 `apps/web/app/layout.tsx` 找到内联脚本：

```ts
`(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`,
```

替换为（同时添加 dark-mode）：

```ts
`(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark','dark-mode')}})()`,
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/providers/theme-provider.tsx apps/web/app/layout.tsx
git commit -m "fix(web): ThemeProvider 同时维护 .dark 和 .dark-mode，兼容 Untitled UI 暗色主题"
```

---

## Task 5: 通过 CLI 安装 Button 组件（替换现有）

**背景：** 用 Untitled UI 官方 Button 替换现有 CVA 实现。CLI 在 `packages/ui/src/` 输出 `button.tsx`（及可能的子文件）。

**Files:**
- Replace: `packages/ui/src/button.tsx` (CLI generated)

- [ ] **Step 1: 运行 CLI**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/packages/ui
npx untitledui@latest add button --path src --yes
```

CLI 会在 `packages/ui/src/` 生成 Button 组件文件，并可能更新 `package.json`。

- [ ] **Step 2: 查看生成的文件**

```bash
ls packages/ui/src/
cat packages/ui/src/button.tsx | head -50
```

确认 `button.tsx` 已生成。

- [ ] **Step 3: 如果 CLI 生成了额外的子目录（如 src/components/），将文件移至 src/ 根目录**

```bash
# 如果 CLI 生成在 src/components/ 子目录：
mv packages/ui/src/components/button.tsx packages/ui/src/button.tsx
# 并更新文件内的相对 import 路径（如 ./utils/cx → ../utils/cx 等）
```

- [ ] **Step 4: 更新 Button 文件中的 @untitledui/icons import（若有）**

Untitled UI Button 可能使用 `@untitledui/icons` 中的图标（如 Spinner）。由于已安装该包，无需修改。确认 import 行可正常解析：

```bash
pnpm --filter @repo/ui exec tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): 用 Untitled UI 官方 Button 组件替换自定义实现"
```

---

## Task 6: 通过 CLI 安装 Tabs 组件

**Files:**
- Create: `packages/ui/src/tabs.tsx` (CLI generated)

- [ ] **Step 1: 运行 CLI**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/packages/ui
npx untitledui@latest add tabs --path src --yes
```

- [ ] **Step 2: 查看生成文件并确认 Tabs 的 API**

```bash
cat packages/ui/src/tabs.tsx | grep "export"
```

Expected: 能看到 `export { Tabs }` 或类似导出。Tabs 组件的使用方式：

```tsx
// 变体：Button brand horizontal（对应文章分类 Tab 的设计要求）
<Tabs defaultSelectedKey="全部">
  <Tabs.List variant="button-brand-horizontal">
    <Tabs.Item key="全部">全部</Tabs.Item>
    <Tabs.Item key="编程">编程</Tabs.Item>
  </Tabs.List>
  <Tabs.Panel key="全部">{/* content */}</Tabs.Panel>
</Tabs>
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/tabs.tsx
git commit -m "feat(ui): 新增 Untitled UI Tabs 组件"
```

---

## Task 7: 通过 CLI 安装 Input 组件

**Files:**
- Create: `packages/ui/src/input.tsx` (CLI generated)

- [ ] **Step 1: 运行 CLI**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/packages/ui
npx untitledui@latest add input --path src --yes
```

- [ ] **Step 2: 查看 Input API**

```bash
grep "interface\|type.*Props\|export" packages/ui/src/input.tsx | head -20
```

Expected: Input 组件 props 包含 `label`, `hint`, `isInvalid`, `icon`, `placeholder`, `value`, `onChange`, `size`。

搜索框用法示例：
```tsx
import { SearchLg } from "@untitledui/icons";
// 或用 @repo/icons 的 SvgIcon

<Input
  label=""        // 搜索框不需要 label
  placeholder={t("article.searchPlaceholder")}
  icon={SearchLg}  // 左侧搜索图标
  value={localQuery}
  onChange={(value) => setLocalQuery(value)}
  size="sm"
/>
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/input.tsx
git commit -m "feat(ui): 新增 Untitled UI Input 组件"
```

---

## Task 8: 通过 CLI 安装 Badge 组件

**Files:**
- Replace: `packages/ui/src/badge.tsx` (CLI generated)

- [ ] **Step 1: 运行 CLI**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/packages/ui
npx untitledui@latest add badges --path src --yes
```

- [ ] **Step 2: 查看生成文件，了解 Badge API**

```bash
grep "interface\|export\|color\|size" packages/ui/src/badge.tsx | head -20
```

Expected: Badge props 包含 `color` (brand/gray/error/success/warning), `size` (sm/md/lg), `dot` (boolean)。

标签云用法示例：
```tsx
<Badge color="brand" size="sm">TypeScript</Badge>
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/badge.tsx
git commit -m "feat(ui): 用 Untitled UI Badge 替换自定义实现"
```

---

## Task 9: 通过 CLI 安装 Carousel 组件

**背景：** Untitled UI Carousel 基于 Embla Carousel，替换现有自定义轮播实现。

**Files:**
- Create: `packages/ui/src/carousel.tsx` (CLI generated)

- [ ] **Step 1: 运行 CLI**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend/packages/ui
npx untitledui@latest add carousel-base --path src --yes
```

- [ ] **Step 2: 查看 Carousel API**

```bash
grep "interface\|export\|Props" packages/ui/src/carousel.tsx | head -20
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/carousel.tsx
git commit -m "feat(ui): 新增 Untitled UI Carousel 组件（基于 Embla）"
```

---

## Task 10: 更新 packages/ui/src/index.ts 导出

**Files:**
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: 读取当前 index.ts**

```bash
cat packages/ui/src/index.ts
```

- [ ] **Step 2: 添加新组件的导出**

将以下行加入 `index.ts`（在已有 export 之后）：

```ts
export { Tabs } from "./tabs";
export type { ButtonProps } from "./button";  // 根据 CLI 生成的实际导出名调整
export { Input } from "./input";
export { Badge } from "./badge";
export { Carousel } from "./carousel";  // 根据实际生成的导出名调整
export { cx, sortCx } from "./utils/cx";
```

> **注意**：以上名称需根据 CLI 实际生成的 `export` 声明调整。

- [ ] **Step 3: 验证类型检查通过**

```bash
pnpm --filter @repo/ui exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/index.ts
git commit -m "feat(ui): 更新 @repo/ui 导出，包含所有 Untitled UI 组件"
```

---

## Task 11: 修复国际化 — LocaleProvider 同步加载 zh.json

**背景：** `LocaleProvider` 初始 `messages=null`，`t(key)` 在异步 JSON 加载完成前返回 key 名（显示 "article.searchPlaceholder"、"sidebar.joinQQ" 等）。

**Files:**
- Modify: `apps/web/app/providers/locale-provider.tsx`
- Modify: `apps/web/app/providers/locale-provider.test.tsx`

- [ ] **Step 1: 修改 locale-provider.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import zhMessages from "../../messages/zh.json";
import {
  LocaleContext,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "@repo/hooks/locale";

type Messages = Record<string, unknown>;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("locale");
  if (stored === "zh" || stored === "en") return stored;
  return "zh";
}

async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") {
    const mod = await import("../../messages/en.json");
    return mod.default as Messages;
  }
  const mod = await import("../../messages/zh.json");
  return mod.default as Messages;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // zh.json 静态导入作为初始值，zh 用户首屏无闪烁
  const [messages, setMessages] = useState<Messages>(() => {
    const initialLocale = getInitialLocale();
    return initialLocale === "zh" ? (zhMessages as Messages) : {};
  });

  useEffect(() => {
    let cancelled = false;
    loadMessages(locale).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("locale", newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      return getNestedValue(messages, key) ?? key;
    },
    [messages],
  );

  const value: LocaleContextValue = { locale, setLocale, t };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
```

- [ ] **Step 2: 更新 locale-provider.test.tsx**

找到测试（约第 156-167 行）：

```tsx
it("messages 未加载完成时 t() 降级返回 key 本身", () => {
  render(<LocaleProvider><LocaleDisplay /></LocaleProvider>);
  expect(screen.getByTestId("nav-home").textContent).toBe("nav.home");
});
```

替换为：

```tsx
it("默认 zh locale 时，t() 同步返回中文值（无需等待异步加载）", () => {
  render(<LocaleProvider><LocaleDisplay /></LocaleProvider>);
  expect(screen.getByTestId("nav-home").textContent).toBe("首页");
});
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/providers/locale-provider.test.tsx
```

Expected: 所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/providers/locale-provider.tsx apps/web/app/providers/locale-provider.test.tsx
git commit -m "fix(web): LocaleProvider 静态导入 zh.json，修复首屏国际化 key 显示问题"
```

---

## Task 12: 修复 SiteNavbar — 移除 mounted 动画依赖

**背景：** `mounted` 初始为 `false` 使 navbar `-translate-y-full opacity-0`，若 hydration 出错则永久不可见。

**Files:**
- Modify: `apps/web/components/navbar/site-navbar.tsx`
- Modify: `apps/web/components/navbar/site-navbar.test.tsx`

- [ ] **Step 1: 修改 site-navbar.tsx**

将文件完整内容替换为：

```tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileDrawer } from "./navbar-mobile-drawer";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-[padding,background-color,backdrop-filter,border-color] duration-300 ease-out",
        scrolled ? "py-2 backdrop-blur-md bg-background/80 border-b border-border" : "py-4",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <NavbarLogo />
          <NavbarLinks />
          <div className="flex items-center gap-1">
            <NavbarActions />
            <NavbarMobileDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 在 site-navbar.test.tsx 内 describe 块中添加可见性测试**

在第一个 `it` 之后插入：

```tsx
  it("初始渲染时 header 无 -translate-y-full 和 opacity-0（始终可见）", () => {
    render(<SiteNavbar />);
    const header = document.querySelector("header");
    expect(header?.className).not.toContain("-translate-y-full");
    expect(header?.className).not.toContain("opacity-0");
  });
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/navbar/site-navbar.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/navbar/site-navbar.tsx apps/web/components/navbar/site-navbar.test.tsx
git commit -m "fix(web): 移除 SiteNavbar mounted 动画，导航栏始终可见"
```

---

## Task 13: 更新 ArticleListHeader — 使用 Untitled UI Tabs + Input

**背景：** 将分类 Tab 改为 Untitled UI Tabs（"button-brand-horizontal" 变体），搜索框改为 Untitled UI Input（左侧自动显示搜索图标）。

**Files:**
- Modify: `apps/web/components/articles/article-list-header.tsx`
- Modify: `apps/web/components/articles/article-section.test.tsx`

- [ ] **Step 1: 先阅读 CLI 生成的 Tabs 和 Input 组件的实际 API**

```bash
# 查看 Tabs 的 Props interface
grep -A 20 "interface\|type.*Props" packages/ui/src/tabs.tsx | head -40

# 查看 Input 的 Props interface
grep -A 20 "interface\|type.*Props" packages/ui/src/input.tsx | head -40
```

根据实际 API，修改 `article-list-header.tsx`：

- [ ] **Step 2: 修改 article-list-header.tsx**

```tsx
"use client";

import { useCallback } from "react";
import { Tabs, Input } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useLocale } from "@repo/hooks";

interface ArticleListHeaderProps {
  categories: string[];
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ArticleListHeader({
  categories,
  currentCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();

  // Input onChange 接收字符串值（Untitled UI Input 的 onChange 直接返回 string）
  // 防抖逻辑移至 useEffect（若 Untitled UI Input 不内置防抖，需在此处添加）
  const handleSearchChange = useCallback(
    (value: string) => {
      onSearchChange(value);
    },
    [onSearchChange],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 分类 Tabs：Button brand horizontal 变体 */}
      <Tabs
        selectedKey={currentCategory}
        onSelectionChange={(key) => onCategoryChange(String(key))}
      >
        <Tabs.List variant="button-brand-horizontal" size="sm">
          {categories.map((category) => (
            <Tabs.Item key={category}>{category}</Tabs.Item>
          ))}
        </Tabs.List>
      </Tabs>

      {/* 搜索框：Untitled UI Input，左侧 icon 自动定位 */}
      <Input
        label=""
        placeholder={t("article.searchPlaceholder")}
        icon={() => <SvgIcon name="search" size={16} />}
        value={searchQuery}
        onChange={handleSearchChange}
        size="sm"
        className="w-48 focus:w-64 transition-all duration-300"
      />
    </div>
  );
}
```

> **注意**：Untitled UI Tabs 的实际 prop 名（`variant`、`size` 等）以 CLI 生成的代码为准。如果 API 不同（如 `<Tabs.List className="...">`），根据生成代码调整。
>
> 防抖：如果 Untitled UI Input 没有内置防抖，需在 `ArticleSection` 或此组件内用 `useEffect` 加 300ms debounce（参考原有实现）。

- [ ] **Step 3: 更新 article-section.test.tsx 的 @repo/ui mock**

在现有 mock 中添加 `Tabs` 和 `Input`（在 `vi.mock("@repo/ui", ...)` 内）：

```tsx
vi.mock("@repo/ui", () => ({
  Pagination: /* ... 保持原有 ... */,
  Tabs: Object.assign(
    ({ children, selectedKey, onSelectionChange }: {
      children: React.ReactNode;
      selectedKey?: string;
      onSelectionChange?: (key: string) => void;
    }) => <div data-selected={selectedKey} onClick={() => onSelectionChange?.("")}>{children}</div>,
    {
      List: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
      Item: ({ children, key: _key }: { children: React.ReactNode; key?: string }) => (
        <button role="tab">{children}</button>
      ),
      Panel: ({ children }: { children: React.ReactNode }) => <div role="tabpanel">{children}</div>,
    }
  ),
  Input: ({ placeholder, value, onChange }: {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    icon?: unknown;
    size?: string;
    className?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
```

> **重要**：如果 Tabs.Item 的 key prop 机制不同（如使用 `id` 而非 `key`），根据实际 CLI 生成代码调整 mock。

- [ ] **Step 4: 运行测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/articles/article-section.test.tsx
```

Expected: 所有测试 PASS（`getByPlaceholderText("搜索文章...")` 仍有效）。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/articles/article-list-header.tsx apps/web/components/articles/article-section.test.tsx
git commit -m "feat(web): ArticleListHeader 使用 Untitled UI Tabs (button-brand-horizontal) + Input"
```

---

## Task 14: 更新 TagsCloud — 使用 Untitled UI Badge

**Files:**
- Modify: `apps/web/components/sidebar/tags-cloud.tsx`

- [ ] **Step 1: 修改 tags-cloud.tsx**

将标签按钮改为 Untitled UI Badge（根据 CLI 生成的实际 Badge API 调整）：

```tsx
"use client";

import { useLocale } from "@repo/hooks";
import { Badge } from "@repo/ui";
import type { Tag } from "../../app/_mock/types";

interface TagsCloudProps {
  tags: Tag[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-xl border border-border/50 p-4 mt-4">
      <h3 className="text-sm font-semibold mb-3">{t("sidebar.tags")}</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag.id} className="cursor-pointer">
            <Badge color="brand" size="sm">
              {tag.name}
              <span className="ml-1 opacity-70">{tag.count}</span>
            </Badge>
          </button>
        ))}
      </div>
    </section>
  );
}
```

> **注意**：Untitled UI Badge 的 `color` 值（brand/gray/etc.）和 `size` 值（sm/md/lg）以 CLI 生成代码为准。如果 Badge 不接受 children（某些实现用 `label` prop），改为 `<Badge color="brand" size="sm" label={tag.name} />`。

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/sidebar/tags-cloud.tsx
git commit -m "feat(web): TagsCloud 使用 Untitled UI Badge 组件"
```

---

## Task 15: 更新 navbar-actions 和 navbar-mobile-drawer — 使用新 Button API

**背景：** 将旧 `variant` prop 改为 Untitled UI Button 的 `color` prop。

**Files:**
- Modify: `apps/web/components/navbar/navbar-actions.tsx`
- Modify: `apps/web/components/navbar/navbar-mobile-drawer.tsx`

- [ ] **Step 1: 更新 navbar-actions.tsx**

```tsx
"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";

type ThemeMode = "system" | "light" | "dark";

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_ICONS: Record<ThemeMode, "monitor" | "sun" | "moon"> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

export function NavbarActions() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      {/* 主题切换按钮 */}
      <Button
        color="tertiary"
        size="sm"
        onClick={() => setTheme(THEME_CYCLE[theme])}
        aria-label={`当前主题：${theme}，点击切换`}
        iconLeading={<SvgIcon name={THEME_ICONS[theme]} size={20} data-icon />}
      />

      {/* 登录/注册按钮（md+ 显示） */}
      <div className="hidden md:flex items-center gap-2">
        <Button color="secondary" size="sm">
          {t("auth.login")}
        </Button>
        <Button color="primary" size="sm">
          {t("auth.register")}
        </Button>
      </div>
    </div>
  );
}
```

> **注意**：Untitled UI Button 的图标按钮通过 `iconLeading` prop 传入，需要传 JSX 元素（不是组件函数），并加 `data-icon` 属性。如果 CLI 生成的 Button 不支持此方式，参考生成的代码说明。

- [ ] **Step 2: 更新 navbar-mobile-drawer.tsx**

将所有 `variant="ghost"` → `color="tertiary"`，`variant="outline"` → `color="secondary"`，`variant="default"` → `color="primary"`：

```bash
# 快速检查需要替换的行
grep -n "variant=" apps/web/components/navbar/navbar-mobile-drawer.tsx
```

手动替换相应行。

- [ ] **Step 3: 更新 recent-visitors.tsx**

```bash
grep -n "variant=" apps/web/components/sidebar/recent-visitors.tsx
```

将 `variant="outline"` → `color="secondary"`, `variant="ghost"` → `color="tertiary"`, `size="sm"` 保持不变。

- [ ] **Step 4: 更新 snippets-section.tsx**

```bash
grep -n "variant=" apps/web/components/snippets/snippets-section.tsx
```

同上替换。

- [ ] **Step 5: 运行 TypeScript 检查确认无错误**

```bash
pnpm --filter @repo/web exec tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/navbar/ apps/web/components/sidebar/recent-visitors.tsx apps/web/components/snippets/snippets-section.tsx
git commit -m "feat(web): 更新所有 Button 用法，适配 Untitled UI color prop"
```

---

## Task 16: 修复轮播图指示器点击 + 更新 FeaturedCarousel

**背景：** 不活跃幻灯片拦截指针事件导致指示器点击无效。先用快速 fix（pointer-events-none），可选地再用 Untitled UI Carousel 替换。

**Files:**
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`
- Optional: Modify `apps/web/components/featured/featured-carousel.tsx`

- [ ] **Step 1: 快速修复 featured-carousel-slide.tsx**

找到（第 14-17 行）：

```tsx
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
```

替换为：

```tsx
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
```

- [ ] **Step 2: （可选）用 Untitled UI Carousel 重写 FeaturedCarousel**

如果 Untitled UI Carousel 支持 fade 过渡和自定义 indicator，可以将 `featured-carousel.tsx` 和 `featured-carousel-slide.tsx` 重写为使用 `Carousel` 组件。查看 CLI 生成的 `packages/ui/src/carousel.tsx` API 后决定。

- [ ] **Step 3: 运行轮播测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/components/featured/featured-carousel.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/featured/featured-carousel-slide.tsx
git commit -m "fix(web): 不活跃幻灯片加 pointer-events-none，修复指示器点击穿透"
```

---

## Task 17: 碎语模块迁至右侧栏，改单列显示

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/snippets/snippets-section.tsx`

- [ ] **Step 1: 修改 snippets-section.tsx — 改单列 grid**

找到：

```tsx
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
```

替换为：

```tsx
      <div className="grid grid-cols-1 gap-4 mt-4">
```

- [ ] **Step 2: 修改 page.tsx — 将 SnippetsSection 迁至 aside**

```tsx
import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { articles } from "./_mock/articles";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FeaturedCarousel posts={featuredPosts} />
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="min-w-0">
          <ArticleSection articles={articles} />
        </div>
        {/* lg:top-20 对应 80px 固定导航栏高度 */}
        <aside className="lg:sticky lg:top-20">
          <RecentVisitors visitors={visitors} />
          <TagsCloud tags={tags} />
          <div className="mt-4">
            <SnippetsSection snippets={snippets} />
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 运行页面测试**

```bash
pnpm --filter @repo/web exec vitest run apps/web/app/page.test.tsx
pnpm --filter @repo/web exec vitest run apps/web/components/snippets/snippets-section.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/snippets/snippets-section.tsx
git commit -m "feat(web): 碎语模块迁至右侧栏，改单列显示"
```

---

## Task 18: 全量测试验证

- [ ] **Step 1: 运行全量测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm test
```

Expected: 所有包测试 PASS。若有失败，根据错误信息逐一修复（通常是 mock 不匹配新 API）。

- [ ] **Step 2: TypeScript 全量检查**

```bash
pnpm --filter @repo/web exec tsc --noEmit
pnpm --filter @repo/ui exec tsc --noEmit
```

- [ ] **Step 3: 启动开发服务器目视验证**

```bash
pnpm --filter @repo/web dev
```

在浏览器中验证：

| 检查项 | 预期结果 |
|--------|---------|
| 导航栏 | 立即可见，无闪烁，滚动后毛玻璃效果 |
| 主题切换 | 点击切换暗色，Untitled UI 组件跟随暗色 token |
| 文章分类 Tab | Untitled UI button-brand-horizontal 样式，活跃项品牌色 |
| 搜索框 | Untitled UI Input，左侧自动显示搜索图标 |
| 轮播图 | 点击底部水滴指示器可正常切换 |
| 国际化 | 所有文字正常（无 key 名如 "sidebar.joinQQ"） |
| 右侧栏 | 碎语在右侧，单列，最近来访和标签云在上方 |
| 所有按钮 | hover 时显示 cursor-pointer |

---

## 已知注意事项

### CLI 输出路径
如果 CLI 将组件输出到 `src/components/` 子目录而非 `src/` 根目录，需手动移动文件并更新内部 import 路径。

### Untitled UI Button 图标 API
Untitled UI Button 使用 `iconLeading` prop，接受 React 元素需加 `data-icon` 属性，或接受函数组件。实际 API 以 CLI 生成代码为准，适当调整 `NavbarActions` 中图标按钮的写法。

### Tabs API 变体名
"button-brand-horizontal" 是 Untitled UI 文档中的变体名称，CLI 生成的代码中可能用 `variant="button-brand-horizontal"` 或其他 prop 形式。以生成代码为准。

### 防抖逻辑
Untitled UI Input 的 `onChange` 直接返回 `string` 值（不是 `React.ChangeEvent`）。原有 300ms 防抖逻辑需在 `ArticleListHeader` 的 `useEffect` 中重新实现：

```tsx
useEffect(() => {
  const timer = setTimeout(() => onSearchChange(localQuery), 300);
  return () => clearTimeout(timer);
}, [localQuery, onSearchChange]);
```

### 暗色模式 token 完整性
Task 3 中的暗色 token 覆盖仅包含核心部分。若 Untitled UI 组件在暗色模式下显示异常，从 https://www.untitledui.com/react/docs/installation 获取完整暗色 token 并补充到 `base.css` 的 `.dark-mode, .dark { ... }` 块。

### components.json
Untitled UI CLI 可能在运行目录生成 `components.json` 配置文件。若在 `packages/ui` 目录运行，该文件会出现在 `packages/ui/components.json`，可以保留（记录了使用的组件版本）。
