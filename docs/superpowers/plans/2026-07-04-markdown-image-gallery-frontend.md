# 文章正文多图轮播 — 前台渲染实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** markdown 正文中相邻的纯图片段落在文章详情页渲染为局部轮播(scroll-snap + 翻页按钮 + 指示点),不影响其他 markdown 场景。

**Architecture:** 在 `packages/markdown` 的 unified 渲染管线新增 rehype 插件(sanitize 之后)把相邻纯图片段落包裹为 `.md-gallery` 静态 HTML;滑动由 CSS scroll-snap 实现;翻页/指示点/键盘由 `markdown-interactions` 里的 DOM 绑定驱动(与 `.md-copy-btn` 同模式)。仅文章详情页通过 `MarkdownRenderOptions.groupImageGalleries` 启用。

**Tech Stack:** unified/rehype (hast)、原生 DOM、CSS scroll-snap、Vitest。

**Spec:** `docs/superpowers/specs/2026-07-03-markdown-image-gallery-design.md`(先通读)

## Global Constraints

- 先读仓库根 `AGENTS.md` 与 `.claude/skills/writing-tests/SKILL.md`、`.claude/skills/git-commit/SKILL.md`。
- TypeScript 禁 `any`;非显然逻辑写中文注释;纯函数 + Early Return。
- 每个 task 必须带测试,测试先行(TDD);commit message 由 `commit-msg` 钩子强校验,格式见各 task。
- 测试命令:`pnpm --filter @repo/markdown test`(包内全部)/ `pnpm --filter @repo/markdown test src/xxx.test.ts`(单文件);`packages/markdown` 测试环境为根默认 happy-dom。
- **成组契约(与编辑器计划共享,不得擅改)**:仅当「纯图片段落」直接相邻(之间只有空白文本节点,不含 `&nbsp;`/` `)时合并;任何非图片块(文字段落、仅含 ` ` 的段落等)阻断成组。纯图片段落 = `<p>` 内只有 `img`、`br`、纯空白文本(不含 ` `),且至少 1 张 `img`。
- 若实现中发现计划与真实 API/行为冲突,停下来在产出报告中说明,不要擅自改架构。

---

### Task 1: 异步渲染管线保留多余空行间距(契约前置修复)

**背景:** `markdownToHtmlSync` 会先执行 `expandExtraBlankLines`(3+ 连续换行 → `&nbsp;` 段落),但异步 `markdownToHtml`(文章详情页所用)没有。若不修,作者在编辑器里用空段落隔开两张图,序列化成多个空行后会被 remark 折叠,两图在文章页重新相邻 → 被误合并成轮播。此修复同时统一了文章与评论的空行渲染行为。

**Files:**

- Modify: `packages/markdown/src/render.ts:315-320`(`markdownToHtml`)
- Test: `packages/markdown/src/render.test.ts`(追加用例)

**Interfaces:**

- Produces: `markdownToHtml` 对 3+ 连续换行输出 `<p>&nbsp;</p>` 间隔段落,行为与 `markdownToHtmlSync` 一致。

- [x] **Step 1: 写失败测试**

在 `packages/markdown/src/render.test.ts` 追加:

```ts
it("异步 markdownToHtml 与同步版一致地保留多余空行间距", async () => {
  const markdown = "第一段\n\n\n\n第二段";
  const html = await markdownToHtml(markdown);
  expect(html).toBe(markdownToHtmlSync(markdown));
  // 存在 nbsp 间隔段落（rehype-stringify 的实体化形式以实际输出为准，必要时微调该正则）
  expect(html).toMatch(/<p>(\u00a0|&#xA0;|&nbsp;)<\/p>/);
});
```

确认文件顶部已 import `markdownToHtml`(该文件现有用例若只测了 sync,需补 import)。

