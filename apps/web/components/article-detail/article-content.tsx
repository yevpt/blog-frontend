"use client";

import { useRef } from "react";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { PreviewableMarkdown } from "@/components/common/previewable-markdown";

interface ArticleContentProps {
  contentHtml: string;
}

export function ArticleContent({ contentHtml }: ArticleContentProps) {
  const articleRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(articleRef);

  return (
    <>
      <div
        data-testid="reading-progress"
        className="fixed left-0 top-0 z-50 h-[2px] bg-primary transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
      {/* 外层 article 保持语义标签和定位样式，prose 样式由 MarkdownContent 管理 */}
      <article ref={articleRef} className="mx-auto max-w-[720px] px-2 pt-4 pb-10 md:px-0">
        <PreviewableMarkdown html={contentHtml} variant="article" />
      </article>
    </>
  );
}
