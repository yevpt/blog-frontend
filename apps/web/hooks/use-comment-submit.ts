// apps/web/hooks/use-comment-submit.ts
import { useState, useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";

type TargetType = "article" | "moment";

function commentUrl(targetType: TargetType, targetId: number): string {
  return targetType === "article"
    ? `/api/articles/${targetId}/comments`
    : `/api/moments/${targetId}/comments`;
}

function replyUrl(targetType: TargetType, commentId: number): string {
  return targetType === "article"
    ? `/api/articles/comments/${commentId}/replies`
    : `/api/moments/comments/${commentId}/replies`;
}

export function useCommentSubmit(targetType: TargetType, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch(commentUrl(targetType, targetId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) {
          setError("请先登录");
          return null;
        }
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as CommentItemResp;
      } catch {
        setError("发布失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, targetType, targetId],
  );

  const submitReply = useCallback(
    async (
      commentId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch(replyUrl(targetType, commentId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        if (res.status === 401) {
          setError("请先登录");
          return null;
        }
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as CommentReplyResp;
      } catch {
        setError("回复失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, targetType],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitComment, submitReply };
}
