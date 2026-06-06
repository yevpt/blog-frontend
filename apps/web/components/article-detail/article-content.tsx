"use client";

import { useRef } from "react";
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
      <article
        ref={articleRef}
        className="prose prose-neutral mx-auto max-w-[720px] pb-10 px-2 md:px-0 pt-8 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </>
  );
}
