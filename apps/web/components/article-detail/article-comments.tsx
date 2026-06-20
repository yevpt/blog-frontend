"use client";

import { useState, useCallback } from "react";
import { InlineComments } from "@/components/comments";

interface ArticleCommentsProps {
  articleId: number;
  commentCount: number;
}

export function ArticleComments({ articleId, commentCount: initialCount }: ArticleCommentsProps) {
  const [commentCount, setCommentCount] = useState(initialCount);

  const handleCommentAdded = useCallback(() => {
    setCommentCount((prev) => prev + 1);
  }, []);

  return (
    <section
      id="article-comments"
      className="mx-auto max-w-[720px] border-t border-border px-2 pb-20 pt-10 md:px-0"
    >
      <h2 className="mb-6 text-lg font-bold text-foreground">
        评论{" "}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
      </h2>
      <InlineComments
        targetType="article"
        targetId={articleId}
        onCommentAdded={handleCommentAdded}
      />
    </section>
  );
}
