import {
  markdownToHtml,
  wrapMarkdownImagesWithSkeletonHtml,
  deferMarkdownImageSources,
} from "@repo/markdown/server";
import { optimizeMarkdownImages } from "./markdown-image-optimizer";

/** 文章正文：服务端 Markdown → HTML，并注入 Next 图片优化与骨架占位。 */
export async function prepareArticleMarkdownHtml(markdown: string): Promise<string> {
  const html = await markdownToHtml(markdown, { groupImageGalleries: true });
  const optimized = optimizeMarkdownImages(html, "article");
  const deferred = deferMarkdownImageSources(optimized);
  return wrapMarkdownImagesWithSkeletonHtml(deferred, "article");
}
