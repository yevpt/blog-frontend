"use client";

import { useCallback, useState } from "react";
import { InlineComments } from "@/components/comments";

interface MomentCommentsProps {
  momentId: number;
  commentCount: number;
}

export function MomentComments({ momentId, commentCount: initialCount }: MomentCommentsProps) {
  const [commentCount, setCommentCount] = useState(initialCount);

  const handleCommentAdded = useCallback(() => {
    setCommentCount((prev) => prev + 1);
  }, []);

  return (
    <section
      id="moment-detail-comments"
      className="mx-auto max-w-[680px] border-t border-border px-2 pb-20 pt-10 md:px-0"
    >
      <h2 className="mb-6 text-lg font-bold text-foreground">
        评论{" "}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
      </h2>
      <InlineComments
        targetType="moment"
        targetId={momentId}
        expectedCommentCount={commentCount}
        onCommentAdded={handleCommentAdded}
      />
    </section>
  );
}