- [x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/markdown test src/render.test.ts`
Expected: 新用例 FAIL(async 输出无 nbsp 段落)。

- [x] **Step 3: 实现**

`render.ts` 中 `markdownToHtml` 改为:

```ts
/** 异步版 Markdown → HTML，供服务端/SSR 使用（如文章详情页）。 */
export async function markdownToHtml(
  markdown: string,
  options?: MarkdownRenderOptions,
): Promise<string> {
  // 与同步版保持一致：多余空行折叠前先转为 nbsp 段落，保留作者的段间距意图
  const input = expandExtraBlankLines(markdown);
  return String(await buildPipeline(options).process(input));
}
```

- [x] **Step 4: 跑包内全部测试确认通过(含既有快照类用例无回归)**

Run: `pnpm --filter @repo/markdown test`
Expected: PASS。若既有用例因空行行为变化而失败,逐个检查:预期内的行为统一(async 多了 nbsp 段落)可更新用例断言,其他失败必须修复实现。

- [x] **Step 5: Commit**

```bash
git add packages/markdown/src/render.ts packages/markdown/src/render.test.ts
git commit -m "fix(markdown): 异步渲染管线同样保留多余空行段间距"
```

---

### Task 2: rehype 图片轮播分组插件

**Files:**

- Create: `packages/markdown/src/image-gallery.ts`
- Modify: `packages/markdown/src/render.ts`(选项 + 挂插件)
- Test: `packages/markdown/src/image-gallery.test.ts`

**Interfaces:**

- Produces:
  - `rehypeImageGallery(): (tree: Root) => void` — rehype 插件;
  - 类名常量:`MD_GALLERY_CLASS = "md-gallery"`、`MD_GALLERY_TRACK_CLASS = "md-gallery-track"`、`MD_GALLERY_SLIDE_CLASS = "md-gallery-slide"`、`MD_GALLERY_NAV_CLASS = "md-gallery-nav"`、`MD_GALLERY_PREV_CLASS = "md-gallery-prev"`、`MD_GALLERY_NEXT_CLASS = "md-gallery-next"`、`MD_GALLERY_DOTS_CLASS = "md-gallery-dots"`、`MD_GALLERY_DOT_CLASS = "md-gallery-dot"`、`MD_GALLERY_DOT_ACTIVE_CLASS = "is-active"`、`MD_GALLERY_COUNTER_CLASS = "md-gallery-counter"`(Task 3/4 依赖这些常量);
  - `MarkdownRenderOptions.groupImageGalleries?: boolean`(Task 5 依赖)。
- 输出 HTML 结构(Task 3 的绑定与 Task 4 的 CSS 都依赖此结构):

```html
<div class="md-gallery" data-count="N">
  <div class="md-gallery-track" tabindex="0" role="region" aria-roledescription="轮播" aria-label="图片轮播，共 N 张">
    <figure class="md-gallery-slide"><img …></figure> <!-- ×N -->
  </div>
  <button class="md-gallery-nav md-gallery-prev" type="button" aria-label="上一张"><svg …></button>
  <button class="md-gallery-nav md-gallery-next" type="button" aria-label="下一张"><svg …></button>
  <div class="md-gallery-dots"><button class="md-gallery-dot is-active" type="button" data-index="0" aria-label="跳转到第 1 张"></button>…</div>
  <span class="md-gallery-counter">1/N</span>
</div>
```

- [x] **Step 1: 写失败测试**

创建 `packages/markdown/src/image-gallery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { markdownToHtmlSync } from "./render";

const opts = { groupImageGalleries: true } as const;

describe("rehypeImageGallery 相邻图片分组", () => {
  it("相邻两个纯图片段落合并为一个轮播", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
    expect((html.match(/md-gallery-slide/g) ?? []).length).toBe(2);
    expect(html).toContain("md-gallery-prev");
    expect(html).toContain("md-gallery-next");
    expect((html.match(/md-gallery-dot\b/g) ?? []).length).toBe(2);
    expect(html).toContain(">1/2<");
    // 原图片不丢失
    expect(html).toContain('src="/img/1.png"');
    expect(html).toContain('src="/img/2.png"');
  });

  it("单段落内多张图（软换行分隔）也成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
  });

  it("段落 + 段内混排的连续图片合并进同一个轮播", () => {
    const html = markdownToHtmlSync(
      "![一](/img/1.png)\n![二](/img/2.png)\n\n![三](/img/3.png)",
      opts,
    );
    expect(html).toContain('data-count="3"');
    expect((html.match(/md-gallery"/g) ?? []).length).toBe(1);
  });

  it("单张图片不成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间有文字段落时不成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n中间说明\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间的 nbsp 空段落阻断成组（作者显式拆开）", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n&nbsp;\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间的多余空行（经 expandExtraBlankLines）阻断成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片与文字同段时该段不算纯图片段落", () => {
    const html = markdownToHtmlSync("![一](/img/1.png) 后面有字\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("未开启选项时不分组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n![二](/img/2.png)");
    expect(html).not.toContain("md-gallery");
  });

  it("blockquote 内相邻图片同样成组", () => {
    const html = markdownToHtmlSync("> ![一](/img/1.png)\n>\n> ![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/markdown test src/image-gallery.test.ts`
Expected: FAIL(选项不存在/无 md-gallery 输出)。

- [x] **Step 3: 实现 `image-gallery.ts`**

```ts
import type { Element, ElementContent, Properties, Root, RootContent } from "hast";

export const MD_GALLERY_CLASS = "md-gallery";
export const MD_GALLERY_TRACK_CLASS = "md-gallery-track";
export const MD_GALLERY_SLIDE_CLASS = "md-gallery-slide";
export const MD_GALLERY_NAV_CLASS = "md-gallery-nav";
export const MD_GALLERY_PREV_CLASS = "md-gallery-prev";
export const MD_GALLERY_NEXT_CLASS = "md-gallery-next";
export const MD_GALLERY_DOTS_CLASS = "md-gallery-dots";
export const MD_GALLERY_DOT_CLASS = "md-gallery-dot";
export const MD_GALLERY_DOT_ACTIVE_CLASS = "is-active";
export const MD_GALLERY_COUNTER_CLASS = "md-gallery-counter";

// 注意：故意不含  （nbsp）——仅含 nbsp 的段落是作者显式的「拆组」间隔
const IGNORABLE_TEXT_PATTERN = /^[ \t\r\n\f]*$/;

function isIgnorableText(node: RootContent | ElementContent): boolean {
  return node.type === "text" && IGNORABLE_TEXT_PATTERN.test(node.value);
}

/** 纯图片段落：<p> 内只有 img/br/纯空白文本，且至少 1 张 img；否则返回 null。 */
function extractParagraphImages(node: RootContent): Element[] | null {
  if (node.type !== "element" || node.tagName !== "p") return null;
  const images: Element[] = [];
  for (const child of node.children) {
    if (child.type === "element" && child.tagName === "img") {
      images.push(child);
      continue;
    }
    if (child.type === "element" && child.tagName === "br") continue;
    if (isIgnorableText(child)) continue;
    return null;
  }
  return images.length > 0 ? images : null;
}

// SVG：左右翻页箭头（与 render.ts 中 codeIconSvg 同风格的 hast 构造）
function chevronSvg(direction: "left" | "right"): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as Properties,
    children: [
      {
        type: "element",
        tagName: "polyline",
        properties: {
          points: direction === "left" ? "10 4 6 8 10 12" : "6 4 10 8 6 12",
        } as Properties,
        children: [],
      },
    ],
  };
}

function buildNavButton(direction: "prev" | "next"): Element {
  return {
    type: "element",
    tagName: "button",
    properties: {
      className: [
        MD_GALLERY_NAV_CLASS,
        direction === "prev" ? MD_GALLERY_PREV_CLASS : MD_GALLERY_NEXT_CLASS,
      ],
      type: "button",
      ariaLabel: direction === "prev" ? "上一张" : "下一张",
    } as Properties,
    children: [chevronSvg(direction === "prev" ? "left" : "right")],
  };
}

function buildGallery(images: Element[]): Element {
  const slides: ElementContent[] = images.map((img) => ({
    type: "element",
    tagName: "figure",
    properties: { className: [MD_GALLERY_SLIDE_CLASS] } as Properties,
    children: [img],
  }));
  const dots: ElementContent[] = images.map((_, index) => ({
    type: "element",
    tagName: "button",
    properties: {
      className:
        index === 0 ? [MD_GALLERY_DOT_CLASS, MD_GALLERY_DOT_ACTIVE_CLASS] : [MD_GALLERY_DOT_CLASS],
      type: "button",
      dataIndex: String(index),
      ariaLabel: `跳转到第 ${index + 1} 张`,
    } as Properties,
    children: [],
  }));

  return {
    type: "element",
    tagName: "div",
    properties: { className: [MD_GALLERY_CLASS], dataCount: String(images.length) } as Properties,
    children: [
      {
        type: "element",
        tagName: "div",
        properties: {
          className: [MD_GALLERY_TRACK_CLASS],
          tabIndex: 0,
          role: "region",
          ariaRoledescription: "轮播",
          ariaLabel: `图片轮播，共 ${images.length} 张`,
        } as Properties,
        children: slides,
      },
      buildNavButton("prev"),
      buildNavButton("next"),
      {
        type: "element",
        tagName: "div",
        properties: { className: [MD_GALLERY_DOTS_CLASS] } as Properties,
        children: dots,
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: [MD_GALLERY_COUNTER_CLASS] } as Properties,
        children: [{ type: "text", value: `1/${images.length}` }],
      },
    ],
  };
}

interface GalleryRun {
  start: number;
  end: number;
  images: Element[];
}

/** 把 parent.children 中相邻的纯图片段落 run（总图数 ≥2）替换为轮播结构。 */
function processChildren(parent: Root | Element): void {
  const runs: GalleryRun[] = [];
  let current: GalleryRun | null = null;

  for (let index = 0; index < parent.children.length; index++) {
    const child = parent.children[index];
    const images = extractParagraphImages(child);
    if (images) {
      if (current) {
        current.end = index;
        current.images.push(...images);
      } else {
        current = { start: index, end: index, images: [...images] };
      }
      continue;
    }
    // 块与块之间的换行文本不打断 run（后续若再遇到图片段落则被并入替换区间）
    if (current && isIgnorableText(child)) continue;
    if (current) {
      runs.push(current);
      current = null;
    }
  }
  if (current) runs.push(current);

  // 倒序替换，避免 splice 造成 index 错位
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    if (run.images.length < 2) continue;
    parent.children.splice(run.start, run.end - run.start + 1, buildGallery(run.images));
  }
}

// 除段落外可能直接包含纯图片段落的块级容器
const BLOCK_CONTAINER_TAGS = new Set(["blockquote", "li", "div", "section"]);

/** rehype 插件：相邻纯图片段落合并为 .md-gallery 轮播结构（需在 sanitize 之后运行）。 */
export function rehypeImageGallery() {
  return (tree: Root) => {
    const walk = (node: Root | Element): void => {
      for (const child of node.children) {
        if (child.type === "element") walk(child);
      }
      if (node.type === "root" || BLOCK_CONTAINER_TAGS.has(node.tagName)) {
        processChildren(node);
      }
    };
    walk(tree);
  };
}
```

- [x] **Step 4: 接入 `render.ts`**

`MarkdownRenderOptions` 追加字段:

```ts
  /**
   * 文章场景：相邻的「纯图片段落」合并为局部轮播（.md-gallery）。
   * 仅文章详情启用；评论/摘录不开。成组契约详见 image-gallery.ts。
   */
  groupImageGalleries?: boolean;
```

`buildPipeline` 中,在 `treatLinksAsUgc` 分支之后、`rehypeStringify` 之前加(顶部 import `rehypeImageGallery`):

```ts
if (options.groupImageGalleries) {
  // 必须在 sanitize 之后：插件生成的 button/svg 是可信结构，不能被 schema 剥掉
  processor.use(rehypeImageGallery);
}
```

- [x] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @repo/markdown test`
Expected: 全部 PASS。若 `blockquote 内相邻图片` 用例因 remark 对 `>` 空行解析差异失败,先打印实际 HTML 检查:若 blockquote 内两图落在同一段落(软换行),该用例断言仍应成立;若被拆成两个 blockquote,调整用例的 markdown 写法为 `> ![一](/img/1.png)\n> \n> ![二](/img/2.png)`,不得删除用例。

- [x] **Step 6: Commit**

```bash
git add packages/markdown/src/image-gallery.ts packages/markdown/src/image-gallery.test.ts packages/markdown/src/render.ts
git commit -m "feat(markdown): 相邻图片段落合并为轮播的 rehype 插件"
```

---

### Task 3: 轮播交互绑定(翻页/指示点/键盘)

**Files:**

- Create: `packages/markdown/src/image-gallery-interactions.ts`
- Modify: `packages/markdown/src/markdown-interactions.ts`
- Test: `packages/markdown/src/image-gallery-interactions.test.ts`

**Interfaces:**

- Consumes: Task 2 的类名常量与 HTML 结构。
- Produces: `bindMarkdownImageGalleries(container: HTMLElement): () => void` — 由 `bindMarkdownContentInteractions` 调用,返回清理函数。

- [x] **Step 1: 写失败测试**

创建 `packages/markdown/src/image-gallery-interactions.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markdownToHtmlSync } from "./render";
import { bindMarkdownImageGalleries } from "./image-gallery-interactions";
import { bindMarkdownContentInteractions } from "./markdown-interactions";

const TRACK_WIDTH = 600;

/** 渲染两图轮播并补齐 happy-dom 缺失的布局/滚动能力 */
function setupGallery(markdown = "![一](/img/1.png)\n\n![二](/img/2.png)") {
  const container = document.createElement("div");
  container.innerHTML = markdownToHtmlSync(markdown, { groupImageGalleries: true });
  document.body.appendChild(container);

  const track = container.querySelector<HTMLElement>(".md-gallery-track");
  if (!track) throw new Error("md-gallery-track 不存在");
  Object.defineProperty(track, "clientWidth", { value: TRACK_WIDTH, configurable: true });
  let scrollLeft = 0;
  Object.defineProperty(track, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });
  // happy-dom 无 Element.scrollTo：桩实现 = 赋值 + 触发 scroll 事件
  Object.defineProperty(track, "scrollTo", {
    configurable: true,
    value: (options: ScrollToOptions) => {
      scrollLeft = options.left ?? 0;
      track.dispatchEvent(new Event("scroll"));
    },
  });
  return { container, track };
}

beforeEach(() => {
  // rAF 立即执行，保证指示点同步是同步断言
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("bindMarkdownImageGalleries", () => {
  it("点击下一张：滚动一屏、计数与指示点同步、末页禁用下一张", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);

    const next = container.querySelector<HTMLButtonElement>(".md-gallery-next");
    const prev = container.querySelector<HTMLButtonElement>(".md-gallery-prev");
    const counter = container.querySelector(".md-gallery-counter");
    expect(prev?.disabled).toBe(true);

    next?.click();
    expect(counter?.textContent).toBe("2/2");
    expect(next?.disabled).toBe(true);
    expect(prev?.disabled).toBe(false);
    const dots = container.querySelectorAll(".md-gallery-dot");
    expect(dots[1]?.classList.contains("is-active")).toBe(true);
    expect(dots[0]?.classList.contains("is-active")).toBe(false);
    cleanup();
  });

  it("点击指示点跳转到对应页", () => {
    const { container } = setupGallery(
      "![一](/img/1.png)\n\n![二](/img/2.png)\n\n![三](/img/3.png)",
    );
    const cleanup = bindMarkdownImageGalleries(container);
    const dots = container.querySelectorAll<HTMLButtonElement>(".md-gallery-dot");
    dots[2]?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("3/3");
    cleanup();
  });

  it("track 上左右方向键翻页", () => {
    const { container, track } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);
    track.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("2/2");
    track.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("1/2");
    cleanup();
  });

  it("清理函数解绑事件", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);
    cleanup();
    container.querySelector<HTMLButtonElement>(".md-gallery-next")?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("1/2");
  });

  it("bindMarkdownContentInteractions 集成绑定轮播", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownContentInteractions(container);
    container.querySelector<HTMLButtonElement>(".md-gallery-next")?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("2/2");
    cleanup();
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/markdown test src/image-gallery-interactions.test.ts`
Expected: FAIL(模块不存在)。

- [x] **Step 3: 实现 `image-gallery-interactions.ts`**

```ts
import {
  MD_GALLERY_CLASS,
  MD_GALLERY_COUNTER_CLASS,
  MD_GALLERY_DOT_ACTIVE_CLASS,
  MD_GALLERY_DOT_CLASS,
  MD_GALLERY_NEXT_CLASS,
  MD_GALLERY_PREV_CLASS,
  MD_GALLERY_TRACK_CLASS,
} from "./image-gallery";

function bindGallery(gallery: HTMLElement): () => void {
  const track = gallery.querySelector<HTMLElement>(`.${MD_GALLERY_TRACK_CLASS}`);
  if (!track) return () => undefined;

  const prev = gallery.querySelector<HTMLButtonElement>(`.${MD_GALLERY_PREV_CLASS}`);
  const next = gallery.querySelector<HTMLButtonElement>(`.${MD_GALLERY_NEXT_CLASS}`);
  const dots = Array.from(gallery.querySelectorAll<HTMLButtonElement>(`.${MD_GALLERY_DOT_CLASS}`));
  const counter = gallery.querySelector<HTMLElement>(`.${MD_GALLERY_COUNTER_CLASS}`);
  const count = dots.length || Number(gallery.dataset.count) || 1;

  const currentIndex = () => {
    const width = track.clientWidth;
    if (width <= 0) return 0;
    return Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width)));
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.min(count - 1, Math.max(0, index));
    const left = clamped * track.clientWidth;
    // 测试环境（happy-dom）的元素可能没有 scrollTo
    if (typeof track.scrollTo === "function") {
      track.scrollTo({ left, behavior: "smooth" });
    } else {
      track.scrollLeft = left;
    }
  };

  const update = () => {
    const index = currentIndex();
    dots.forEach((dot, i) => dot.classList.toggle(MD_GALLERY_DOT_ACTIVE_CLASS, i === index));
    if (counter) counter.textContent = `${index + 1}/${count}`;
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= count - 1;
  };

  // 滚动同步用 rAF 节流；无 rAF 环境（极少数测试场景）直接同步更新
  let scheduled = false;
  const handleScroll = () => {
    if (typeof requestAnimationFrame !== "function") {
      update();
      return;
    }
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  const handlePrev = () => scrollToIndex(currentIndex() - 1);
  const handleNext = () => scrollToIndex(currentIndex() + 1);
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
    }
  };
  const dotHandlers = dots.map((dot, index) => {
    const handler = () => scrollToIndex(index);
    dot.addEventListener("click", handler);
    return handler;
  });

  track.addEventListener("scroll", handleScroll, { passive: true });
  track.addEventListener("keydown", handleKeydown);
  prev?.addEventListener("click", handlePrev);
  next?.addEventListener("click", handleNext);
  update();

  return () => {
    track.removeEventListener("scroll", handleScroll);
    track.removeEventListener("keydown", handleKeydown);
    prev?.removeEventListener("click", handlePrev);
    next?.removeEventListener("click", handleNext);
    dots.forEach((dot, index) => dot.removeEventListener("click", dotHandlers[index]));
  };
}

/** 为容器内所有 .md-gallery 绑定翻页/指示点/键盘交互，返回统一清理函数。 */
export function bindMarkdownImageGalleries(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const galleries = container.querySelectorAll<HTMLElement>(`.${MD_GALLERY_CLASS}`);
  for (const gallery of galleries) {
    // 防止 effects 依赖变化时重复绑定（与 image-skeleton 的 dataset 守卫同思路）
    if (gallery.dataset.mdGalleryBound === "true") continue;
    gallery.dataset.mdGalleryBound = "true";
    const unbind = bindGallery(gallery);
    cleanups.push(() => {
      delete gallery.dataset.mdGalleryBound;
      unbind();
    });
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
```

- [x] **Step 4: 接入 `markdown-interactions.ts`**

顶部 import,并在 `cleanups.push(bindMarkdownImageSkeletons(container));` 之前插入一行:

```ts
import { bindMarkdownImageGalleries } from "./image-gallery-interactions";
// …bindMarkdownContentInteractions 内：
cleanups.push(bindMarkdownImageGalleries(container));
```

- [x] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @repo/markdown test`
Expected: 全部 PASS(注意 `markdown-interactions` 既有用例不回归;点击轮播按钮不得触发 `onImagePreview` —— `closest("img")` 不会匹配按钮,如有失败按此排查)。

- [x] **Step 6: Commit**

```bash
git add packages/markdown/src/image-gallery-interactions.ts packages/markdown/src/image-gallery-interactions.test.ts packages/markdown/src/markdown-interactions.ts
git commit -m "feat(markdown): 轮播翻页与指示点交互绑定"
```

---

### Task 4: 轮播样式(packages/styles)

**Files:**

- Modify: `packages/styles/src/base.css`(文件末尾追加一节;该文件已有 `.md-code-wrapper` 等 markdown 结构样式,风格保持一致)

**Interfaces:**

- Consumes: Task 2 的 HTML 结构与类名。
- 说明:滑动本体、slide 尺寸、按钮/指示点/计数覆盖层全在这里;`prose` 对 `figure`/`img` 的默认样式使用 `:where()` 零优先级选择器,普通类选择器即可覆盖,不需要 `!important`。

- [x] **Step 1: 追加样式**

在 `base.css` 末尾(或 markdown 相关样式区块之后)追加:

```css
/* ── Markdown 正文图片轮播（结构由 @repo/markdown rehypeImageGallery 生成） ── */
.md-gallery {
  position: relative;
  margin: 2rem 0;
}

.md-gallery-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  border-radius: 1rem;
}

.md-gallery-track::-webkit-scrollbar {
  display: none;
}

.md-gallery-slide {
  flex: 0 0 100%;
  min-width: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

/* 图片骨架包裹层（.md-image-wrapper）在 slide 内占满宽度 */
.md-gallery-slide .md-image-wrapper {
  display: block;
  width: 100%;
}

.md-gallery-slide img {
  margin: 0;
  max-height: 70vh;
  width: 100%;
  object-fit: contain;
}

.md-gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* 悬停/键盘聚焦时才显示按钮；触屏无 hover，靠滑动手势与指示点 */
.md-gallery:hover .md-gallery-nav,
.md-gallery-nav:focus-visible {
  opacity: 1;
}

.md-gallery-nav:disabled {
  opacity: 0 !important;
  pointer-events: none;
}

.md-gallery-prev {
  left: 0.75rem;
}

.md-gallery-next {
  right: 0.75rem;
}

.md-gallery-dots {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.375rem;
}

.md-gallery-dot {
  width: 0.375rem;
  height: 0.375rem;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition:
    background 0.2s ease,
    width 0.2s ease;
}

.md-gallery-dot.is-active {
  width: 1rem;
  background: #fff;
}

.md-gallery-counter {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.25;
}
```

- [x] **Step 2: 跑 styles 包测试(若 `base.test.ts` 对 css 有结构断言需保持通过)**

Run: `pnpm --filter @repo/styles test`
Expected: PASS(若该包无 test script,跳过并在报告中注明)。

- [x] **Step 3: Commit**

```bash
git add packages/styles/src/base.css
git commit -m "feat(styles): 正文图片轮播样式"
```

---

### Task 5: 文章详情页启用轮播

**Files:**

- Modify: `apps/web/lib/article-markdown-html.ts`
- Test: `apps/web/lib/article-markdown-html.test.ts`(追加用例)

**Interfaces:**

- Consumes: Task 2 的 `groupImageGalleries` 选项。
- 说明:`prepareArticleMarkdownHtml` 之后的字符串级处理(`optimizeMarkdownImages` → `deferMarkdownImageSources` → `wrapMarkdownImagesWithSkeletonHtml`)都是对 `<img>` 标签的正则处理,不关心外层结构,轮播内图片自动获得 CDN 优化/懒加载/骨架。

- [x] **Step 1: 写失败测试**

在 `apps/web/lib/article-markdown-html.test.ts` 追加(遵循该文件既有的 mock/断言风格):

```ts
it("相邻图片段落合并为 md-gallery 轮播且图片仍带骨架包裹", async () => {
  const html = await prepareArticleMarkdownHtml(
    "![一](https://cdn.example.com/1.png)\n\n![二](https://cdn.example.com/2.png)",
  );
  expect(html).toContain('data-count="2"');
  expect((html.match(/md-gallery-slide/g) ?? []).length).toBe(2);
  // 轮播内图片仍经过骨架包裹与懒加载处理
  expect((html.match(/md-image-wrapper/g) ?? []).length).toBeGreaterThanOrEqual(2);
  expect(html).toContain("data-md-image-deferred");
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test lib/article-markdown-html.test.ts`
Expected: 新用例 FAIL(无 md-gallery)。

- [x] **Step 3: 实现**

`article-markdown-html.ts` 中:

```ts
const html = await markdownToHtml(markdown, { groupImageGalleries: true });
```

- [x] **Step 4: 跑 web 包相关测试**

Run: `pnpm --filter web test lib/article-markdown-html.test.ts`,然后 `pnpm --filter web test`
Expected: PASS。

- [x] **Step 5: Commit**

```bash
git add apps/web/lib/article-markdown-html.ts apps/web/lib/article-markdown-html.test.ts
git commit -m "feat(web): 文章正文启用相邻图片轮播"
```

---

### Task 6: 全仓回归 + 收尾

- [x] **Step 1: 全仓测试**

Run: `pnpm test:run`
Expected: 全部 PASS。重点关注:评论/碎语/通知等使用 `markdownToHtmlSync`/`markdownToHtml` 但未开启 `groupImageGalleries` 的场景零变化;Task 1 的空行行为统一是否影响既有 web 快照类断言,若影响且属预期(async 多出 nbsp 段落),更新断言并在报告中列明。

- [x] **Step 2: Lint/类型检查**

Run: `pnpm --filter @repo/markdown lint && pnpm --filter web lint`(若无 lint script 用 `pnpm lint`;再跑 `pnpm --filter @repo/markdown exec tsc --noEmit` 若有 typecheck script 则用之)
Expected: 无错误。

- [x] **Step 3: 按 AGENTS.md 输出控制汇报**

报告:做了什么、改了哪些文件、验证了什么(测试命令与结果)、风险(尤其 Task 1 行为统一、历史文章中恰好相邻的多图会开始成组——这是产品预期,但需在报告中提醒)。
