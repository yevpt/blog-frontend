"use client";

import { MarkdownContentEffects } from "@repo/markdown";
import { useImageViewer } from "@/store/use-image-viewer";

export const ARTICLE_MARKDOWN_CONTENT_ID = "article-markdown-body";

/** 文章正文 Markdown 的客户端增强（预览、复制、图片重试）。 */
export function ArticleMarkdownEffects() {
  const open = useImageViewer((s) => s.open);
  return (
    <MarkdownContentEffects
      contentId={ARTICLE_MARKDOWN_CONTENT_ID}
      variant="article"
      imageErrorFallback={false}
      deferImages
      onImagePreview={open}
    />
  );
}
