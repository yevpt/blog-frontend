# 文章详情页：导航栏与封面融合设计

**日期**：2026-06-05  
**方案**：C2 — 封面颜色向上延伸（Hero 内部处理，导航保持透明）

---

## 问题

当前 `ArticleHero` 的渐变遮罩只从底部向上（`to top`，黑色 → 透明），封面顶部完全透明。`SiteNavbar` fixed 在顶部初始无背景，两者缺乏视觉纽带：

- 亮色封面上导航文字对比度低
- 导航与封面之间有明显的"悬浮割裂感"
- 封面顶部和导航区域之间没有颜色过渡

---

## 设计决策

| 维度 | 决策 |
|------|------|
| 颜色来源 | 服务端 SSR 提取封面主色（`node-vibrant`） |
| 颜色作用范围 | 仅在封面可见时（Hero 内部渐变） |
| 导航变更 | 最小：只调整哨兵高度，使封面完全可见期间 navbar 保持透明 |
| 无封面降级 | 顶部使用 `rgba(0,0,0,0.45)` 固定遮罩 |
| 提取失败降级 | 同无封面，使用中性深色遮罩 |

---

## 视觉效果

封面图的主色从顶部以渐变方式向下渗透，与封面图本身融合：

```
顶部（导航区）
  ↓ dominantColor/65 → dominantColor/20 → transparent（约 50% 高度）
  ↕ 图片本体
  ↑ transparent → rgba(0,0,0,0.10) → rgba(0,0,0,0.82)（底部压暗）
底部（标题区）
```

两层渐变叠加：上层用提取颜色，下层保持原有的底部压暗不变。

---

## 技术方案

### 1. 颜色提取（服务端）

在 `apps/web/app/articles/[id]/page.tsx`（Server Component）中，新增 `extractDominantColor` 工具函数：

```ts
// lib/extract-dominant-color.ts
import Vibrant from 'node-vibrant';

export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();
    return palette.DarkVibrant?.hex ?? palette.Vibrant?.hex ?? null;
  } catch {
    return null;
  }
}
```

- 优先取 `DarkVibrant`（饱和度高、偏深，适合做顶部遮罩）
- 失败返回 `null`，`ArticleHero` 使用降级遮罩

### 2. ArticleHero 改动

**新增 prop：**

```ts
interface ArticleHeroProps {
  article: ArticleDetailResp;
  dominantColor?: string | null;   // 新增
}
```

**渐变叠加层替换：**

现有单层 `linear-gradient(to top, ...)` 拆分为两层：

```tsx
{/* 顶部颜色延伸层（新增） */}
<div
  className="absolute inset-0"
  style={{
    background: dominantColor
      ? `linear-gradient(to bottom, ${dominantColor}A6 0%, ${dominantColor}33 30%, transparent 52%)`
      : 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 45%)',
  }}
/>
{/* 底部压暗层（保留原有） */}
<div
  className="absolute inset-0"
  style={{
    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.10) 45%, transparent 60%)',
  }}
/>
```

透明度值（hex suffix）：
- `A6` = 65% 不透明（顶部，主色调最强处）
- `33` = 20% 不透明（渐变中段）

### 3. SiteNavbar 哨兵高度

现有哨兵：`h-[60px]`（绝对定位，跟随文档滚动；离开视口时触发玻璃态）。

文章详情页 Hero 高度：`h-[380px] md:h-[480px]`。若哨兵仅 60px，用户在 Hero 范围内滚动时 navbar 就会变成玻璃态，覆盖在颜色渐变之上，破坏融合效果。

**方案：通过 CSS 自定义属性动态设置哨兵高度。**

`SiteNavbar` 的哨兵 div 读取 `--nav-sentinel-height`（默认 `60px`）：

```tsx
<div
  ref={sentinelRef}
  aria-hidden
  className="pointer-events-none absolute left-0 top-0 w-px"
  style={{ height: 'var(--nav-sentinel-height, 60px)' }}
/>
```

`ArticleHero`（客户端组件）在 mount/unmount 时设置/清除该变量：

```tsx
useEffect(() => {
  const heroEl = heroRef.current;
  if (!heroEl) return;
  const h = heroEl.offsetHeight;
  document.documentElement.style.setProperty('--nav-sentinel-height', `${h}px`);
  return () => document.documentElement.style.removeProperty('--nav-sentinel-height');
}, []);
```

`ArticleHero` 添加 `'use client'` 指令，转为 Client Component。`dominantColor` 是可序列化的 `string | null`，由父级 Server Component（`page.tsx`）传入，无需拆分 wrapper。

---

## 文件改动范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `apps/web/lib/extract-dominant-color.ts` | 新增 | 服务端颜色提取工具 |
| `apps/web/app/articles/[id]/page.tsx` | 修改 | 调用颜色提取，传 `dominantColor` 给 Hero |
| `apps/web/components/article-detail/article-hero.tsx` | 修改 | 新增 prop、双层渐变、哨兵高度 CSS var 设置 |
| `apps/web/components/navbar/site-navbar.tsx` | 修改 | 哨兵高度改为读取 CSS var |

---

## 依赖

- `node-vibrant`（`node-vibrant` v3.x，支持 Node.js 环境和 URL 输入）

---

## 降级策略

| 场景 | 处理 |
|------|------|
| 无封面图 | 顶部层使用 `rgba(0,0,0,0.45) → transparent` |
| 封面 URL 不可达 / 提取超时 | 同上，`extractDominantColor` 返回 `null` |
| 极亮主色（提取色过浅）| 降级为固定深色遮罩；可后续加亮度检测 |

---

## 测试要求

- `ArticleHero`：① 有 `dominantColor` 时渲染顶部颜色层；② 无 `dominantColor` 时渲染降级遮罩；③ mount/unmount 正确设置/清除 CSS 变量
- `extractDominantColor`：① 返回 hex 字符串；② URL 失败时返回 `null`
- `SiteNavbar`：哨兵高度读取 CSS var，回退默认 `60px`
