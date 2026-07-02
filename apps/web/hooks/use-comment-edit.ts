import { useCallback, useRef, useState } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useIdempotencyKey } from "./use-idempotency-key";

type TargetType = "article" | "moment" | "guestbook";

function commentEditUrl(targetType: TargetType, commentId: number): string {
  if (targetType === "article") return `/api/articles/comments/${commentId}`;
  if (targetType === "moment") return `/api/moments/comments/${commentId}`;
  return `/api/guestbook/${commentId}`;
}

function replyEditUrl(targetType: TargetType, replyId: number): string {
  if (targetType === "article") return `/api/articles/comment-replies/${replyId}`;
  if (targetType === "moment") return `/api/moments/comment-replies/${replyId}`;
  return `/api/guestbook/comment-replies/${replyId}`;
}

function notifyEditError(err: unknown, fallback: string): void {
  if (err instanceof ApiClientError && err.status === 401) {
    addToast("请先登录", "error");
    return;
  }
  addToast(getApiErrorMessage(err, fallback), "error");
}

function isTransientError(err: unknown): boolean {
  if (err instanceof ApiClientError) return err.status >= 500;
  if (err instanceof Error && err.name === "AbortError") return false;
  return true;
}

function notifyEditSuccess(resp: CommentItemResp | CommentReplyResp, fallback: string): void {
  const notice = resp.moderation?.notice?.trim();
  addToast(notice ? notice : fallback, "success");
}

/**
 * 评论与回复的作者编辑入口：PATCH 当前内容并维护审核反馈 toast。
 * 评论 body 为 `{ content }`；回复 body 保留 `parent_reply_id` 和 `content`。
 * 编辑成功后由调用方按 ID 原位替换列表项，不改变评论/回复计数。
 */
export function useCommentEdit(targetType: TargetType) {
  const [isEditing, setIsEditing] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const commentKey = useIdempotencyKey("comment-edit");
  const replyKey = useIdempotencyKey("reply-edit");

  // 按 target 维度（而非全局）加锁，理由同 use-comment-submit.ts。
  const beginRequest = useCallback((key: string): boolean => {
    if (inFlightKeysRef.current.has(key)) return false;
    inFlightKeysRef.current.add(key);
    setIsEditing(true);
    return true;
  }, []);

  const endRequest = useCallback((key: string) => {
    inFlightKeysRef.current.delete(key);
    setIsEditing(inFlightKeysRef.current.size > 0);
  }, []);

  const editComment = useCallback(
    async (commentId: number, content: string): Promise<CommentItemResp | null> => {
      const key = `comment:${commentId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, commentId, content });
      try {
        const resp = await apiJson<CommentItemResp>(commentEditUrl(targetType, commentId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": commentKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ content }),
        });
        commentKey.resetIdempotencyKey();
        notifyEditSuccess(resp, "评论已更新");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) commentKey.resetIdempotencyKey();
        notifyEditError(err, "编辑失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, commentKey, beginRequest, endRequest],
  );

  const editReply = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      content: string,
    ): Promise<CommentReplyResp | null> => {
      const key = `reply:${replyId}`;
      if (!beginRequest(key)) return null;
      const fingerprint = JSON.stringify({ targetType, replyId, parentReplyId, content });
      try {
        const resp = await apiJson<CommentReplyResp>(replyEditUrl(targetType, replyId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": replyKey.getIdempotencyKey(fingerprint),
          },
          body: JSON.stringify({ parent_reply_id: parentReplyId, content }),
        });
        replyKey.resetIdempotencyKey();
        notifyEditSuccess(resp, "回复已更新");
        return resp;
      } catch (err) {
        if (!isTransientError(err)) replyKey.resetIdempotencyKey();
        notifyEditError(err, "编辑失败，请稍后重试");
        return null;
      } finally {
        endRequest(key);
      }
    },
    [targetType, replyKey, beginRequest, endRequest],
  );

  return { isEditing, editComment, editReply };
}
