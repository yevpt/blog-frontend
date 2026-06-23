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

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface MarkdownRenderOptions {
  /** 摘录场景：仅移除无效/相对路径图片，保留合法 http(s) 与站内绝对路径。 */
  stripInvalidImages?: boolean;
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

  return processor.use(rehypeStringify);
}

/** 同步版 Markdown → HTML，适用于客户端 useMemo 实时渲染（无加载状态、无闪烁）。 */
export function markdownToHtmlSync(markdown: string, options?: MarkdownRenderOptions): string {
  return String(buildPipeline(options).processSync(markdown));
}

/** 异步版 Markdown → HTML，供服务端/SSR 使用（如文章详情页）。 */
export async function markdownToHtml(
  markdown: string,
  options?: MarkdownRenderOptions,
): Promise<string> {
  return String(await buildPipeline(options).process(markdown));
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
