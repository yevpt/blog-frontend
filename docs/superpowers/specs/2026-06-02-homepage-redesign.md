# 主页视觉改造实施方案

> **状态追踪说明**  
> 每完成一项任务，将对应的 `[ ]` 改为 `[x]`。  
> 每完成一个大任务组后，执行一次 `git commit`。  
> **额度检查点**：标有 💳 的任务完成后，检查剩余额度再决定是否继续。

---

## 背景与目标

将博客主页（`apps/web`）从当前中性 shadcn 风格升级为以下设计语言：
- **主题色**：靛紫 Violet-Indigo（浅色 `#7c3aed` / 深色 `#a78bfa`）
- **Navbar**：桌面悬浮胶囊，移动端全宽扁平 Header，透明→滚动后玻璃毛玻璃动效
- **精选轮播**：全屏 Hero，进度条指示器，拖拽切换，底部液态玻璃渐变
- **文章区**：下划线 Tabs、文章卡片大字体层级、3 行摘要
- **侧边栏**：JS scroll-sync sticky，访客带名字和状态，标签带数量
- **评论弹窗**：桌面居中 / 移动端全屏底部弹出
- **完整浅色 + 深色双模式**

参考 Mockup 文件（可在浏览器中查看完整效果）：  
`.superpowers/brainstorm/37929-1780395401/content/full-page-v7.html`

---

## 一、Design Tokens（最高优先）

**文件：`packages/styles/src/base.css`**

将现有 `@theme` 和 CSS 变量替换为以下内容（保持 Tailwind v4 `@theme` 格式）：

```css
@theme {
  /* Light mode */
  --color-background:        #f7f7f9;
  --color-foreground:        #18181b;
  --color-card:              #ffffff;
  --color-card-foreground:   #18181b;
  --color-primary:           #7c3aed;
  --color-primary-foreground:#ffffff;
  --color-secondary:         #f4f4f5;
  --color-secondary-foreground: #18181b;
  --color-muted:             #f4f4f5;
  --color-muted-foreground:  #71717a;
  --color-accent:            #7c3aed;
  --color-accent-foreground: #ffffff;
  --color-border:            rgba(0,0,0,0.07);
  --color-input:             rgba(0,0,0,0.07);
  --color-ring:              #7c3aed;
}

/* Dark mode overrides */
:root {
  @variant dark {
    --color-background:        #0c0c0f;
    --color-foreground:        #f4f4f5;
    --color-card:              #18181b;
    --color-card-foreground:   #f4f4f5;
    --color-primary:           #a78bfa;
    --color-primary-foreground:#0c0c0f;
    --color-secondary:         #27272a;
    --color-secondary-foreground: #f4f4f5;
    --color-muted:             #27272a;
    --color-muted-foreground:  #71717a;
    --color-accent:            #a78bfa;
    --color-accent-foreground: #0c0c0f;
    --color-border:            rgba(255,255,255,0.08);
    --color-input:             rgba(255,255,255,0.08);
    --color-ring:              #a78bfa;
    color-scheme: dark;
  }
}
```

在 `:root` 外补充全局工具变量（**不在 `@theme` 中，直接写 CSS 变量**）：

```css
:root {
  --fg2: #52525b;        /* 次要文字 light */
  --fg3: #a1a1aa;        /* 三级文字 light */
  --glass-bg:  rgba(255,255,255,0.75);
  --glass-bdr: rgba(255,255,255,0.9);
  --glass-mob: rgba(246,246,250,0.82);  /* 移动端 nav 玻璃色 */
  --glass-ring: rgba(0,0,0,0.08);
}
:root.dark {
  --fg2: #a1a1aa;
  --fg3: #71717a;
  --glass-bg:  rgba(12,12,15,0.75);
  --glass-bdr: rgba(255,255,255,0.09);
  --glass-mob: rgba(18,18,22,0.82);
  --glass-ring: rgba(255,255,255,0.04);
}
```

### 任务清单

- [x] 💳 更新 `packages/styles/src/base.css`：替换 `@theme` 块和 `:root dark` 块
- [x] 在 `base.css` 末尾追加 `--fg2 / --fg3 / --glass-*` 工具变量

---

## 二、Navbar 改造

