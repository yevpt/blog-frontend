// apps/web/hooks/use-comment-submit.ts
import { useState, useCallback, useRef } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { apiJson, ApiClientError } from "@/lib/client-fetch";

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
  const isSubmittingRef = useRef(false);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmittingRef.current) {
        return null;
      }
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        return await apiJson<CommentItemResp>(commentUrl(targetType, targetId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          setError("请先登录");
          return null;
        }
        setError("发布失败，请稍后重试");
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [targetType, targetId],
  );

  const submitReply = useCallback(
    async (
      commentId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      if (isSubmittingRef.current) {
        return null;
      }
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        return await apiJson<CommentReplyResp>(replyUrl(targetType, commentId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          setError("请先登录");
          return null;
        }
        setError("回复失败，请稍后重试");
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [targetType],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitComment, submitReply };
}
