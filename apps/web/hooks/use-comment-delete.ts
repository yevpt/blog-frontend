import { useCallback } from "react";
import type { CommentDeleteResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";

type TargetType = "article" | "moment";

function commentDeleteUrl(targetType: TargetType, commentId: number): string {
  return targetType === "article"
    ? `/api/articles/comments/${commentId}`
    : `/api/moments/comments/${commentId}`;
}

function replyDeleteUrl(targetType: TargetType, replyId: number): string {
  return targetType === "article"
    ? `/api/articles/comment-replies/${replyId}`
    : `/api/moments/comment-replies/${replyId}`;
}

export function useCommentDelete(targetType: TargetType) {
  const deleteComment = useCallback(
    async (commentId: number): Promise<boolean> => {
      try {
        await apiJson<CommentDeleteResp>(commentDeleteUrl(targetType, commentId), {
          method: "DELETE",
        });
        return true;
      } catch {
        return false;
      }
    },
    [targetType],
  );

  const deleteReply = useCallback(
    async (replyId: number): Promise<boolean> => {
      try {
        await apiJson<CommentDeleteResp>(replyDeleteUrl(targetType, replyId), {
          method: "DELETE",
        });
        return true;
      } catch {
        return false;
      }
    },
    [targetType],
  );

  return { deleteComment, deleteReply };
}