### 涉及文件
- `apps/web/components/navbar/site-navbar.tsx`
- `apps/web/components/navbar/navbar-logo.tsx`
- `apps/web/components/navbar/navbar-links.tsx`
- `apps/web/components/navbar/navbar-actions.tsx`
- `apps/web/components/navbar/navbar-mobile-drawer.tsx` → **整体替换**为新移动端菜单

### 设计要点

#### 桌面端（≥ 681px）
- `#navbar`：`fixed top-0 w-full flex justify-center`，初始 `padding: 18px 24px`
- `.nav-capsule`：`max-w-[960px] w-full border-radius-full`
- **透明态**（未滚动）：`bg-transparent border-transparent`
- **滚动态**（`scrollY > 60`）：触发 `scrolled` class：
  ```
  background: var(--glass-bg)
  border-color: var(--glass-bdr)
  backdrop-filter: blur(24px) saturate(180%)
  box-shadow: 0 0 0 1px var(--glass-ring), 0 4px 32px rgba(0,0,0,.12)
  padding: 10px 24px
  ```
- Logo：`SvgIcon name="logo-frequencii-light/dark"` + "Yevpt's Blog" 文字（md+ 显示）
- 中央链接（`md+`）：文章 / 碎语 / 关于
- 右侧（`md+`）：主题图标（outline sun/moon）+ 登录按钮
- 主题图标：`SvgIcon name="sun"` 或 `SvgIcon name="moon"`（已有）

#### 移动端（≤ 680px）
- 无 padding，`#navbar` 本身承载玻璃背景
- **在 hero 顶部**：`background: transparent`
- **滚动后或菜单打开**：`background: var(--glass-mob)` + blur
- 右侧只显示汉堡按钮（三条线 → X 动画）
- **菜单**：放在 `<nav>` 内部（不是 sibling），用 `grid-template-rows: 0fr → 1fr` 展开

#### 移动端菜单内容
```
碎语 ›
留言 ›
友邻 ›
圈子 ›
────────────
[🌙 深色模式 toggle]  [登录]
```

#### 颜色规则（over hero）
- Logo、nav text、汉堡按钮：`rgba(255,255,255, 0.85)`
- 进入玻璃态后：`text-foreground` / `text-muted-foreground`

### site-navbar.tsx 关键实现

```tsx
"use client";
import { useState, useEffect } from "react";
import { cn } from "@repo/ui";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const isGlass = scrolled || menuOpen;

  return (
    <nav
      id="navbar"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center",
        "max-md:pointer-events-auto pointer-events-none",
        "transition-[padding] duration-300 ease-out",
        scrolled ? "py-[10px] px-5" : "py-[18px] px-6",
        // Mobile: no padding
        "max-md:p-0",
        // Mobile glass
        "max-md:transition-[background,backdrop-filter]",
        isGlass ? "max-md:[background:var(--glass-mob)] max-md:backdrop-blur-[20px]" : "max-md:bg-transparent",
      )}
    >
      {/* nav-capsule ... */}
    </nav>
  );
}
```

### 任务清单

- [x] 💳 `site-navbar.tsx`：实现 scroll+glass 逻辑，移动端透明/玻璃切换
- [x] `navbar-logo.tsx`：logo 文字颜色跟随 isGlass 状态
- [x] `navbar-links.tsx`：颜色跟随状态（over-hero 白色，glass 后正常色）
- [x] `navbar-actions.tsx`：主题按钮（sun/moon outline SVG），移除"注册"，保留"登录"
- [x] 新建 `navbar-mobile-menu.tsx`：grid 展开菜单，含 toggle + 登录
- [x] `site-navbar.test.tsx`：更新测试

---

## 三、Featured Carousel 改造

### 涉及文件
- `apps/web/components/featured/featured-carousel.tsx`
- `apps/web/components/featured/featured-carousel-slide.tsx`
- 删除：`apps/web/components/featured/featured-carousel-indicators.tsx`（如存在）

### 设计要点

#### 容器
- `height: 100vh; min-height: 520px; overflow: hidden`
- Embla CarouselBase 控制横向滑动（已有 `@repo/ui` CarouselBase）
- 拖拽支持：Embla 原生提供

