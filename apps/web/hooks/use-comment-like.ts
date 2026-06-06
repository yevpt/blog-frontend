// apps/web/hooks/use-comment-like.ts
import { useCallback } from "react";
import type { CommentLikeResp } from "@repo/api";

type TargetType = "article" | "moment";

export function useCommentLike(targetType: TargetType) {
  const toggleCommentLike = useCallback(
    async (commentId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/like`
          : `/api/moments/comments/${commentId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  const toggleReplyLike = useCallback(
    async (commentId: number, replyId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/replies/${replyId}/like`
          : `/api/moments/comments/${commentId}/replies/${replyId}/like`;
      try {
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [targetType],
  );

  return { toggleCommentLike, toggleReplyLike };
}
