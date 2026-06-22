// apps/web/hooks/use-comment-submit.ts
import { useState, useCallback, useRef } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

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

/**
 * 统一处理提交类请求的失败：401 提示登录，其余业务/网络错误一律走右下角 toast，
 * 并优先展示后端返回的具体原因（如「内容长度不能超过 2000 个字符」）。
 */
function notifySubmitError(err: unknown, fallback: string): void {
  if (err instanceof ApiClientError && err.status === 401) {
    addToast("请先登录", "error");
    return;
  }
  addToast(getApiErrorMessage(err, fallback), "error");
}

export function useCommentSubmit(targetType: TargetType, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      if (isSubmittingRef.current) {
        return null;
      }
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        return await apiJson<CommentItemResp>(commentUrl(targetType, targetId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (err) {
        notifySubmitError(err, "发布失败，请稍后重试");
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
      try {
        return await apiJson<CommentReplyResp>(replyUrl(targetType, commentId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
      } catch (err) {
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [targetType],
  );

  return { isSubmitting, submitComment, submitReply };
}