#### 每个 Slide（`featured-carousel-slide.tsx`）
```
[图片层] → next/image fill, object-cover
[顶部遮罩] → h-[130px], gradient to-b from-black/40 (保护 nav 可读性)
[底部遮罩] → gradient to-t from-black/88 via-black/50 to-transparent
[紫色斜向色调] → gradient-135deg 靛蓝 22% opacity
[内容层 z-10]
  pill label: "✦ 精选推荐"（accent color, blur bg）
  h2: clamp(20px, 3vw, 40px), font-weight 900, letter-spacing -0.04em
  p:  14px, rgba(255,255,255,.52), line-height 1.7, max 2 lines on mobile
  CTA 按钮: 玻璃风格 outline
[底部液态玻璃渐变]
  height: 64px, z-index 4
  backdrop-filter: blur(14px) saturate(140%)
  mask: gradient transparent→black 60%
  background: transparent  ← 不渗入页面背景色
```

#### 进度条指示器（替换原点状指示器）
```tsx
// 每个 slide 对应一根细线
// 激活状态：播放 CSS animation progFill 5s linear
// 完成状态：width 100%
// 点击跳转
```

#### 自动播放
- 5 秒自动切换（原有逻辑保留）
- 悬停暂停

### 任务清单

- [x] 💳 `featured-carousel-slide.tsx`：替换为新结构（顶部/底部遮罩 + 内容层）
- [x] `featured-carousel.tsx`：进度条组件替换点状指示器，保留自动播放
- [x] 移动端 `slide-excerpt`：保持显示，`line-clamp-2`

---

## 四、主页布局改造

### 涉及文件
- `apps/web/app/page.tsx`
- `apps/web/app/layout.tsx`（`<main>` padding 调整）

### page.tsx 新结构

```tsx
<div className="max-w-[960px] mx-auto px-5 py-[36px] pb-20">
  {/* 全宽 header：section title + tabs（在两列上方）*/}
  <div className="mb-6">
    <p className="text-xs font-bold tracking-widest uppercase text-accent mb-1">最新文章</p>
    <h2 className="text-[22px] font-extrabold tracking-tight text-foreground mb-5">近期在写什么</h2>
    <ArticleCategoryTabs ... />  {/* 下划线 Tabs */}
  </div>

  {/* 两列区域：侧边栏与第一篇文章卡片对齐 */}
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6 items-start">
    <main>
      <ArticleSection initialPage={initialPage} categories={...} />
    </main>
    <aside className="lg:sticky lg:top-[88px]" id="sidebar">
      <SnippetsSection snippets={snippets} />
      <RecentVisitors visitors={visitors} />
      <TagsCloud tags={tags} />
    </aside>
  </div>
</div>
```

> ⚠️ 注意：移动端侧边栏不再隐藏，改为 `position:static`，显示在文章列表下方

### 任务清单

- [x] 💳 `app/page.tsx`：重构页面布局，移除 preview strip
- [x] `app/layout.tsx`：`<main>` pt 从 `pt-16` 调整为 `pt-0`（Navbar 本身 fixed，Hero 从顶部开始）

---

## 五、Category Tabs 下划线改造

### 涉及文件
- `apps/web/components/articles/article-list-header.tsx`

### 设计

```tsx
// 容器：border-bottom 1.5px solid border-color
// 移动端：overflow-x: auto; scrollbar: none; white-space: nowrap
// 每个 Tab：
//   padding: 9px 18px
//   border: none; border-bottom: 2.5px solid transparent
//   margin-bottom: -1.5px  ← 覆盖容器 border
//   active: border-bottom-color = accent, text = accent
```

### 任务清单

- [x] `article-list-header.tsx`：Tabs 改为下划线风格，移动端 overflow-x scroll

---

## 六、Article Card 改造

### 涉及文件
- `apps/web/components/articles/article-card.tsx`
- `apps/web/components/articles/article-card-stats.tsx`

### 新卡片结构

```
[封面图] aspect-video, hover scale-[1.06]
[卡片体] padding 16px
  [分类] 11px, uppercase, accent color  ← 标题上方
  [标题] 16px, font-bold, 2-line clamp
  [摘要] 13px, line-height 1.72, 3-line clamp, text-muted-foreground
  [底部行]
    [日期] 12px, text-muted-foreground  ← 左
    [❤ count] [💬 count]              ← 右
```

### 交互
- 爱心按钮：`onClick` 切换 liked 状态（`fill="red"` / `fill="none"`），**不触发评论弹窗**
- 评论按钮：触发评论弹窗，传入 `{ type: cat, title }`

### 卡片网格
```tsx
// grid auto-fill minmax(280px, 1fr) gap-5
// Mobile: 1fr, 无 border/shadow，底部分隔线
```

