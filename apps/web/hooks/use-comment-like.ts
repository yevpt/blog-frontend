// apps/web/hooks/use-comment-like.ts
import { useCallback } from "react";
import type { CommentLikeResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";

export type TargetType = "article" | "moment" | "guestbook";

export function useCommentLike(targetType: TargetType) {
  const toggleCommentLike = useCallback(
    async (commentId: number): Promise<CommentLikeResp | null> => {
      const url =
        targetType === "article"
          ? `/api/articles/comments/${commentId}/like`
          : targetType === "moment"
            ? `/api/moments/comments/${commentId}/like`
            : `/api/guestbook/${commentId}/like`;
      try {
        return await apiJson<CommentLikeResp>(url, { method: "POST" });
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
          : targetType === "moment"
            ? `/api/moments/comments/${commentId}/replies/${replyId}/like`
            : `/api/guestbook/comments/${commentId}/replies/${replyId}/like`;
      try {
        return await apiJson<CommentLikeResp>(url, { method: "POST" });
      } catch {
        return null;
      }
    },
    [targetType],
  );

  return { toggleCommentLike, toggleReplyLike };
}
