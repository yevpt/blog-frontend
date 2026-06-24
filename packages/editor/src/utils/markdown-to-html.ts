import { marked } from "marked";

/**
 * 把 Markdown 字符串转成 HTML，供 Tiptap `content` / `setContent` 使用。
 * - 空字符串直接返回空，避免 marked 生成空 <p>。
 * - 若内容本身已是 HTML（以标签开头），直接返回原串，避免二次转义。
 */
export function markdownToHtml(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "";
  if (/^<[a-z][\s\S]*>/i.test(trimmed)) {
    return markdown;
  }
  const html = (marked.parse(markdown, { async: false }) as string).trim();
  return html.replace(/(<pre><code(?:\s[^>]*)?>[\s\S]*?)\n(<\/code><\/pre>)/g, "$1$2");
}