### 任务清单

- [x] 💳 `article-card.tsx`：重构卡片布局（category top, date bottom-left）
- [x] `article-card.tsx`：爱心 toggle 本地状态（不调接口，待后续）
- [x] `article-card-stats.tsx`：移除阅读数，保留爱心+评论数
- [x] `article-section.tsx`：grid 改为 auto-fill minmax(280px)，gap-5
- [x] `article-list-header.tsx`：接受评论按钮回调（实际是 `article-section` 管理弹窗）

---

## 七、Comment Modal 新增

### 涉及文件（新建）
- `apps/web/components/comments/comment-modal.tsx`
- `apps/web/components/comments/comment-item.tsx`
- `apps/web/components/comments/comment-input.tsx`
- `apps/web/components/comments/index.ts`

### 结构

```
[backdrop] fixed inset-0 bg-black/45 backdrop-blur-md z-300
  [panel]
    桌面：max-w-[520px] max-h-[85vh] rounded-[20px], slideUp animation
    移动：fixed inset-0 h-[100dvh] rounded-[24px_24px_0_0], slideUpFull animation
    [drag handle]（移动端顶部）
    [header]
      post type label (accent, uppercase, 10px)
      post title (14px, font-bold, 2-line clamp)
      close button
    [comments list] overflow-y-auto flex-1
      [CommentItem]
        avatar + name + time
        text
        [❤ reply] actions
        [replies indent] border-left
          [CommentItem level2]
            @mention name
            text
    [CommentInput] fixed bottom
      avatar + textarea + submit
```

### 任务清单

- [x] 💳 新建 `comment-modal.tsx`：结构 + 动画（桌面 slideUp / 移动端 slideUpFull）
- [x] 新建 `comment-item.tsx`：comment + replies 嵌套
- [x] 新建 `comment-input.tsx`：textarea + submit
- [x] 新建 `comments/index.ts`：barrel export
- [x] 将 CommentModal 集成到 `article-section.tsx`（state: `{ open, title, type }`）
- [x] `comment-modal.test.tsx`：基础渲染测试

---

## 八、Sidebar 改造

### 涉及文件
- `apps/web/components/sidebar/recent-visitors.tsx`
- `apps/web/components/sidebar/tags-cloud.tsx`
- `apps/web/components/snippets/snippets-section.tsx`
- `apps/web/components/snippets/snippet-card.tsx`

### Snippets Section
- 每条碎语底部加爱心按钮（本地 toggle）和评论按钮（触发 CommentModal）
- 爱心按钮：`<Button variant="ghost" size="sm">`

### Recent Visitors
```tsx
// 新结构：2-col grid
// 每项：
//   <div className="v-item flex items-center gap-2 p-1.5 rounded-xl cursor-pointer 
//                   hover:bg-accent/10 active:scale-95 transition-all">
//     <img className="w-9 h-9 rounded-full object-cover" />
//     <div className="min-w-0">
//       <span className="text-xs font-semibold text-foreground truncate block">{name}</span>
//       <span className={cn("text-[10px] block truncate",
//         isOnline ? "text-emerald-500 font-semibold" : "text-muted-foreground"
//       )}>
//         {isOnline ? "在线" : `${timeAgo}前来过`}
//       </span>
//     </div>
//   </div>
```

### Tags Cloud
```tsx
// 每个 tag 显示数量
<TagItem key={tag.id} id={tag.id}>
  {tag.name}
  <span className="ml-1 text-[10px] opacity-60">{tag.count}</span>
</TagItem>
```

### Sidebar Scroll Sync（JS）
在 `page.tsx` 或专用 hook 中实现：
```ts
// useRef 指向 sidebar element
// scroll event: 
//   delta > 0 且 sidebar.bottom > viewport.bottom → sidebarTop -= delta
//   delta < 0 且 sidebar.top < 88 → sidebarTop -= delta
//   clamp: max sidebarTop=88, min = vh - sidebar.offsetHeight - 16
//   sidebar.style.top = sidebarTop + 'px'
```
新建 `apps/web/hooks/use-sidebar-scroll.ts`

### 任务清单

- [x] 💳 `recent-visitors.tsx`：重构为 2-col，含 name + status + click effect
- [x] `tags-cloud.tsx`：TagItem 加数量显示
- [x] `snippet-card.tsx`：加爱心+评论按钮
- [x] 新建 `use-sidebar-scroll.ts` hook
- [x] `sidebar.test.tsx`：更新测试

