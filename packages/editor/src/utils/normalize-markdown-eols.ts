/** 统一换行符，避免 API 的 CRLF 与 getMarkdown() 的 LF 在比较时被误判为不同内容。 */
export function normalizeMarkdownEols(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n");
}
