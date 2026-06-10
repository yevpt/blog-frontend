import { useState, useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";

export function useCommentSubmit(targetType: string, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmitting) return null;

      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_type: targetType, target_id: targetId, content }),
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
        const res = await fetch(`/api/comments/${commentId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: targetType,
            parent_reply_id: parentReplyId,
            content,
          }),
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
