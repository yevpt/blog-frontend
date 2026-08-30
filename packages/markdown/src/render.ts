import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import { visit } from "unist-util-visit";
import type { Root, Element, Properties } from "hast";
import { isSafeImageSrc } from "./html-excerpt";
import { buildImageFallbackHast } from "./image-fallback";
import { rehypeImageGallery } from "./image-gallery";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface MarkdownRenderOptions {
  /** 摘录场景：仅移除无效/相对路径图片，保留合法 http(s) 与站内绝对路径。 */
  stripInvalidImages?: boolean;
  /**
   * UGC 场景（留言板留言、评论/回复）：外部 http(s) 链接使用
   * rel="nofollow ugc noopener noreferrer"（默认场景为 noopener noreferrer）。
   * 与链接是否失效无关——避免本站权重外泄给不可控的第三方链接。
   */
  treatLinksAsUgc?: boolean;
  /**
   * 文章场景：相邻的「纯图片段落」合并为局部轮播（.md-gallery）。
   * 仅文章详情启用；评论/摘录不开。成组契约详见 image-gallery.ts。
   */
  groupImageGalleries?: boolean;
}

/**
 * remark 会折叠「纯空行」段间距（\n\n\n+）；仅含 nbsp 的段落可保留视觉间隔
 * （普通空格段会被 remark 丢弃，与手动在空行输入空格的效果一致）。
 */
export function expandExtraBlankLines(markdown: string): string {
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) =>
      part.startsWith("```") ? part : part.replace(/(?:\r?\n){3,}/g, "\n\n&nbsp;\n\n"),
    )
    .join("");
}

// 语言显示名映射
const LANG_DISPLAY: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  css: "CSS",
  html: "HTML",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  sql: "SQL",
  yaml: "YAML",
  markdown: "Markdown",
  xml: "XML",
  graphql: "GraphQL",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  ruby: "Ruby",
  scala: "Scala",
};

function getDisplayLang(lang: string): string {
  return LANG_DISPLAY[lang.toLowerCase()] ?? lang;
}

// SVG：</> 代码图标
function codeIconSvg(): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "12",
      height: "12",
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
        properties: { points: "5 3 1 8 5 13" } as Properties,
        children: [],
      },
      {
        type: "element",
        tagName: "polyline",
        properties: { points: "11 3 15 8 11 13" } as Properties,
        children: [],
      },
    ],
  };
}

// SVG：剪贴板复制图标
function copyIconSvg(): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as Properties,
    children: [
      {
        type: "element",
        tagName: "rect",
        properties: { x: "9", y: "9", width: "13", height: "13", rx: "2" } as Properties,
        children: [],
      },
      {
        type: "element",
        tagName: "path",
        properties: { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" } as Properties,
        children: [],
      },
    ],
  };
}

// 构建带工具栏的 wrapper（有语言）或仅带绝对定位复制按钮的 wrapper（无语言）
function buildWrapper(pre: Element, lang: string | null): Element {
  const wrapper: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["md-code-wrapper"] } as Properties,
    children: [],
  };

  if (lang) {
    const toolbar: Element = {
      type: "element",
      tagName: "div",
      properties: { className: ["md-code-toolbar"] } as Properties,
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["md-code-lang"] } as Properties,
          children: [codeIconSvg(), { type: "text", value: " " + getDisplayLang(lang) }],
        },
        {
          type: "element",
          tagName: "button",
          properties: {
            className: ["md-copy-btn"],
            type: "button",
            ariaLabel: "复制代码",
          } as Properties,
          children: [copyIconSvg()],
        },
      ],
    };
    wrapper.children.push(toolbar);
  } else {
    // 无语言：复制按钮绝对定位，不占顶部高度
    const copyBtn: Element = {
      type: "element",
      tagName: "button",
      properties: {
        className: ["md-copy-btn", "md-copy-btn-abs"],
        type: "button",
        ariaLabel: "复制代码",
      } as Properties,
      children: [copyIconSvg()],
    };
    wrapper.children.push(copyBtn);
  }

  wrapper.children.push(pre);
  return wrapper;
}