---

## 九、主题切换优化

### 涉及文件
- `apps/web/app/providers/theme-provider.tsx`（已有，检查是否需要适配新变量）
- `apps/web/lib/theme-init.ts`（THEME_CRITICAL_CSS 可能需更新）

**检查点**：新 `--color-background` 值（`#f7f7f9` / `#0c0c0f`）是否已在 `THEME_CRITICAL_CSS` 中使用。若不是，更新该内联样式防止闪烁。

### 任务清单

- [x] `theme-init.ts`：更新 `THEME_CRITICAL_CSS` 中的背景色值匹配新 tokens

---

## 十、Mock 数据更新（FeaturedPosts / Visitors / Tags）

### 涉及文件
- `apps/web/app/_mock/featured-posts.ts`
- `apps/web/app/_mock/visitors.ts`（需扩展类型）
- `apps/web/app/_mock/tags.ts`（已有 count 字段，检查）
- `apps/web/app/_mock/types.ts`（更新 Visitor 类型）

### Visitor 类型扩展

```ts
// types.ts
export interface Visitor {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  visitedAt: string;  // ISO datetime
}
```

### 任务清单

- [x] `types.ts`：Visitor 加 `name`, `isOnline` 字段
- [x] `visitors.ts`：补充 10 条 mock 数据（含在线/离线/不同时间）
- [x] `tags.ts`：确认 `count` 字段已有，若无则添加

---

## 十一、响应式收尾

| 断点 | 行为 |
|------|------|
| `< 480px` | 轮播摘要 2-line clamp |
| `< 680px` | Navbar 移动端，Tabs 横向滚动，文章卡片无边框，侧边栏垂直堆叠 |
| `680px–860px` | 两列布局但文章 1 列（minmax 不够宽），侧边栏仍显示 |
| `> 860px` | 文章 2 列 |

### 任务清单

- [x] 全面 QA：在 375px / 768px / 1280px 三个断点各截图检查

---

## 十二、测试更新

每改动一个组件，对应 `*.test.tsx` 必须同步更新（见 `CLAUDE.md` 要求）。

| 组件 | 测试文件 |
|------|----------|
| site-navbar | site-navbar.test.tsx |
| featured-carousel | featured-carousel.test.tsx（新建） |
| article-card | article-card.test.tsx（新建） |
| comment-modal | comment-modal.test.tsx（新建） |
| recent-visitors | sidebar.test.tsx |
| page.tsx | page.test.tsx |

---

## 执行顺序（推荐）

优先级从高到低，每组之间 commit 一次：

```
[批次 1 - 基础] Design Tokens (base.css) → theme-init.ts
[批次 2 - 布局] page.tsx layout → ArticleCategoryTabs (underline)
[批次 3 - Navbar] site-navbar + mobile menu
[批次 4 - Hero] featured-carousel + slide
[批次 5 - Cards] article-card + stats + article-section grid
[批次 6 - Sidebar] recent-visitors + tags-cloud + snippets
[批次 7 - Modal] comment-modal (new)
[批次 8 - Mock/Types] Visitor type + mock data
[批次 9 - 收尾] 测试更新 + 响应式 QA
```

---

## 额度检查点汇总 💳

每次标有 💳 的任务完成后，在终端运行：
```bash
# 暂时没有内置额度查询命令，请手动查看 claude.ai/settings 或询问用户
# 在每个 💳 任务完成后 git commit，然后停下来问用户：
# "已完成 [任务名]，请确认是否继续下一批次"
```

---

## 关键设计决策记录

| 决策 | 原因 |
|------|------|
| 菜单放 `<nav>` 内部 | 独立 fixed 元素的 JS 定位总有浮点像素缝隙 |
| 进度条替换点状指示器 | 更直观展示自动播放进度 |
| `grid-template-rows: 0fr→1fr` 展开动画 | GPU 加速，无 layout 抖动，比 max-height 流畅 |
| 底部液态玻璃用 mask + backdrop-filter | background transparent 避免浅色页面泛白 |
| 侧边栏 JS scroll sync | CSS sticky + overflow 无法同时实现"跟滚到底停住" |
| Tabs 下划线 + overflow-x scroll | 分类多时移动端不折行，可滑动 |
| 文章卡片移动端无边框 | 节省屏幕空间，内容更突出 |
