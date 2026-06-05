"use client";

import { CommentSection } from "@/components/comments";

interface ArticleCommentsProps {
  articleId: number;
  commentCount: number;
}

export function ArticleComments({ articleId, commentCount }: ArticleCommentsProps) {
  return (
    <section className="mx-auto max-w-[720px] border-t border-border px-5 pb-20 pt-10">
      <h2 className="mb-6 text-lg font-bold text-foreground">
        评论{" "}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
      </h2>
      <div className="flex flex-col">
        <CommentSection targetType="article" targetId={articleId} />
      </div>
    </section>
  );
}
