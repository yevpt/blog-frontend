import { describe, expect, it } from "vitest";
import { markdownToHtmlSync } from "./render";

const opts = { groupImageGalleries: true } as const;

describe("rehypeImageGallery 相邻图片分组", () => {
  it("相邻两个纯图片段落合并为一个轮播", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
    expect((html.match(/md-gallery-slide/g) ?? []).length).toBe(2);
    expect(html).toContain("md-gallery-prev");
    expect(html).toContain("md-gallery-next");
    expect((html.match(/md-gallery-dot\b/g) ?? []).length).toBe(2);
    expect(html).toContain(">1/2<");
    // 原图片不丢失
    expect(html).toContain('src="/img/1.png"');
    expect(html).toContain('src="/img/2.png"');
  });

  it("单段落内多张图（软换行分隔）也成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
  });

  it("段落 + 段内混排的连续图片合并进同一个轮播", () => {
    const html = markdownToHtmlSync(
      "![一](/img/1.png)\n![二](/img/2.png)\n\n![三](/img/3.png)",
      opts,
    );
    expect(html).toContain('data-count="3"');
    expect((html.match(/md-gallery"/g) ?? []).length).toBe(1);
  });

  it("单张图片不成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间有文字段落时不成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n中间说明\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间的 nbsp 空段落阻断成组（作者显式拆开）", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n&nbsp;\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片间的多余空行（经 expandExtraBlankLines）阻断成组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("图片与文字同段时该段不算纯图片段落", () => {
    const html = markdownToHtmlSync("![一](/img/1.png) 后面有字\n\n![二](/img/2.png)", opts);
    expect(html).not.toContain("md-gallery");
  });

  it("未开启选项时不分组", () => {
    const html = markdownToHtmlSync("![一](/img/1.png)\n\n![二](/img/2.png)");
    expect(html).not.toContain("md-gallery");
  });

  it("blockquote 内相邻图片同样成组", () => {
    const html = markdownToHtmlSync("> ![一](/img/1.png)\n>\n> ![二](/img/2.png)", opts);
    expect(html).toContain('data-count="2"');
  });
});
