import { useState, useCallback } from "react";
import type { GuestbookItemResp, CommentReplyResp, CommentReplyCreateReq } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

/**
 * 统一处理留言提交类请求的失败：401 提示登录，其余业务/网络错误一律走右下角 toast，
 * 并优先展示后端返回的具体原因（如「内容长度不能超过 2000 个字符」）。
 */
function notifySubmitError(err: unknown, fallback: string): void {
  if (err instanceof ApiClientError && err.status === 401) {
    addToast("请先登录", "error");
    return;
  }
  addToast(getApiErrorMessage(err, fallback), "error");
}

export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEntry = useCallback(
    async (content: string): Promise<GuestbookItemResp | null> => {
      if (isSubmitting) {
        return null;
      }
      setIsSubmitting(true);
      try {
        return await apiJson<GuestbookItemResp>("/api/guestbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (err) {
        notifySubmitError(err, "发布失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  const submitReply = useCallback(
    async (
      guestbookId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      if (isSubmitting) {
        return null;
      }
      setIsSubmitting(true);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        return await apiJson<CommentReplyResp>(`/api/guestbook/comments/${guestbookId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return { isSubmitting, submitEntry, submitReply };
}
