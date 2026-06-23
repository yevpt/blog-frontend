import { useCallback, useRef, useState } from "react";
import type { CommentReplyResp, NotificationItemResp } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
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
        await apiJson<CommentReplyResp>(target.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_reply_id: target.parent_reply_id,
            content: trimmed,
          }),
        });
        onReplySuccess(item.id, (item.reply_count ?? 0) + 1);
        addToast("回复成功", "success");
        return true;
      } catch (err) {
        notifySubmitError(err, "回复失败，请稍后重试");
        return false;
      } finally {
        submittingRef.current = false;
        setSubmittingId(null);
      }
    },
    [markRead, onReplySuccess],
  );

  return { submitReply, submittingId };
}
