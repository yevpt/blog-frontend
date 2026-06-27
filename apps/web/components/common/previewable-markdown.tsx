"use client";

import { useMemo } from "react";
import { MarkdownContent, type MarkdownContentProps } from "@repo/markdown";
import { optimizeMarkdownImages } from "@/lib/markdown-image-optimizer";
import { useImageViewer } from "@/store/use-image-viewer";

/** 在 MarkdownContent 基础上把图片点击接到全局预览 store。 */
export function PreviewableMarkdown({
  html,
  variant = "article",
  ...props
}: Omit<MarkdownContentProps, "onImagePreview">) {
  const open = useImageViewer((s) => s.open);
  const optimizedHtml = useMemo(() => optimizeMarkdownImages(html, variant), [html, variant]);
  return (
    <MarkdownContent {...props} html={optimizedHtml} variant={variant} onImagePreview={open} />
  );
}
