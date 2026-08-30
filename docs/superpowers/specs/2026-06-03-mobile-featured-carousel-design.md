# 移动端 Featured Carousel 改版设计文档

**日期：** 2026-06-03  
**范围：** `apps/web/components/featured/`  
**原则：** 只改移动端（`< md`），桌面端布局完全不动

---

## 背景

现有移动端轮播图存在两个问题：

1. 受限于 `max-w-[1120px]` 容器，无法充分利用手机全屏空间
2. 图片与文字分离（图上文下），在小屏上显得局促

---

## 设计目标

- 移动端轮播占满整个视口（全屏）
- 文字内容叠加在图片内部，而不是拆开排列
- 桌面端（`md+`）布局、逻辑、样式完全不变

---

## 移动端新布局

### 容器

| 属性       | 值                                                |
| ---------- | ------------------------------------------------- |
| 宽度       | `100vw`（破出父容器 `max-w` 限制，使用负 margin） |
| 高度       | `h-[100svh]`（使用 svh 兼容移动端浏览器工具栏）   |
| 圆角       | 无（`rounded-none`）                              |
| 顶部内边距 | 无（容器本身破出，不受 `pt-16` 影响）             |

破出方案：在 `FeaturedCarousel` 包裹层对移动端使用：

```
-mx-3 w-screen   （对应父容器 px-3）
```

或在 `FeaturedCarouselMobile` 自身加 `relative -mx-[calc(50vw-50%)]` 使其宽度对齐视口。

实际做法：将 `FeaturedCarousel` 外层 padding/max-width 仅在 `md+` 生效，移动端不套容器。

### Slide 布局

图片作为背景铺满全屏（`fill` + `object-cover`），叠加底部渐变：

```
background: linear-gradient(to top,
  rgba(0,0,0,0.88) 0%,
  rgba(0,0,0,0.30) 42%,
  transparent 68%
)
```

文字区绝对定位于底部，从下往上依次为：

1. **指示点行** — 水平居中，当前激活项为白色拉长胶囊（16px wide），其余为小圆点（6px）
2. **CTA 按钮** — `阅读全文 →`，outline 风格，白色边框
3. **摘要**（2 行截断）
4. **标题**（2 行截断，`text-xl font-bold`）
5. **日期 + 分类**（小字，`text-muted`）

底部安全间距：`pb-8`（兼容 Home Indicator 区域）。

### 动效

- 入场动效保留（`isActive` 驱动的 `opacity` + `translateX` stagger），适配 overlay 结构
- Ken Burns 缩放保留
- 无滚动引导动效

### 指示点

- 位置：CTA 下方，独立一行，`justify-center`
- 样式：白色，激活态拉长（`w-4 h-1.5`），非激活态小圆点（`w-1.5 h-1.5`）
- 间距：`gap-2`，点击区域 `w-5 h-5`

---

## 桌面端（不变）

`md+` 断点以上所有代码、样式、交互均不改动：

- 左图右文两栏布局
- 垂直翻页（CSS translateY）
- 右侧竖向胶囊指示器

---

## 涉及文件

| 文件                                                       | 改动内容                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/components/featured/featured-carousel.tsx`       | 移动端容器破出 max-width，高度改为 `100svh`                     |
| `apps/web/components/featured/featured-carousel-slide.tsx` | 移动端布局从「图上文下」改为 overlay（图片全屏 + 文字叠加底部） |
| `apps/web/components/featured/featured-carousel.test.tsx`  | 更新快照 / 结构断言                                             |

---

## 验收标准

1. 移动端视口下，轮播图宽度 = 视口宽度，高度 = 视口高度
2. 文字（标题、摘要、CTA、指示点）全部位于图片内部
3. 桌面端（≥ 768px）布局与改版前视觉一致
4. 测试文件同步更新，CI 通过
