# Mobile Featured Carousel 全屏改版实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移动端轮播图改为全屏高度（100svh），图片铺满屏幕，文字叠加于底部渐变之上；桌面端布局不变。

**Architecture:** 拆分移动端与桌面端的外层容器——移动端不套 max-width 约束，直接全宽全高渲染；`FeaturedCarouselSlide` 用响应式 Tailwind class 实现"移动绝对定位叠加 / 桌面 flex 两栏"双态布局。

**Tech Stack:** Next.js App Router, React, TailwindCSS, Embla Carousel（`@repo/ui` Carousel），Vitest + @testing-library/react

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `apps/web/components/featured/featured-carousel.tsx` | 修改 | 移动端脱离 max-width 容器；桌面端保留原容器约束 |
| `apps/web/components/featured/featured-carousel-slide.tsx` | 修改 | 移动端改为 overlay 布局；桌面端 flex 两栏不变 |
| `apps/web/components/featured/featured-carousel.test.tsx` | 修改 | 补充移动端全屏断言，更新 overlay 结构断言 |

---

## Task 1：更新移动端轮播容器（脱离 max-width，设为全屏高度）

**Files:**
- Modify: `apps/web/components/featured/featured-carousel.tsx`
- Test: `apps/web/components/featured/featured-carousel.test.tsx`

- [ ] **Step 1: 写失败测试——移动端 carousel-root 高度为 100svh，无圆角**

在 `featured-carousel.test.tsx` 的 `describe("FeaturedCarousel")` 块末尾追加：

```tsx
it("移动端轮播容器高度为 100svh、无圆角", () => {
  render(<FeaturedCarousel posts={mockPosts} />);
  const mobileCarousel = screen.getByTestId("carousel-root");
  expect(mobileCarousel.className).toContain("h-[100svh]");
  expect(mobileCarousel.className).not.toContain("rounded-2xl");
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter web test -- --reporter=verbose featured-carousel
```

期望：新增的测试报 `AssertionError: expected '…h-[500px]…rounded-2xl…' to contain 'h-[100svh]'`

- [ ] **Step 3: 实现 `FeaturedCarousel` 容器拆分 + `FeaturedCarouselMobile` 高度修改**

将 `featured-carousel.tsx` 中 `FeaturedCarouselMobile` 函数的 `Carousel.Root` 的 `className` 由：
```tsx
className="h-[500px] overflow-hidden rounded-2xl"
```
改为：
```tsx
className="h-[100svh] overflow-hidden"
```

将 `FeaturedCarousel` 导出函数的 return 由：
```tsx
return (
  <div className="mx-auto max-w-[1120px] px-3 pt-16 md:px-5 md:pt-20">
    {/* 桌面端（md+）：上下垂直翻页 */}
    <div className="hidden md:block">
      <FeaturedCarouselDesktop posts={posts} />
    </div>
    {/* 移动端：左右水平翻页 */}
    <div className="md:hidden">
      <FeaturedCarouselMobile posts={posts} />
    </div>
  </div>
);
```
改为：
```tsx
return (
  <>
    {/* 移动端：全屏，不受 max-width 约束 */}
    <div className="md:hidden">
      <FeaturedCarouselMobile posts={posts} />
    </div>
    {/* 桌面端（md+）：保持原有容器约束 */}
    <div className="hidden md:block mx-auto max-w-[1120px] px-5 pt-20">
      <FeaturedCarouselDesktop posts={posts} />
    </div>
  </>
);
```

- [ ] **Step 4: 运行测试，确认全部通过**

```bash
pnpm --filter web test -- --reporter=verbose featured-carousel
```

期望：所有测试 PASS（包括新增的「移动端轮播容器高度为 100svh、无圆角」）

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/featured/featured-carousel.tsx \
        apps/web/components/featured/featured-carousel.test.tsx
git commit -m "feat(web): 移动端轮播容器全屏化（100svh，脱离 max-width）"
```

---

## Task 2：更新 Slide 布局——移动端 overlay，桌面端 flex 两栏不变

**Files:**
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`
- Test: `apps/web/components/featured/featured-carousel.test.tsx`

- [ ] **Step 1: 写失败测试——移动端文字 overlay 在容器底部**

在 `featured-carousel.test.tsx` 的 `describe("FeaturedCarousel")` 块末尾追加：

```tsx
it("移动端 slide 文字 overlay 包裹层带 absolute bottom-0 class", () => {
  render(<FeaturedCarousel posts={mockPosts} />);
  // 找到 carousel-root 内部第一个 no-drag 元素的父级（文字 overlay 包裹层）
  const mobileCarousel = screen.getByTestId("carousel-root");
  const noDragEl = mobileCarousel.querySelector("[data-carousel-no-drag='true']");
  expect(noDragEl).not.toBeNull();
  const overlayWrapper = noDragEl!.parentElement;
  expect(overlayWrapper!.className).toContain("absolute");
  expect(overlayWrapper!.className).toContain("bottom-0");
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter web test -- --reporter=verbose featured-carousel
```

期望：新增测试报 `AssertionError`（当前 parentElement 不含 `absolute`/`bottom-0`）

- [ ] **Step 3: 重写 `FeaturedCarouselSlide` 组件**

完整替换 `featured-carousel-slide.tsx` 中 `return` 语句的 JSX：

