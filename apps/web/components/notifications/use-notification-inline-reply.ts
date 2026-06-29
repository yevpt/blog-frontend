import { useCallback, useRef, useState } from "react";
import type { CommentReplyResp, NotificationItemResp } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { getNotificationReplyTarget } from "./notification-type";

function notifySubmitError(err: unknown, fallback: string): void {
  if (err instanceof ApiClientError && err.status === 401) {
    addToast("请先登录", "error");
    return;
  }
  addToast(getApiErrorMessage(err, fallback), "error");
}

interface UseNotificationInlineReplyOptions {
  markRead: (id: number) => Promise<void>;
  onReplySuccess: (id: number, replyCount: number) => void;
}

/** 消息中心卡片内联回复提交。 */
export function useNotificationInlineReply({
  markRead,
  onReplySuccess,
}: UseNotificationInlineReplyOptions) {
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const submittingRef = useRef(false);
  const { getIdempotencyKey, resetIdempotencyKey } = useIdempotencyKey("reply");

  const submitReply = useCallback(
    async (item: NotificationItemResp, content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const target = getNotificationReplyTarget(item);
      if (!target) return false;

      if (submittingRef.current) return false;
      submittingRef.current = true;
      setSubmittingId(item.id);

      try {
        if (!item.is_read) await markRead(item.id);
        const fingerprint = JSON.stringify({
          url: target.url,
          parentReplyId: target.parent_reply_id,
          content: trimmed,
        });
        const reply = await apiJson<CommentReplyResp>(target.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({
            parent_reply_id: target.parent_reply_id,
            content: trimmed,
          }),
        });
        resetIdempotencyKey();
        onReplySuccess(item.id, (item.reply_count ?? 0) + 1);
        addToast(reply.moderation?.notice?.trim() || "回复成功", "success");
        return true;
      } catch (err) {
        if (err instanceof ApiClientError && err.status < 500) resetIdempotencyKey();
        notifySubmitError(err, "回复失败，请稍后重试");
        return false;
      } finally {
        submittingRef.current = false;
        setSubmittingId(null);
      }
    },
    [getIdempotencyKey, markRead, onReplySuccess, resetIdempotencyKey],
  );

  return { submitReply, submittingId };
}
