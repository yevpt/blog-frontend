"use client";

import { useLayoutEffect } from "react";
import {
  bindMarkdownContentInteractions,
  type MarkdownImagePreviewHandler,
} from "./markdown-interactions";

export interface MarkdownContentEffectsProps {
  contentId: string;
  variant?: "article" | "comment";
  imageErrorFallback?: boolean;
  /** 为 true 时 SSR 不输出可请求的图片 src，待页面就绪后懒加载 */
  deferImages?: boolean;
  onImagePreview?: MarkdownImagePreviewHandler;
}

/** 为服务端已输出的 Markdown HTML 挂载客户端交互（骨架揭示、重试、预览、复制）。 */
export function MarkdownContentEffects({
  contentId,
  variant = "article",
  imageErrorFallback = variant === "comment",
  deferImages = false,
  onImagePreview,
}: MarkdownContentEffectsProps) {
  useLayoutEffect(() => {
    const container = document.getElementById(contentId);
    if (!container) return;
    return bindMarkdownContentInteractions(container, {
      imageErrorFallback,
      deferImages,
      onImagePreview,
    });
  }, [contentId, imageErrorFallback, deferImages, onImagePreview]);

  return null;
}