```tsx
return (
  <div className="relative h-full w-full md:flex md:flex-row md:gap-4 md:p-4">
    {/* ── 图片：移动端绝对定位铺满，桌面端作为 flex 子项 ── */}
    <div className="absolute inset-0 overflow-hidden md:relative md:inset-auto md:h-full md:w-auto md:flex-1 md:shrink-0 md:rounded-xl md:shadow-md">
      <Image
        src={post.coverImage}
        alt={post.title}
        fill
        className="object-cover transition-transform duration-[6000ms] ease-out"
        style={{ transform: isActive ? "scale(1.05)" : "scale(1)" }}
        priority={isLcpCandidate}
        loading={isLcpCandidate ? "eager" : "lazy"}
        sizes="(max-width: 768px) 100vw, 55vw"
      />
      <div className="absolute inset-0 bg-black/10" />
      {/* 移动端底部渐变叠加层 */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 42%, transparent 68%)",
        }}
      />
    </div>

    {/* ── 文字区：移动端绝对定位于底部，桌面端作为 flex 子项 ── */}
    <div className="absolute bottom-0 left-0 right-0 z-10 md:relative md:inset-auto md:z-auto md:w-[42%] md:flex-none">
      <div
        key={isActive ? "active" : "idle"}
        data-carousel-no-drag="true"
        onPointerDownCapture={(e) => e.stopPropagation()}
        className="flex flex-col gap-3 px-5 pb-8 cursor-auto select-text md:h-full md:justify-between md:gap-0 md:px-12 md:py-8 lg:px-16"
      >
        {/* 日期 + 分类 */}
        <div
          className="flex items-center gap-2.5 text-[13px] font-medium tracking-wide text-white/65 transition-all md:text-muted-foreground"
          style={{
            opacity: isActive ? 1 : 0,
            transform: isActive ? "translateX(0)" : "translateX(20px)",
            transitionDuration: isActive ? "600ms" : "250ms",
            transitionDelay: isActive ? "0ms" : "0ms",
          }}
        >
          <span>{formattedDate}</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(post.category)}`}
            />
            {post.category}
          </span>
        </div>

        {/* 标题 */}
        <h2
          className="line-clamp-2 text-[20px] font-bold leading-[1.2] tracking-tight text-white transition-all md:line-clamp-none md:text-[clamp(22px,2.4vw,36px)] md:text-foreground"
          style={{
            opacity: isActive ? 1 : 0,
            transform: isActive ? "translateX(0)" : "translateX(24px)",
            transitionDuration: isActive ? "700ms" : "250ms",
            transitionDelay: isActive ? "160ms" : "0ms",
          }}
        >
          {post.title}
        </h2>

        {/* 摘要 */}
        <p
          className="line-clamp-3 text-[13px] leading-relaxed text-white/65 transition-all md:line-clamp-none md:max-w-[400px] md:text-[14px] md:leading-[1.75] md:text-muted-foreground"
          style={{
            opacity: isActive ? 1 : 0,
            transform: isActive ? "translateX(0)" : "translateX(24px)",
            transitionDuration: isActive ? "700ms" : "250ms",
            transitionDelay: isActive ? "280ms" : "0ms",
          }}
        >
          {post.excerpt}
        </p>

        {/* CTA */}
        <div
          className="transition-all"
          style={{
            opacity: isActive ? 1 : 0,
            transform: isActive ? "translateX(0)" : "translateX(24px)",
            transitionDuration: isActive ? "700ms" : "250ms",
            transitionDelay: isActive ? "400ms" : "0ms",
          }}
        >
          <Button
            href={post.href}
            variant="outline"
            size="sm"
            aria-label="阅读全文"
            className="h-10 rounded-full border-white/45 bg-transparent px-6 text-[13px] font-semibold text-white shadow-sm transition-colors md:border-border md:bg-card md:text-foreground md:hover:border-primary md:hover:bg-primary/10 md:hover:text-primary"
          >
            阅读全文 →
          </Button>
        </div>

        {/* 移动端指示点：CTA 下方居中 */}
        {mobileIndicators && (
          <div className="flex justify-center md:hidden">
            {mobileIndicators}
          </div>
        )}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 4: 运行测试，确认全部通过**

```bash
pnpm --filter web test -- --reporter=verbose featured-carousel
```

期望：所有测试 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/featured/featured-carousel-slide.tsx \
        apps/web/components/featured/featured-carousel.test.tsx
git commit -m "feat(web): 移动端轮播 slide 改为全屏 overlay 布局

- 图片绝对定位铺满屏幕，底部渐变叠加
- 文字（日期、标题、摘要、CTA、指示点）叠加于图片底部
- 移动端文字白色系；桌面端 flex 两栏布局不变"
```

---

## 自检：spec 覆盖率

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 移动端宽度 = 视口宽度 | Task 1（脱离 max-width 容器） |
| 移动端高度 = 视口高度（100svh） | Task 1（Carousel.Root className） |
| 无圆角 | Task 1（移除 rounded-2xl） |
| 图片铺满全屏 | Task 2（absolute inset-0） |
| 底部渐变叠加 | Task 2（渐变 div） |
| 文字叠加于图片底部 | Task 2（absolute bottom-0 overlay） |
| 指示点 CTA 下方居中 | Task 2（mobileIndicators flex justify-center） |
| 桌面端不变 | Task 1（hidden md:block 容器） + Task 2（md: prefix 保留桌面样式） |
| 测试更新 | Task 1 Step 1 + Task 2 Step 1 |
