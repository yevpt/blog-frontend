import { useState, useCallback } from "react";
import type { GuestbookItemResp, CommentReplyResp, CommentReplyCreateReq } from "@repo/api";
import { apiJson, ApiClientError } from "@/lib/client-fetch";

export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEntry = useCallback(
    async (content: string): Promise<GuestbookItemResp | null> => {
      if (isSubmitting) {
        return null;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        return await apiJson<GuestbookItemResp>("/api/guestbook", {
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
      setError(null);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        return await apiJson<CommentReplyResp>(`/api/guestbook/comments/${guestbookId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          setError("请先登录");
          return null;
        }
        setError("回复失败，请稍后重试");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitEntry, submitReply };
}
