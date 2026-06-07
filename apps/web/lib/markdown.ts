import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      // 允许 <u> 标签：下划线由 RichEditor 以 <u>text</u> 形式存储在 Markdown 中
      // defaultSchema 不包含 <u>，需显式添加
      tagNames: [...(defaultSchema.tagNames ?? []), "u"],
      attributes: {
        ...defaultSchema.attributes,
        // 允许 rehype-slug 注入的 id 属性通过 sanitize
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

/** 从 rehype-slug 渲染后的 HTML 中提取 h2/h3 标题，id 与渲染结果完全对应 */
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
