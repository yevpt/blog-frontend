"use client";

import { MarkdownContent, type MarkdownContentProps } from "@repo/markdown";
import { useImageViewer } from "@/store/use-image-viewer";

/** 在 MarkdownContent 基础上把图片点击接到全局预览 store。 */
export function PreviewableMarkdown(props: Omit<MarkdownContentProps, "onImagePreview">) {
  const open = useImageViewer((s) => s.open);
  return <MarkdownContent {...props} onImagePreview={open} />;
}
