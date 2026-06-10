import { useState, useCallback } from "react";
import type { GuestbookItemResp, CommentReplyResp, CommentReplyCreateReq } from "@repo/api";

export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEntry = useCallback(
    async (content: string): Promise<GuestbookItemResp | null> => {
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/guestbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) {
          setError("请先登录");
          return null;
        }
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as GuestbookItemResp;
      } catch {
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
      if (isSubmitting) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        const res = await fetch(`/api/guestbook/comments/${guestbookId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    [isSubmitting],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isSubmitting, error, clearError, submitEntry, submitReply };
}
