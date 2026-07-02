import { useState, useCallback, useRef } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useIdempotencyKey } from "./use-idempotency-key";

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

/**
 * 判断错误是否为可重试的「5xx / 网络异常」——这类错误下幂等键需保留，
 * 使后续重试复用同一键以便后端按幂等去重。
 */
function isTransientError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    return err.status >= 500;
  }
  // 网络异常（abort 之外的 fetch reject）由 useIdempotencyKey 保持统一行为
  if (err instanceof Error && err.name === "AbortError") return false;
  return true;
}

/**
 * 提交成功 toast：优先使用后端 moderation.notice（含审核反馈文案），
 * 没有则使用默认成功提示。
 */
function notifySubmitSuccess(resp: CommentItemResp | CommentReplyResp, fallback: string): void {
  const notice = resp.moderation?.notice?.trim();
  addToast(notice ? notice : fallback, "success");
}

export function useCommentSubmit(targetType: TargetType, targetId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  // 评论与回复分别使用各自 scope 的幂等键，互不复用、互不干扰。
  const commentKey = useIdempotencyKey("comment");
  const replyKey = useIdempotencyKey("reply");

  // 按 target 维度（而非全局）加锁：同一 target 的重复提交会被拒绝，
  // 不同 target（如不同评论）之间互不阻塞，支持同时展开多个内联编辑器并发提交。
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

  const submitComment = useCallback(
    async (content: string): Promise<CommentItemResp | null> => {
      const key = "comment";
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, targetId, content });
      try {
        const resp = await apiJson<CommentItemResp>(commentUrl(targetType, targetId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": commentKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ content }),
        });
        commentKey.resetIdempotencyKey();
        notifySubmitSuccess(resp, "评论已发布");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) commentKey.resetIdempotencyKey();
        notifySubmitError(err, "发布失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, targetId, commentKey, beginRequest, endRequest],
  );

  const submitReply = useCallback(
    async (
      commentId: number,
      content: string,
      parentReplyId = 0,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${commentId}:${parentReplyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({
        targetType,
        commentId,
        parentReplyId,
        content,
      });
      try {
        const resp = await apiJson<CommentReplyResp>(replyUrl(targetType, commentId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": replyKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        replyKey.resetIdempotencyKey();
        notifySubmitSuccess(resp, "回复已发布");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) replyKey.resetIdempotencyKey();
        notifySubmitError(err, "回复失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, replyKey, beginRequest, endRequest],
  );

  return { isSubmitting, submitComment, submitReply };
}
