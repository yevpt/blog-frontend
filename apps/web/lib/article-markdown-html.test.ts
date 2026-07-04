import { describe, expect, it, vi } from "vitest";
import {
  markdownToHtml,
  wrapMarkdownImagesWithSkeletonHtml,
  deferMarkdownImageSources,
} from "@repo/markdown/server";
import type * as MarkdownServerModule from "@repo/markdown/server";
import { prepareArticleMarkdownHtml } from "./article-markdown-html";

vi.mock("@repo/markdown/server", () => ({
  markdownToHtml: vi.fn(async () => '<p><img src="https://blog-oss.yevpt.com/a.jpg" alt="图"></p>'),
  wrapMarkdownImagesWithSkeletonHtml: vi.fn((html: string) =>
    html.replace(
      "<img",
      '<span class="md-image-wrapper"><span class="md-image-skeleton"></span><img',
    ),
  ),
  deferMarkdownImageSources: vi.fn((html: string) =>
    html.replace(/\ssrc="/, ' data-md-src="').replace(/\ssrc="/, ""),
  ),
}));

vi.mock("./markdown-image-optimizer", () => ({
  optimizeMarkdownImages: vi.fn((html: string) => html.replace('src="', 'src="/_next/image?url=')),
}));

describe("prepareArticleMarkdownHtml", () => {
  it("依次执行 markdown 渲染、图片优化与骨架包裹", async () => {
    const { optimizeMarkdownImages } = await import("./markdown-image-optimizer");
    const html = await prepareArticleMarkdownHtml("![图](https://blog-oss.yevpt.com/a.jpg)");

    expect(markdownToHtml).toHaveBeenCalledWith("![图](https://blog-oss.yevpt.com/a.jpg)", {
      groupImageGalleries: true,
    });
    expect(optimizeMarkdownImages).toHaveBeenCalled();
    expect(deferMarkdownImageSources).toHaveBeenCalled();
    expect(wrapMarkdownImagesWithSkeletonHtml).toHaveBeenCalledWith(expect.any(String), "article");
    expect(html).toContain("md-image-wrapper");
    expect(html).toContain("md-image-skeleton");
  });

  it("相邻图片段落合并为 md-gallery 轮播且图片仍带骨架包裹", async () => {
    // 本用例验证真实渲染管线的集成行为（分组结构 + 骨架/懒加载属性名），
    // 故临时把 markdown/skeleton/deferred 三个 mock 换回真实实现，
    // 仅 optimizeMarkdownImages（CDN 优化，与本特性无关）保持 mock。
    const actual = await vi.importActual<typeof MarkdownServerModule>("@repo/markdown/server");
    vi.mocked(markdownToHtml).mockImplementationOnce(actual.markdownToHtml);
    vi.mocked(deferMarkdownImageSources).mockImplementationOnce(actual.deferMarkdownImageSources);
    vi.mocked(wrapMarkdownImagesWithSkeletonHtml).mockImplementationOnce(
      actual.wrapMarkdownImagesWithSkeletonHtml,
    );

    const html = await prepareArticleMarkdownHtml(
      "![一](https://cdn.example.com/1.png)\n\n![二](https://cdn.example.com/2.png)",
    );
    expect(html).toContain('data-count="2"');
    expect((html.match(/md-gallery-slide/g) ?? []).length).toBe(2);
    // 轮播内图片仍经过骨架包裹与懒加载处理
    expect((html.match(/md-image-wrapper/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("data-md-image-deferred");
  });
});
