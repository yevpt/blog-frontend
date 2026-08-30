# 文章详情页：导航栏与封面融合设计

**日期**：2026-06-05  
**方案**：C2-backdrop — 封面顶部 backdrop-filter 色晕（Hero 内部处理，导航保持透明）

---

## 问题

当前 `ArticleHero` 的渐变遮罩只从底部向上（`to top`，黑色 → 透明），封面顶部完全透明。`SiteNavbar` fixed 在顶部初始无背景，两者缺乏视觉纽带：

- 亮色封面上导航文字对比度低
- 导航与封面之间有明显的"悬浮割裂感"
- 封面顶部和导航区域之间没有颜色过渡

---

## 设计决策

| 维度         | 决策                                                           |
| ------------ | -------------------------------------------------------------- |
| 颜色来源     | **无需提取**：CSS `backdrop-filter` 直接对封面图像素模糊混色   |
| 颜色作用范围 | 仅在封面可见时（Hero 内部，顶部约 50% 高度渐变消失）           |
| 导航变更     | 最小：哨兵高度改为 Hero 高度，封面完全可见期间 navbar 保持透明 |
| 无封面降级   | 顶部使用 `rgba(0,0,0,0.45) → transparent` 固定遮罩             |
| 新依赖       | 无                                                             |

---

## 视觉效果

Hero 顶部叠加一个透明 div，启用 `backdrop-filter: blur(24px) saturate(200%)`，并用 `mask-image` 渐变限制其作用范围：

```
顶部（导航区）
  ↓ blur+saturate 100% → 渐变消失（0%）约在 50% 高度处
  ↕ 图片本体（清晰可见）
  ↑ transparent → rgba(0,0,0,0.10) → rgba(0,0,0,0.82)（底部压暗，保持不变）
底部（标题区）
```

`backdrop-filter` 直接采样图片像素并放大饱和度，天然呈现封面主色的柔和色晕，无需任何颜色提取逻辑。

---

## 技术方案

### 1. ArticleHero — 顶部色晕层

在现有两个渐变叠加层的基础上，**替换**当前单层渐变为：

```tsx
{
  /* 顶部色晕层：backdrop-filter 采样封面像素，mask-image 限制作用范围 */
}
{
  article.cover_img_url && (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        maskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 52%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 52%)",
      }}
    />
  );
}
{
  /* 无封面时的顶部可读性遮罩（降级） */
}
{
  !article.cover_img_url && (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 45%)" }}
    />
  );
}
{
  /* 底部压暗层（保留，与原有一致） */
}
<div
  className="absolute inset-0 pointer-events-none"
  style={{
    background:
      "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.10) 45%, transparent 60%)",
  }}
/>;
```

`ArticleHero` **保持 Server Component**，无需 `'use client'`。

### 2. HeroSentinelSetter — 哨兵高度 Client Component

新增 `apps/web/components/article-detail/hero-sentinel-setter.tsx`：

```tsx
"use client";

import { useEffect } from "react";

interface Props {
  mobileH: number;
  desktopH: number;
}

export function HeroSentinelSetter({ mobileH, desktopH }: Props) {
  useEffect(() => {
    const h = window.innerWidth >= 768 ? desktopH : mobileH;
    document.documentElement.style.setProperty("--nav-sentinel-height", `${h}px`);
    return () => {
      document.documentElement.style.removeProperty("--nav-sentinel-height");
    };
  }, [mobileH, desktopH]);
  return null;
}
```

在 `ArticleHero` 的 JSX 末尾渲染：

```tsx
<HeroSentinelSetter mobileH={380} desktopH={480} />
```

这样 `ArticleHero` 的图片、渐变、标题渲染全部保持 SSR，只有哨兵逻辑是客户端的。

### 3. SiteNavbar — 哨兵高度读取 CSS var

现有哨兵 div 的 `h-[60px]` Tailwind 类改为读取 CSS 自定义属性（默认 `60px`）：

```tsx
<div
  ref={sentinelRef}
  aria-hidden
  className="pointer-events-none absolute left-0 top-0 w-px"
  style={{ height: "var(--nav-sentinel-height, 60px)" }}
/>
```

当 `ArticleHero` 在页面上时，`--nav-sentinel-height` 被设为 480px（桌面）或 380px（移动），navbar 在封面完全可见期间保持透明。离开文章页时变量被清除，回退到默认 60px。

---

## 文件改动范围

| 文件                                                          | 变更类型 | 说明                                                            |
| ------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| `apps/web/components/article-detail/article-hero.tsx`         | 修改     | 替换顶部渐变为 backdrop-filter 色晕层 + 渲染 HeroSentinelSetter |
| `apps/web/components/article-detail/hero-sentinel-setter.tsx` | 新增     | null-render Client Component，设置哨兵高度 CSS var              |
| `apps/web/components/article-detail/index.ts`                 | 修改     | barrel export 加入 HeroSentinelSetter（若需对外导出）           |
| `apps/web/components/navbar/site-navbar.tsx`                  | 修改     | 哨兵高度改为读取 CSS var，默认 60px                             |

无新 npm 依赖。

---

## 降级策略

| 场景                              | 处理                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| 无封面图                          | 不渲染 backdrop-filter 层，改用 `rgba(0,0,0,0.45) → transparent` 固定遮罩 |
| 浏览器不支持 backdrop-filter      | 透明覆盖（无色晕），底部压暗层保证标题可读                                |
| 非文章页（无 HeroSentinelSetter） | CSS var 未设置，哨兵回退默认 60px，现有逻辑不变                           |

---

## 测试要求

- `ArticleHero`：① 有封面图时渲染 backdrop-filter 色晕层；② 无封面图时渲染降级遮罩；③ 渲染 `HeroSentinelSetter`
- `HeroSentinelSetter`：① mount 时设置 `--nav-sentinel-height`；② unmount 时清除
- `SiteNavbar`：哨兵 div 的高度从 CSS var 读取，未设置时回退 `60px`
