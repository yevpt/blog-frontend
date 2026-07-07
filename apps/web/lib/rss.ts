/**
 * RSS 2.0 feed 构建工具（纯函数）。
 *
 * 输出符合 RSS 2.0 + content 命名空间的 XML。
 * 所有用户生成内容必须经 escapeXml 转义，避免破坏 XML 结构或注入。
 */

/** RSS feed 的一条目输入 */
export interface RssItem {
  /** 标题（已转义） */
  title: string;
  /** 条目正文绝对 URL，同时用作 guid */
  link: string;
  /** 摘要纯文本（放 <description>） */
  description?: string;
  /** 全文 HTML（放 <content:encoded>，原样嵌入，CDATA 包裹，无需调用方转义） */
  contentEncoded?: string;
  /** RFC 822 / RFC 1123 日期字符串，由调用方传入 */
  pubDate: string;
  /** 作者（可选） */
  author?: string;
  /** 分类（可选，可多个） */
  categories?: string[];
}

/** RSS feed 顶层配置 */
export interface RssFeedOptions {
  /** feed 标题 */
  title: string;
  /** 站点描述 */
  description: string;
  /** 站点首页绝对 URL */
  link: string;
  /** feed 自身的绝对 URL（放 <atom:link rel="self">） */
  selfLink: string;
  items: RssItem[];
}

/**
 * 转义 XML 文本节点中的特殊字符。
 * 注意：用于属性值时同样安全（一并转义引号）。
 */
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 把全文 HTML 用 CDATA 安全包裹。
 * 仅需拆分内容中已存在的 `]]>` 序列，避免提前结束 CDATA。
 */
function wrapCdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function renderItem(item: RssItem): string {
  const parts: string[] = ["    <item>"];
  parts.push(`      <title>${escapeXml(item.title)}</title>`);
  parts.push(`      <link>${escapeXml(item.link)}</link>`);
  parts.push(`      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`);
  parts.push(`      <pubDate>${escapeXml(item.pubDate)}</pubDate>`);
  if (item.description) {
    parts.push(`      <description>${escapeXml(item.description)}</description>`);
  }
  if (item.author) {
    parts.push(`      <author>${escapeXml(item.author)}</author>`);
  }
  for (const category of item.categories ?? []) {
    parts.push(`      <category>${escapeXml(category)}</category>`);
  }
  if (item.contentEncoded) {
    parts.push(`      <content:encoded>${wrapCdata(item.contentEncoded)}</content:encoded>`);
  }
  parts.push("    </item>");
  return parts.join("\n");
}

/**
 * 构建 RSS 2.0 XML 字符串。纯函数，便于单测。
 */
export function buildRssFeed(options: RssFeedOptions): string {
  const lastBuildDate = options.items[0]?.pubDate ?? new Date().toUTCString();
  const itemsXml = options.items.map(renderItem).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(options.link)}</link>
    <description>${escapeXml(options.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(options.selfLink)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

/**
 * 把 Date 转为 RFC 822 / RFC 1123 日期字符串（RSS 2.0 pubDate 要求的格式）。
 */
export function toRfc822Date(date: Date | string): string {
  return new Date(date).toUTCString();
}
