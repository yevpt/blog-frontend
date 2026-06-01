# 首页移动端 UX 优化设计文档

**日期**：2026-06-01  
**范围**：首页四处移动端体验问题的改进方案

---

## 1. 轮播图移动端堆叠布局

### 问题
当前 `FeaturedCarousel` 使用 `aspect-video` 固定宽高比，文字通过绝对定位叠在图片底部。移动端屏幕窄时，图片高度受限，文字覆盖层拥挤，可读性差。

### 设计方案

采用响应式双布局，用一套 DOM 通过 Tailwind 响应式前缀切换：

- **移动端（默认）**：`flex flex-col` 文档流布局，图片在上（保持 `aspect-video` + `rounded-xl overflow-hidden`），文字区块在图片下方，带主题背景色，内边距 `p-4`，包含：分类标签、标题（最多 2 行）、摘要（最多 2 行）、"阅读全文"按钮
- **桌面端（`md:`）**：切换回绝对定位覆盖模式，图片 fill、渐变遮罩、文字 `absolute bottom-0 left-0 right-0`，与当前实现相同

容器 `FeaturedCarousel` 移动端去掉 `aspect-video`（自然高度），桌面端恢复 `md:aspect-video`。  
幻灯片切换：保留 opacity fade，但非 active 的幻灯片在移动端用 `absolute inset-0` + `opacity-0 pointer-events-none` 保持叠层不影响文档流（因此容器需要在移动端有明确高度——通过 active slide 撑开；非 active slides 绝对定位）。

**实现细节**：
- 容器：`relative` 始终保留（供绝对定位 slides 和指示器使用），移动端高度由 active slide 的文档流内容决定
- 幻灯片：active slide `relative`（参与文档流），non-active slides `absolute inset-0 opacity-0 pointer-events-none`
- 文字区：`p-4 md:absolute md:bottom-0 md:left-0 md:right-0 md:p-6 lg:p-8 md:bg-transparent`，移动端白/主题背景，桌面端无背景（靠渐变遮罩）
- 渐变遮罩 `div`：加 `hidden md:block`，移动端不需要

### 改动文件
- `apps/web/components/featured/featured-carousel.tsx`
- `apps/web/components/featured/featured-carousel-slide.tsx`
- `apps/web/components/featured/featured-carousel.test.tsx`（更新）

---

## 2. 分类 Tabs 横向滚动 + 搜索图标切换

### 问题
移动端 `ArticleListHeader` 使用 `flex flex-wrap`，Tabs 和 SearchField 并排，空间不足时挤压换行；Tabs 内文字换行导致布局错乱。

### 设计方案

**`TabsList` underline 变体**（`packages/ui/src/tabs.tsx`）：
- 加 `overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`，允许横向滚动并隐藏滚动条（Tailwind v4 arbitrary variant，覆盖 WebKit + Firefox）

**`TabsItem`**：
- 加 `whitespace-nowrap shrink-0`，禁止文字换行，防止 shrink

**`ArticleListHeader`**（移动端搜索切换逻辑）：
- 新增本地状态 `isSearchOpen: boolean`（默认 `false`）
- 移动端（`< md`）：
  - `isSearchOpen === false`：Tabs 正常显示 + 右侧搜索图标按钮（`<SvgIcon name="search" size={18} />`）
  - `isSearchOpen === true`：整个 header 替换为全宽 SearchField + 关闭按钮（`<SvgIcon name="close" size={18} />`），Tabs 隐藏
- 桌面端（`md+`）：始终显示完整 SearchField，图标按钮隐藏（`hidden md:block` / `md:hidden`）
- 关闭搜索时清空 `localQuery` 并通知外层 `onSearchChange("")`

### 改动文件
- `packages/ui/src/tabs.tsx`（underline 变体 + TabsItem）
- `packages/ui/src/tabs.test.tsx`（更新）
- `apps/web/components/articles/article-list-header.tsx`
- `apps/web/components/articles/article-list-header.test.tsx`（更新）

---

## 3. 文章卡片结构调整

