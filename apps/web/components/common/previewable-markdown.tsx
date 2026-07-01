"use client";

import { useMemo } from "react";
import { MarkdownContent, type MarkdownContentProps } from "@repo/markdown";
import { optimizeMarkdownImages } from "@/lib/markdown-image-optimizer";
import { useImageViewer } from "@/store/use-image-viewer";
import { deferMarkdownImageSources, wrapMarkdownImagesWithSkeletonHtml } from "@repo/markdown";

/** 在 MarkdownContent 基础上把图片点击接到全局预览 store。 */
export function PreviewableMarkdown({
  html,
  variant = "article",
  deferImages = false,
  ...props
}: Omit<MarkdownContentProps, "onImagePreview">) {
  const open = useImageViewer((s) => s.open);
  const optimizedHtml = useMemo(() => {
    let result = optimizeMarkdownImages(html, variant);
    if (deferImages) {
      result = wrapMarkdownImagesWithSkeletonHtml(result, variant);
      result = deferMarkdownImageSources(result);
    }
    return result;
  }, [html, variant, deferImages]);
  return (
    <MarkdownContent
      {...props}
      html={optimizedHtml}
      variant={variant}
      deferImages={deferImages}
      onImagePreview={open}
    />
  );
}
