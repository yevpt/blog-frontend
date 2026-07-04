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

// 注意：故意不含 nbsp ——仅含 nbsp 的段落是作者显式的「拆组」间隔
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