// rehype 插件：将每个 pre>code 包装进带工具栏的 div
function rehypeCodeWrapper() {
  return (tree: Root) => {
    type Replacement = {
      parent: Element | Root;
      index: number;
      pre: Element;
      lang: string | null;
    };
    const replacements: Replacement[] = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const codeChild = node.children.find(
        (c): c is Element => c.type === "element" && (c as Element).tagName === "code",
      );
      if (!codeChild) return;

      const classNames = (codeChild.properties?.className as string[] | undefined) ?? [];
      const langClass = classNames.find((c: string) => c.startsWith("language-"));
      const lang = langClass ? langClass.replace("language-", "") : null;

      replacements.push({ parent: parent as Element | Root, index, pre: node, lang });
    });

    // 倒序替换，确保 index 不错位
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, pre, lang } = replacements[i];
      parent.children.splice(index, 1, buildWrapper(pre, lang));
    }
  };
}

/**
 * Sanitize 配置：放行 hljs 高亮类名 + 工具栏所需的 button/svg 结构。
 * button/svg 本身不是 XSS 向量；危险的 on* 属性由 defaultSchema 默认拦截。
 */
function buildSanitizeSchema() {
  return {
    ...defaultSchema,
    clobberPrefix: "",
    tagNames: [...(defaultSchema.tagNames ?? []), "u", "button", "svg", "path", "polyline", "rect"],
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
      button: ["type", "ariaLabel", "className"],
      svg: [
        "viewBox",
        "fill",
        "stroke",
        "strokeWidth",
        "strokeLinecap",
        "strokeLinejoin",
        "width",
        "height",
      ],
      path: ["d"],
      polyline: ["points"],
      rect: ["x", "y", "width", "height", "rx"],
      code: [...(defaultSchema.attributes?.["code"] ?? []), "className"],
      span: [...(defaultSchema.attributes?.["span"] ?? []), "className"],
    },
  };
}

function rehypeStripInvalidImages() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img" || !parent || index == null) return;
      if (isSafeImageSrc(node.properties?.src)) return;
      parent.children[index] = buildImageFallbackHast();
    });
  };
}

const EXTERNAL_LINK_REL = "noopener noreferrer";
const UGC_LINK_REL = "nofollow ugc noopener noreferrer";

function isExternalHttpHref(href: unknown): href is string {
  return typeof href === "string" && /^https?:\/\//i.test(href);
}

/** 外部 http(s) 链接新窗口打开；站内锚点/相对路径不处理。 */
function rehypeExternalLinks(rel: string) {
  return function attacher() {
    return (tree: Root) => {
      visit(tree, "element", (node: Element) => {
        if (node.tagName !== "a") return;
        const href = node.properties?.href;
        if (!isExternalHttpHref(href)) return;
        node.properties = { ...node.properties, rel: rel.split(" "), target: "_blank" };
      });
    };
  };
}

/**
 * 构建统一的 unified 管线。
 * 顺序：remark-parse → remark-rehype → rehype-raw → rehype-slug
 *       → rehype-highlight → rehypeCodeWrapper → rehype-sanitize → rehype-stringify
 */
function buildPipeline(options: MarkdownRenderOptions = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeCodeWrapper)
    .use(rehypeSanitize, buildSanitizeSchema());

  if (options.stripInvalidImages) {
    processor.use(rehypeStripInvalidImages);
  }

  processor.use(rehypeExternalLinks(options.treatLinksAsUgc ? UGC_LINK_REL : EXTERNAL_LINK_REL));

  if (options.groupImageGalleries) {
    // 必须在 sanitize 之后：插件生成的 button/svg 是可信结构，不能被 schema 剥掉
    processor.use(rehypeImageGallery);
  }

  return processor.use(rehypeStringify);
}

/** 同步版 Markdown → HTML，适用于客户端 useMemo 实时渲染（无加载状态、无闪烁）。 */
export function markdownToHtmlSync(markdown: string, options?: MarkdownRenderOptions): string {
  const input = expandExtraBlankLines(markdown);
  return String(buildPipeline(options).processSync(input));
}

/** 异步版 Markdown → HTML，供服务端/SSR 使用（如文章详情页）。 */
export async function markdownToHtml(
  markdown: string,
  options?: MarkdownRenderOptions,
): Promise<string> {
  // 与同步版保持一致：多余空行折叠前先转为 nbsp 段落，保留作者的段间距意图
  const input = expandExtraBlankLines(markdown);
  return String(await buildPipeline(options).process(input));
}

/**
 * 从已渲染的 HTML 中提取 h2/h3 目录项。
 * 依赖 rehype-slug 注入的 id 属性，因此必须在 markdownToHtml 之后调用。
 */
export function extractTocFromHtml(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const id = match[2];
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    if (id && text) items.push({ id, level, text });
  }
  return items;
}
