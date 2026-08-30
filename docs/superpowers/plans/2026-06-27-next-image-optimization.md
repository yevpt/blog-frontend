# Markdown 与首页轮播图片优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Markdown 白名单静态图片和首页轮播静态图片使用 Next 图片优化器，同时保留原图预览、失败重试、原图兜底与 GIF 动画。

**Architecture:** Web 层用共享 JSON 维护 Next 允许优化的远程域名，由纯函数同步改写 Markdown HTML 的图片属性；`@repo/markdown` 只负责通用的优化图片重试和原图预览，不依赖 Next。轮播继续复用 `LoadingImage`，仅按 URL 判断 GIF 是否跳过优化。

**Tech Stack:** Next.js 16、React 19、TypeScript、Vitest、Testing Library

---

## 文件结构

- Create: `apps/web/config/optimized-image-hosts.json` — Next 配置和客户端改写逻辑的单一域名来源。
- Create: `apps/web/lib/markdown-image-optimizer.ts` — URL 判断、GIF 判断、Next URL 与 Markdown HTML 改写纯函数。
- Create: `apps/web/lib/markdown-image-optimizer.test.ts` — 纯函数边界测试。
- Modify: `apps/web/next.config.mjs` — 从共享 JSON 生成 `remotePatterns`。
- Modify: `packages/markdown/src/markdown-content.tsx` — 绑定重试并在预览时读取原图 URL。
- Create: `packages/markdown/src/image-retry.ts` — 与 Next 无关的图片重试及原图回退逻辑。
- Modify: `packages/markdown/src/image-fallback.ts` — 避免优化图片尚未重试就被同步替换成占位。
- Modify: `packages/markdown/src/markdown-content.test.tsx` — 重试、原图回退、原图预览测试。
- Modify: `apps/web/components/common/previewable-markdown.tsx` — 接入 HTML 图片优化。
- Modify: `apps/web/components/common/previewable-markdown.test.tsx` — 集成与 store 测试。
- Modify: `apps/web/components/featured/featured-carousel-slide.tsx` — 静态图启用优化，GIF 直连，开启原图兜底。
- Modify: `apps/web/components/featured/featured-carousel.test.tsx` — 轮播图片策略与比例样式测试。

### Task 1: 建立 Markdown 图片优化纯函数

**Files:**

- Create: `apps/web/config/optimized-image-hosts.json`
- Create: `apps/web/lib/markdown-image-optimizer.ts`
- Create: `apps/web/lib/markdown-image-optimizer.test.ts`
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: 写域名、静态图改写和 GIF 跳过的失败测试**

测试使用 DOM 读取改写后的属性，覆盖白名单 HTTPS、非白名单、相对地址、特殊协议、大小写 GIF 与带查询参数 GIF：

```ts
import { describe, expect, it } from "vitest";
import { isGifImageUrl, optimizeMarkdownImages } from "./markdown-image-optimizer";

function parseImage(html: string): HTMLImageElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  const image = container.querySelector("img");
  if (!image) throw new Error("测试 HTML 缺少图片");
  return image;
}

describe("optimizeMarkdownImages", () => {
  it("为白名单静态图生成 Next 响应式地址并保存原图", () => {
    const original = "https://blog-oss.yevpt.com/posts/cover.jpg?x=1&y=2";
    const image = parseImage(
      optimizeMarkdownImages(
        `<p><img src="${original.replace("&", "&#x26;")}" alt="封面"></p>`,
        "article",
      ),
    );

    expect(image.dataset.originalSrc).toBe(original);
    expect(image.dataset.mdImageOptimized).toBe("true");
    expect(image.getAttribute("src")).toContain("/_next/image?url=");
    expect(image.getAttribute("srcset")).toContain("640w");
    expect(image.getAttribute("sizes")).toContain("768px");
    expect(image.loading).toBe("lazy");
    expect(image.decoding).toBe("async");
  });

  it.each([
    "https://example.com/a.jpg",
    "/local.jpg",
    "data:image/png;base64,AA==",
    "blob:https://blog.yevpt.com/id",
  ])("不改写不符合条件的地址 %s", (src) => {
    expect(optimizeMarkdownImages(`<img src="${src}">`, "comment")).toBe(`<img src="${src}">`);
  });
});

