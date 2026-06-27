import { describe, expect, it, vi } from "vitest";
import {
  markdownToHtml,
  wrapMarkdownImagesWithSkeletonHtml,
  deferMarkdownImageSources,
} from "@repo/markdown/server";
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

    expect(markdownToHtml).toHaveBeenCalledWith("![图](https://blog-oss.yevpt.com/a.jpg)");
    expect(optimizeMarkdownImages).toHaveBeenCalled();
    expect(deferMarkdownImageSources).toHaveBeenCalled();
    expect(wrapMarkdownImagesWithSkeletonHtml).toHaveBeenCalledWith(expect.any(String), "article");
    expect(html).toContain("md-image-wrapper");
    expect(html).toContain("md-image-skeleton");
  });
});
