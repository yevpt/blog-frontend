"use client";

import { useScrollProgress } from "@/hooks/use-scroll-progress";

interface ArticleContentProps {
  contentHtml: string;
}

export function ArticleContent({ contentHtml }: ArticleContentProps) {
  const progress = useScrollProgress();

  return (
    <>
      <div
        data-testid="reading-progress"
        className="fixed left-0 top-0 z-50 h-[2px] bg-primary transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
      <article
        className="prose prose-neutral mx-auto max-w-[720px] px-5 py-10 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </>
  );
}
