"use client";

import { useMemo } from "react";
import { markdownToHtmlSync } from "@repo/markdown";
import { cn } from "@repo/ui";
import { PreviewableMarkdown } from "@/components/common/previewable-markdown";

interface NotificationExcerptContentProps {
  content: string;
  className?: string;
}

/** 通知摘录正文：Markdown 渲染，仅拦截无效图片 src，合法图片正常展示。 */
export function NotificationExcerptContent({
  content,
  className,
}: NotificationExcerptContentProps) {
  const html = useMemo(() => markdownToHtmlSync(content, { stripInvalidImages: true }), [content]);

  return (
    <div className={cn("text-[12px] leading-relaxed text-(--fg1)", className)}>
      <PreviewableMarkdown html={html} variant="comment" />
    </div>
  );
}
