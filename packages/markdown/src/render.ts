import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Sanitize 配置：扩展 defaultSchema，允许 <u> 标签和 id 属性通过。
 * clobberPrefix 置空：防止 rehype-sanitize v6 为 rehype-slug 注入的 id 添加 "user-content-" 前缀。
 */
function buildSanitizeSchema() {
  return {
    ...defaultSchema,
    clobberPrefix: "",
    tagNames: [...(defaultSchema.tagNames ?? []), "u"],
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
    },
  };
}

/**
 * 构建统一的 unified 管线（remark-parse → remark-rehype → rehype-raw → rehype-slug → rehype-sanitize → rehype-stringify）。
 * rehype-raw：将原始 HTML 节点（如 <u>）解析为真实 hast 节点，否则内联 HTML 在 sanitize 前被丢弃。
 */
function buildPipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeSanitize, buildSanitizeSchema())
    .use(rehypeStringify);
}

/** 同步版 Markdown → HTML，适用于客户端 useMemo 实时渲染（无加载状态、无闪烁）。 */
export function markdownToHtmlSync(markdown: string): string {
  return String(buildPipeline().processSync(markdown));
}

/** 异步版 Markdown → HTML，供服务端/SSR 使用（如文章详情页）。 */
export async function markdownToHtml(markdown: string): Promise<string> {
  return String(await buildPipeline().process(markdown));
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
