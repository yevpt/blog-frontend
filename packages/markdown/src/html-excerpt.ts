const IMG_TAG_RE = /<img\b[^>]*>/gi;
const HTML_TAG_RE = /<[^>]+>/g;
const QUOTE_WRAP_RE = /^['"“”‘’]+|['"“”‘’]+$/g;

/** 去掉 src 两侧引号（含弯引号），避免 “123” 被当成合法路径。 */
export function normalizeImageSrc(src: string): string {
  return src.trim().replace(QUOTE_WRAP_RE, "");
}

/** 摘录场景可加载的图片地址：http(s)、协议相对、站内根路径。 */
export function isSafeImageSrc(src: unknown): boolean {
  if (typeof src !== "string") return false;
  const trimmed = normalizeImageSrc(src);
  if (!trimmed) return false;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("/")) return true;
  return false;
}

/** 将后端 HTML 摘录转为可安全展示的纯文本（图片 → 简短说明）。 */
export function htmlExcerptToPlainText(html: string): string {
  return html
    .replace(IMG_TAG_RE, "图片无法加载")
    .replace(HTML_TAG_RE, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}
