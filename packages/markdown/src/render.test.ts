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
