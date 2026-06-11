"use client";

import { useRef } from "react";
import { MarkdownContent } from "@repo/markdown";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

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
      <article ref={articleRef} className="mx-auto max-w-[720px] pb-10 px-2 md:px-0 pt-8">
        <MarkdownContent html={contentHtml} variant="article" />
      </article>
    </>
  );
}