### 问题
分类标签在标题上方，视觉层级不够突出；标题旁无跳转图标，点击入口不明显。

### 设计方案

**新卡片结构（从上到下）**：
1. 封面图（不变）
2. **标题行**（`flex items-start gap-2 mt-3`）
   - `<h3 className="flex-1 font-semibold text-base md:text-lg line-clamp-2">` + `<Link href>`
   - 右侧：`<Link href={href} aria-label="阅读文章" className="shrink-0 mt-0.5 text-fg-quaternary hover:text-foreground transition-colors"><SvgIcon name="arrow-up-right" size={20} /></Link>`
3. **分类标签**（`mt-2`，从标题上方移至下方）
4. 摘要（不变，`mt-1`）
5. 底部统计（不变，`mt-3`）

**新增图标**：`packages/icons/svg/arrow-up-right.svg`
```svg
<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 17 17 7m0 0H7m10 0v10"/>
</svg>
```
添加后运行 `pnpm --filter @repo/icons build` 生成类型。

### 改动文件
- `packages/icons/svg/arrow-up-right.svg`（新增）
- `packages/icons/` build 产物（重新生成）
- `apps/web/components/articles/article-card.tsx`
- `apps/web/components/articles/article-card.test.tsx`（更新）

---

## 4. 分页骨架屏 + 平滑滚动

### 问题
翻页时页面位置乱跳；loading 期间只是 `opacity-50`，无专用加载反馈。

### 设计方案

**`ArticleCardSkeleton`**（新建 `apps/web/components/articles/article-card-skeleton.tsx`）：  
`animate-pulse` + `bg-muted rounded` 色块，结构与 `ArticleCard` 对齐：
- 封面占位（`aspect-video rounded-xl bg-muted`）
- 标题行占位（两行，`h-4 rounded bg-muted`，第二行宽 `w-3/4`）
- 分类占位（`h-3 rounded-full bg-muted w-16`）
- 摘要占位（三行 `h-3 rounded bg-muted`）
- 底部统计占位（`h-3 rounded bg-muted w-1/2`）

**`ArticleSection`** 修改：
- `const sectionRef = useRef<HTMLElement>(null)`，加到 `<section ref={sectionRef}>`
- `handlePageChange` 末尾加：`sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- loading 状态改为：渲染 `Array.from({ length: pageData.list.length || 6 })` 个 `<ArticleCardSkeleton>`，去掉原有 `opacity-50 pointer-events-none` 逻辑
- 错误状态保持不变

### 改动文件
- `apps/web/components/articles/article-card-skeleton.tsx`（新增）
- `apps/web/components/articles/article-card-skeleton.test.tsx`（新增）
- `apps/web/components/articles/article-section.tsx`
- `apps/web/components/articles/article-section.test.tsx`（更新）
- `apps/web/components/articles/index.ts`（导出 skeleton）

---

## 改动文件汇总

| 文件 | 操作 |
|---|---|
| `packages/icons/svg/arrow-up-right.svg` | 新增 |
| `packages/ui/src/tabs.tsx` | 修改 |
| `packages/ui/src/tabs.test.tsx` | 更新 |
| `apps/web/components/featured/featured-carousel.tsx` | 修改 |
| `apps/web/components/featured/featured-carousel-slide.tsx` | 修改 |
| `apps/web/components/featured/featured-carousel.test.tsx` | 更新 |
| `apps/web/components/articles/article-list-header.tsx` | 修改 |
| `apps/web/components/articles/article-list-header.test.tsx` | 更新 |
| `apps/web/components/articles/article-card.tsx` | 修改 |
| `apps/web/components/articles/article-card.test.tsx` | 更新 |
| `apps/web/components/articles/article-card-skeleton.tsx` | 新增 |
| `apps/web/components/articles/article-card-skeleton.test.tsx` | 新增 |
| `apps/web/components/articles/article-section.tsx` | 修改 |
| `apps/web/components/articles/article-section.test.tsx` | 更新 |
| `apps/web/components/articles/index.ts` | 更新导出 |
