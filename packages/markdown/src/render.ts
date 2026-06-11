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
 * 将 Markdown 字符串转换为安全的 HTML 字符串。
 *
 * 管线：remark-parse → remark-rehype → rehype-raw → rehype-slug → rehype-sanitize → rehype-stringify
 *
 * rehype-raw 说明：将 remark-rehype 输出的原始 HTML 节点（如 <u>）解析为真实 hast 节点，
 * 否则内联 HTML 在 sanitize 前会被丢弃
 *
 * sanitize 白名单扩展说明：
 *  - <u>：RichEditor 以 <u>text</u> 形式存储下划线，defaultSchema 不含 <u>，需显式添加
 *  - id 属性：rehype-slug 为标题注入 id，sanitize 默认会剥离，需放行
 *  - clobberPrefix: ""：rehype-sanitize v6 默认为 id 添加 "user-content-" 前缀，
 *    会破坏目录锚点链接，设为空字符串保持原始 id
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    // allowDangerousHtml 保留原始 HTML 节点（如 <u>），由 rehype-raw 处理
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      // clobberPrefix 置空：让 rehype-slug 注入的 id 原样保留，不加 user-content- 前缀
      clobberPrefix: "",
      tagNames: [...(defaultSchema.tagNames ?? []), "u"],
      attributes: {
        ...defaultSchema.attributes,
        // 允许 id 属性通过 sanitize（供标题锚点和目录跳转使用）
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
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
