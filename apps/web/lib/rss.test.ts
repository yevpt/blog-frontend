import { describe, expect, it } from "vitest";
import { buildRssFeed, escapeXml, toRfc822Date, type RssItem } from "./rss";

const baseOptions = {
  title: "Yevpt's Blog",
  description: "分享编程、工具、文学的个人博客",
  link: "https://www.yevpt.com",
  selfLink: "https://www.yevpt.com/feed.xml",
};

describe("escapeXml", () => {
  it("转义 5 个 XML 预定义字符", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e &apos; f");
  });

  it("不动普通文本", () => {
    expect(escapeXml("hello 世界 123")).toBe("hello 世界 123");
  });

  it("连续特殊字符全部转义", () => {
    expect(escapeXml("<<&&>>")).toBe("&lt;&lt;&amp;&amp;&gt;&gt;");
  });
});

describe("toRfc822Date", () => {
  it("Date 对象转 RFC822 字符串", () => {
    const d = new Date("2026-07-06T08:00:00Z");
    expect(toRfc822Date(d)).toBe(d.toUTCString());
    expect(toRfc822Date(d)).toMatch(/GMT$/);
  });

  it("ISO 字符串也能转换", () => {
    expect(toRfc822Date("2026-07-06T08:00:00Z")).toMatch(/GMT$/);
  });
});

describe("buildRssFeed", () => {
  it("生成 XML 声明与 RSS 2.0 骨架，包含 content 与 atom 命名空间", () => {
    const xml = buildRssFeed({ ...baseOptions, items: [] });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>Yevpt&apos;s Blog</title>");
    expect(xml).toContain("<language>zh-CN</language>");
    // atom self link
    expect(xml).toContain(
      '<atom:link href="https://www.yevpt.com/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it("渲染单条 item 的所有字段", () => {
    const item: RssItem = {
      title: "测试 <标题>",
      link: "https://www.yevpt.com/articles/1",
      description: "摘要内容",
      contentEncoded: "<p>全文</p>",
      pubDate: "Mon, 06 Jul 2026 08:00:00 GMT",
      author: "yevpt",
      categories: ["技术", "随笔"],
    };
    const xml = buildRssFeed({ ...baseOptions, items: [item] });
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>测试 &lt;标题&gt;</title>");
    expect(xml).toContain("<link>https://www.yevpt.com/articles/1</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://www.yevpt.com/articles/1</guid>');
    expect(xml).toContain("<description>摘要内容</description>");
    expect(xml).toContain("<author>yevpt</author>");
    expect(xml).toContain("<category>技术</category>");
    expect(xml).toContain("<category>随笔</category>");
    expect(xml).toContain("<content:encoded><![CDATA[<p>全文</p>]]></content:encoded>");
  });

  it("省略可选字段时不出对应标签", () => {
    const xml = buildRssFeed({
      ...baseOptions,
      items: [{ title: "t", link: "https://x.test/a", pubDate: "Mon, 06 Jul 2026 08:00:00 GMT" }],
    });
    // channel 层级仍有 <description>（站点描述），只断言 item 内不出现这些可选字段
    const itemStart = xml.indexOf("<item>");
    const itemEnd = xml.indexOf("</item>");
    const itemXml = xml.slice(itemStart, itemEnd);
    expect(itemXml).not.toContain("<description>");
    expect(itemXml).not.toContain("<author>");
    expect(itemXml).not.toContain("<category>");
    expect(itemXml).not.toContain("<content:encoded>");
  });

  it("lastBuildDate 取首条 pubDate（feed 通常按时间倒序）", () => {
    const items: RssItem[] = [
      { title: "new", link: "https://x.test/2", pubDate: "Tue, 07 Jul 2026 08:00:00 GMT" },
      { title: "old", link: "https://x.test/1", pubDate: "Mon, 06 Jul 2026 08:00:00 GMT" },
    ];
    const xml = buildRssFeed({ ...baseOptions, items });
    expect(xml).toContain("<lastBuildDate>Tue, 07 Jul 2026 08:00:00 GMT</lastBuildDate>");
  });

  it("空列表时 lastBuildDate 退化为当前时间（合法 RFC822）", () => {
    const xml = buildRssFeed({ ...baseOptions, items: [] });
    const match = xml.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/GMT$/);
  });

  it("content:encoded 中的 ]]> 序列被安全拆分，不破坏 CDATA", () => {
    const item: RssItem = {
      title: "x",
      link: "https://x.test/a",
      pubDate: "Mon, 06 Jul 2026 08:00:00 GMT",
      contentEncoded: '<script>if(a>b) c="x"; </script>]]>',
    };
    const xml = buildRssFeed({ ...baseOptions, items: [item] });
    // 输出仍是结构良好的 CDATA（不会出现裸 ]]> 结束符导致提前关闭）
    expect(xml).toContain("]]></content:encoded>");
    expect(xml).toContain("]]]]><![CDATA[>");
  });
});
