import { useState, useCallback, useRef } from "react";
import type {
  CommentReplyResp,
  CommentReplyCreateReq,
  GuestbookItemResp,
  ModerationView,
} from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";

/** 审核开关/后端未注入时，成功写入的兜底提示。 */
const ENTRY_SUCCESS_FALLBACK = "留言已发布";
const EDIT_SUCCESS_FALLBACK = "修改已提交";

/** 仅 5xx 与网络异常被视为可重试，应当保留幂等键供原载荷复用。 */
function isRetriableError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    return err.status >= 500;
  }
  return true;
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

/** 成功时优先使用后端审核 notice，缺失再退回兜底文案；无 notice 且传 null 表示静默成功。 */
function notifySuccess(moderation: ModerationView | undefined, fallback: string): void {
  const notice = moderation?.notice;
  if (notice) {
    addToast(notice, "success");
    return;
  }
  if (fallback) {
    addToast(fallback, "success");
  }
}

export function useGuestbookSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const entryKey = useIdempotencyKey("guestbook");
  const replyKey = useIdempotencyKey("reply");
  const editKey = useIdempotencyKey("guestbook-edit");

  // 按 target 维度（而非全局）加锁，理由同 use-comment-submit.ts。
  const beginRequest = useCallback((key: string): boolean => {
    if (inFlightKeysRef.current.has(key)) return false;
    inFlightKeysRef.current.add(key);
    setIsSubmitting(true);
    return true;
  }, []);

  const endRequest = useCallback((key: string) => {
    inFlightKeysRef.current.delete(key);
    setIsSubmitting(inFlightKeysRef.current.size > 0);
  }, []);

  const submitEntry = useCallback(
    async (content: string, ownerUserId?: number): Promise<GuestbookItemResp | null> => {
      const key = "entry";
      if (!beginRequest(key)) return null;
      const fingerprint = `${ownerUserId ?? 0}:${content}`;
      const idempotencyKey = entryKey.getIdempotencyKey(fingerprint);
      try {
        const item = await apiJson<GuestbookItemResp>("/api/guestbook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ owner_user_id: ownerUserId, content }),
        });
        entryKey.resetIdempotencyKey();
        notifySuccess(item.moderation, ENTRY_SUCCESS_FALLBACK);
        return item;
      } catch (err) {
        if (!isRetriableError(err)) entryKey.resetIdempotencyKey();
        notifySubmitError(err, "发布失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [entryKey, beginRequest, endRequest],
  );

  const submitReply = useCallback(
    async (
      guestbookId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${guestbookId}:${parentReplyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = `${guestbookId}:${parentReplyId}:${content}`;
      const idempotencyKey = replyKey.getIdempotencyKey(fingerprint);
      try {
        const body: CommentReplyCreateReq = { parent_reply_id: parentReplyId, content };
        const reply = await apiJson<CommentReplyResp>(
          `/api/guestbook/comments/${guestbookId}/replies`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(body),
          },
        );
        replyKey.resetIdempotencyKey();
        // 回复成功默认静默；后端注入 notice 时才提示（保留原有交互习惯）。
        notifySuccess(reply.moderation, "");
        return reply;
      } catch (err) {
        if (!isRetriableError(err)) replyKey.resetIdempotencyKey();
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [replyKey, beginRequest, endRequest],
  );

  const editEntry = useCallback(
    async (id: number, content: string): Promise<GuestbookItemResp | null> => {
      const key = `edit:${id}`;
      if (!beginRequest(key)) return null;
      const fingerprint = `${id}:${content}`;
      const idempotencyKey = editKey.getIdempotencyKey(fingerprint);
      try {
        const item = await apiJson<GuestbookItemResp>(`/api/guestbook/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ content }),
        });
        editKey.resetIdempotencyKey();
        notifySuccess(item.moderation, EDIT_SUCCESS_FALLBACK);
        return item;
      } catch (err) {
        if (!isRetriableError(err)) editKey.resetIdempotencyKey();
        notifySubmitError(err, "修改失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [editKey, beginRequest, endRequest],
  );

  return { isSubmitting, submitEntry, submitReply, editEntry };
}