describe("isGifImageUrl", () => {
  it.each(["https://blog-oss.yevpt.com/a.gif", "https://blog-oss.yevpt.com/a.GIF?v=1"])(
    "识别 GIF：%s",
    (src) => expect(isGifImageUrl(src)).toBe(true),
  );
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter web exec vitest --run lib/markdown-image-optimizer.test.ts`

Expected: FAIL，提示模块或导出不存在。

- [ ] **Step 3: 建立单一域名配置并实现最小纯函数**

`optimized-image-hosts.json` 写入当前 `next.config.mjs` 的六个域名：

```json
[
  "picsum.photos",
  "i.pravatar.cc",
  "blog-dev-oss.yevpt.com",
  "blog-oss.yevpt.com",
  "garage-s3-local-api.yevpt.com",
  "api.dicebear.com"
]
```

`next.config.mjs` 导入 JSON，并将 `remotePatterns` 改为：

```js
import optimizedImageHosts from "./config/optimized-image-hosts.json" with { type: "json" };

remotePatterns: optimizedImageHosts.map((hostname) => ({ hostname })),
```

`markdown-image-optimizer.ts` 完整实现以下固定规则：

```ts
import optimizedImageHosts from "@/config/optimized-image-hosts.json";

export type MarkdownImageVariant = "article" | "comment";

const ALLOWED_HOSTS = new Set<string>(optimizedImageHosts);
const WIDTHS: Record<MarkdownImageVariant, readonly number[]> = {
  article: [640, 750, 828, 1080],
  comment: [384, 640],
};
const SIZES: Record<MarkdownImageVariant, string> = {
  article: "(max-width: 768px) calc(100vw - 40px), 768px",
  comment: "(max-width: 280px) calc(100vw - 40px), 240px",
};

export function isGifImageUrl(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

function isOptimizableRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && !isGifImageUrl(src);
  } catch {
    return false;
  }
}

function nextImageUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

const HTML_ENTITY_PATTERN = /&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt));/gi;
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeHtmlAttribute(value: string): string {
  return value.replace(
    HTML_ENTITY_PATTERN,
    (entity: string, decimal?: string, hexadecimal?: string, named?: string) => {
      if (named) return NAMED_ENTITIES[named.toLowerCase()] ?? entity;
      const codePoint = Number.parseInt(decimal ?? hexadecimal ?? "", hexadecimal ? 16 : 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function setHtmlAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, "i");
  const attribute = ` ${name}="${escapeHtmlAttribute(value)}"`;
  return pattern.test(tag)
    ? tag.replace(pattern, attribute)
    : tag.replace(/\s*\/?>$/, (closing) => `${attribute}${closing}`);
}

export function optimizeMarkdownImages(html: string, variant: MarkdownImageVariant): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const sourceMatch = tag.match(/\ssrc=(['"])([\s\S]*?)\1/i);
    if (!sourceMatch?.[2]) return tag;
    const originalSrc = decodeHtmlAttribute(sourceMatch[2]);
    if (!isOptimizableRemoteImage(originalSrc)) return tag;

    const widths = WIDTHS[variant];
    const sourceSet = widths
      .map((width) => `${nextImageUrl(originalSrc, width)} ${width}w`)
      .join(", ");
    let optimizedTag = setHtmlAttribute(tag, "src", nextImageUrl(originalSrc, widths.at(-1)!));
    optimizedTag = setHtmlAttribute(optimizedTag, "srcset", sourceSet);
    optimizedTag = setHtmlAttribute(optimizedTag, "sizes", SIZES[variant]);
    optimizedTag = setHtmlAttribute(optimizedTag, "loading", "lazy");
    optimizedTag = setHtmlAttribute(optimizedTag, "decoding", "async");
    optimizedTag = setHtmlAttribute(optimizedTag, "data-original-src", originalSrc);
    return setHtmlAttribute(optimizedTag, "data-md-image-optimized", "true");
  });
}
```

不要使用 `DOMParser`，保证服务端渲染和客户端 hydration 得到完全相同的 HTML。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `pnpm --filter web exec vitest --run lib/markdown-image-optimizer.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交纯函数与配置**

```bash
git add apps/web/config/optimized-image-hosts.json apps/web/lib/markdown-image-optimizer.ts apps/web/lib/markdown-image-optimizer.test.ts apps/web/next.config.mjs
git commit -m "perf(images): 新增 Markdown 响应式图片地址"
```

### Task 2: 为 Markdown 优化图增加重试和原图回退

**Files:**

- Create: `packages/markdown/src/image-retry.ts`
- Modify: `packages/markdown/src/image-fallback.ts`
- Modify: `packages/markdown/src/markdown-content.tsx`
- Modify: `packages/markdown/src/markdown-content.test.tsx`

- [ ] **Step 1: 写预览原图和三次重试后回退的失败测试**

在现有测试中新增：

```tsx
it("优化图片点击预览时使用原图地址", () => {
  const onImagePreview = vi.fn();
  const original = "https://blog-oss.yevpt.com/original.jpg";
  render(
    <MarkdownContent
      html={`<img src="/_next/image?url=x&w=640&q=75" data-original-src="${original}" data-md-image-optimized="true" alt="图">`}
      onImagePreview={onImagePreview}
    />,
  );
  fireEvent.click(screen.getByAltText("图"));
  expect(onImagePreview).toHaveBeenCalledWith([{ src: original, alt: "图" }], 0);
});

it("优化地址失败重试三次后回退原图，原图失败后才显示占位", () => {
  vi.useFakeTimers();
  const original = "https://blog-oss.yevpt.com/original.jpg";
  const { container } = render(
    <MarkdownContent
      variant="comment"
      html={`<img src="/_next/image?url=x&w=640&q=75" data-original-src="${original}" data-md-image-optimized="true" alt="图">`}
    />,
  );
  const image = screen.getByAltText("图") as HTMLImageElement;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    fireEvent.error(image);
    act(() => vi.advanceTimersByTime(1500));
    expect(image.src).toContain(`md_retry=${attempt}`);
  }
  fireEvent.error(image);
  expect(image.src).toBe(original);
  expect(container.querySelector(".md-image-fallback")).toBeNull();

  fireEvent.error(image);
  expect(container.querySelector(".md-image-fallback")).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter @repo/markdown exec vitest --run src/markdown-content.test.tsx`

Expected: FAIL，预览仍返回优化地址，且首次错误直接出现占位。

- [ ] **Step 3: 实现与 Next 无关的重试绑定**

在 `image-retry.ts` 实现：

```ts
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function withRetryAttempt(src: string, attempt: number): string {
  const url = new URL(src, document.baseURI);
  url.searchParams.set("md_retry", String(attempt));
  return url.href;
}

export function attachMarkdownImageRetries(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const images = container.querySelectorAll<HTMLImageElement>(
    'img[data-md-image-optimized="true"][data-original-src]',
  );

  for (const image of images) {
    const originalSrc = image.dataset.originalSrc;
    if (!originalSrc) continue;
    let retrySource: string | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let usingOriginal = false;

    const handleError = (event: Event) => {
      if (usingOriginal) return;
      event.stopImmediatePropagation();
      if (retryTimer) return;

      retrySource ??= image.currentSrc || image.src;
      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        retryTimer = setTimeout(() => {
          retryTimer = null;
          image.src = withRetryAttempt(retrySource!, retryCount);
        }, RETRY_DELAY_MS);
        return;
      }

      usingOriginal = true;
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = originalSrc;
    };

    image.addEventListener("error", handleError);
    cleanups.push(() => {
      image.removeEventListener("error", handleError);
      if (retryTimer) clearTimeout(retryTimer);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
```

在 `MarkdownContent` 中把重试 effect 放在原有坏图占位 effect 之前，并返回 cleanup：

```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  return attachMarkdownImageRetries(container);
}, [html]);
```

预览图片映射改为：

```ts
src: el.dataset.originalSrc || el.currentSrc || el.src,
```

`attachMarkdownImageFallbacks` 的同步坏图检查增加 `!img.dataset.mdImageOptimized` 条件，避免浏览器尚未开始请求就提前替换。

- [ ] **Step 4: 运行 Markdown 测试并确认 GREEN**

Run: `pnpm --filter @repo/markdown exec vitest --run src/markdown-content.test.tsx`

Expected: PASS，且 fake timer 测试结束后无残留 timer 警告。

- [ ] **Step 5: 提交 Markdown 重试逻辑**

```bash
git add packages/markdown/src/image-retry.ts packages/markdown/src/image-fallback.ts packages/markdown/src/markdown-content.tsx packages/markdown/src/markdown-content.test.tsx
git commit -m "fix(markdown): 增加优化图片重试与原图回退"
```

### Task 3: 在 Web Markdown 入口接入优化

**Files:**

- Modify: `apps/web/components/common/previewable-markdown.tsx`
- Modify: `apps/web/components/common/previewable-markdown.test.tsx`

- [ ] **Step 1: 写 Web 集成失败测试**

新增白名单图片展示优化地址、点击仍打开原图，以及 GIF 保持直连的测试：

```tsx
it("白名单图片展示优化地址但预览使用原图", () => {
  const original = "https://blog-oss.yevpt.com/posts/a.jpg";
  render(<PreviewableMarkdown html={`<p><img src="${original}" alt="封图"></p>`} />);
  const image = screen.getByAltText("封图") as HTMLImageElement;
  expect(image.src).toContain("/_next/image?url=");
  fireEvent.click(image);
  expect(useImageViewer.getState().images[0]).toEqual({ src: original, alt: "封图" });
});

it("GIF 保持原图直连", () => {
  const gif = "https://blog-oss.yevpt.com/posts/a.gif?v=1";
  render(<PreviewableMarkdown html={`<img src="${gif}" alt="动图">`} />);
  expect(screen.getByAltText("动图")).toHaveAttribute("src", gif);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter web exec vitest --run components/common/previewable-markdown.test.tsx`

Expected: FAIL，白名单图片仍为原始地址。

- [ ] **Step 3: 用 `useMemo` 接入同步 HTML 改写**

```tsx
export function PreviewableMarkdown({
  html,
  variant = "article",
  ...props
}: Omit<MarkdownContentProps, "onImagePreview">) {
  const open = useImageViewer((state) => state.open);
  const optimizedHtml = useMemo(() => optimizeMarkdownImages(html, variant), [html, variant]);
  return (
    <MarkdownContent {...props} html={optimizedHtml} variant={variant} onImagePreview={open} />
  );
}
```

保持 `Props` 为 `Omit<MarkdownContentProps, "onImagePreview">`，不要扩大公共 API。

- [ ] **Step 4: 运行 Web Markdown 测试并确认 GREEN**

Run: `pnpm --filter web exec vitest --run components/common/previewable-markdown.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交入口接入**

```bash
git add apps/web/components/common/previewable-markdown.tsx apps/web/components/common/previewable-markdown.test.tsx
git commit -m "perf(markdown): 启用响应式图片优化"
```

### Task 4: 启用首页轮播图片优化并保留 GIF

**Files:**

- Modify: `apps/web/components/featured/featured-carousel-slide.tsx`
- Modify: `apps/web/components/featured/featured-carousel.test.tsx`

- [ ] **Step 1: 把旧的“不优化”断言改为新的失败测试**

扩展 `next/image` mock，使其输出 `data-fill` 和 `data-sizes`。将旧测试改为断言普通封面没有 `unoptimized`，并增加 GIF post 断言：

```tsx
it("普通轮播封面启用 Next 优化并保持等比裁切配置", () => {
  render(<FeaturedCarousel posts={mockPosts} />);
  const images = screen.getAllByRole("img");
  expect(images.every((image) => image.getAttribute("data-unoptimized") !== "true")).toBe(true);
  expect(images.every((image) => image.getAttribute("data-fill") === "true")).toBe(true);
  expect(images.every((image) => image.className.includes("object-cover"))).toBe(true);
  expect(images.every((image) => image.getAttribute("data-sizes") !== null)).toBe(true);
});

it("GIF 轮播封面跳过 Next 优化", () => {
  const gifPost = { ...mockPosts[0]!, coverImage: "https://blog-oss.yevpt.com/hero.GIF?v=1" };
  render(<FeaturedCarousel posts={[gifPost]} />);
  expect(
    screen.getAllByRole("img").every((image) => image.getAttribute("data-unoptimized") === "true"),
  ).toBe(true);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter web exec vitest --run components/featured/featured-carousel.test.tsx`

Expected: FAIL，普通封面仍带 `data-unoptimized="true"`。

- [ ] **Step 3: 最小修改轮播图片 props**

```tsx
<LoadingImage
  src={post.coverImage}
  alt={post.title}
  fill
  fallbackUnoptimized
  unoptimized={isGifImageUrl(post.coverImage) || undefined}
  sizes="(max-width: 768px) 100vw, 55vw"
  className={cn("object-cover", ...)}
/>
```

不得改变轮播容器高度、`fill`、`sizes` 或 `object-cover`，以保持当前等比裁切铺满效果。

- [ ] **Step 4: 运行轮播和 `LoadingImage` 测试并确认 GREEN**

Run: `pnpm --filter web exec vitest --run components/featured/featured-carousel.test.tsx components/common/loading-image.test.tsx`

Expected: PASS；现有 `LoadingImage` 三次优化器重试后原图回退测试继续通过。

- [ ] **Step 5: 提交轮播改动**

```bash
git add apps/web/components/featured/featured-carousel-slide.tsx apps/web/components/featured/featured-carousel.test.tsx
git commit -m "perf(carousel): 启用封面图片优化"
```

### Task 5: 全量验证

**Files:**

- Verify only

- [ ] **Step 1: 运行相关包测试**

Run: `pnpm --filter @repo/markdown test && pnpm --filter web test`

Expected: 全部 PASS，无未处理的 React 警告。

- [ ] **Step 2: 运行类型检查**

Run: `pnpm --filter @repo/markdown check-types && pnpm --filter web check-types`

Expected: 两个命令退出码均为 0。

- [ ] **Step 3: 运行 lint 和差异检查**

Run: `pnpm --filter @repo/markdown lint && pnpm --filter web lint && git diff --check`

Expected: 全部退出码为 0。

- [ ] **Step 4: 检查工作区范围**

Run: `git status --short && git log -6 --oneline`

Expected: 仅包含本计划对应文件和提交，不混入无关改动。
