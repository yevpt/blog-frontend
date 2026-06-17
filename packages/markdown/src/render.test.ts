import { describe, expect, it } from "vitest";
import { markdownToHtml, extractTocFromHtml } from "./render";

describe("markdownToHtml", () => {
  it("将 **bold** 转换为 <strong>bold</strong>", async () => {
    const html = await markdownToHtml("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("将 _italic_ 转换为 <em>italic</em>", async () => {
    const html = await markdownToHtml("_italic_");
    expect(html).toContain("<em>italic</em>");
  });

  it("为 h2 标题注入 id（rehype-slug）", async () => {
    const html = await markdownToHtml("## Hello World");
    expect(html).toContain('id="hello-world"');
  });

  it("允许 <u> 标签通过 sanitize（RichEditor 生成的下划线格式）", async () => {
    const html = await markdownToHtml("<u>underline</u>");
    expect(html).toContain("<u>underline</u>");
  });

  it("过滤危险的 <script> 标签", async () => {
    const html = await markdownToHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
  });

  it("typescript 代码围栏生成语法高亮类名", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("hljs-keyword");
  });

  it("代码围栏的 code 元素保留 language-* className", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("language-typescript");
  });
});

describe("extractTocFromHtml", () => {
  it("从 HTML 中提取 h2/h3 标题", () => {
    const html = '<h2 id="intro">介绍</h2><h3 id="detail">详情</h3>';
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(2);
    expect(toc[0]).toEqual({ id: "intro", text: "介绍", level: 2 });
    expect(toc[1]).toEqual({ id: "detail", text: "详情", level: 3 });
  });

  it("忽略 h1 和 h4+ 标题", () => {
    const html = '<h1 id="top">Top</h1><h4 id="low">Low</h4>';
    expect(extractTocFromHtml(html)).toHaveLength(0);
  });

  it("空 HTML 返回空数组", () => {
    expect(extractTocFromHtml("")).toHaveLength(0);
  });
});

describe("rehypeCodeWrapper", () => {
  it("有语言的代码围栏输出 md-code-wrapper 和 md-code-toolbar", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("md-code-wrapper");
    expect(html).toContain("md-code-toolbar");
    expect(html).toContain("md-code-lang");
    expect(html).toContain("TypeScript");
  });

  it("有语言的代码围栏包含复制按钮（md-copy-btn）", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    expect(html).toContain("md-copy-btn");
    expect(html).not.toContain("md-copy-btn-abs");
  });

  it("无语言代码围栏不输出 md-code-toolbar", async () => {
    const html = await markdownToHtml("```\nnpm install react\n```");
    expect(html).toContain("md-code-wrapper");
    expect(html).not.toContain("md-code-toolbar");
  });

  it("无语言代码围栏输出绝对定位复制按钮（md-copy-btn-abs）", async () => {
    const html = await markdownToHtml("```\nnpm install react\n```");
    expect(html).toContain("md-copy-btn-abs");
  });

  it("未知语言使用原始语言字符串作为显示名", async () => {
    const html = await markdownToHtml("```foobar\ncode\n```");
    expect(html).toContain("foobar");
  });

  it("pre 元素仍在 md-code-wrapper 内", async () => {
    const html = await markdownToHtml("```typescript\nconst x = 1\n```");
    // wrapper 在 pre 之前出现
    expect(html.indexOf("md-code-wrapper")).toBeLessThan(html.indexOf("<pre"));
  });
});
