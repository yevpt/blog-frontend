"use client";

import { useState, useCallback, useRef } from "react";
import type { CommentReplyResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { useCommentLike } from "@/hooks/use-comment-like";
import { useCommentDelete } from "@/hooks/use-comment-delete";
import type { ReplyTarget } from "@/components/comments/parts/comment-item";

export type CommentSectionTargetType = "article" | "moment";

export interface UseCommentSectionStateOptions {
  targetType: CommentSectionTargetType;
  targetId: number;
  onCommentAdded?: () => void;
  onScrollToListTop?: () => void;
  onScrollToComment?: (commentId: number) => void;
  onScrollToEditor?: () => void;
}

export function useCommentSectionState({
  targetType,
  targetId,
  onCommentAdded,
  onScrollToListTop,
  onScrollToComment,
  onScrollToEditor,
}: UseCommentSectionStateOptions) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((state) => state.open);

  const {
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    addComment,
    incrementReplyCount,
    decrementReplyCount,
    updateCommentLike,
    removeComment,
  } = useCommentList(targetType, targetId);

  const { isSubmitting, submitComment, submitReply } = useCommentSubmit(targetType, targetId);

  const { toggleCommentLike } = useCommentLike(targetType);
  const { deleteComment, deleteReply } = useCommentDelete(targetType);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const contentRef = useRef(content);
  contentRef.current = content;

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      setReplyTarget(target);
      setContent("");
      onScrollToEditor?.();
    },
    [onScrollToEditor, openLoginModal, userId],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setContent("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent.trim()) {
      return;
    }

    if (replyTarget) {
      const reply = await submitReply(
        replyTarget.commentId,
        currentContent,
        replyTarget.parentReplyId,
      );
      if (reply) {
        incrementReplyCount(replyTarget.commentId);
        setPendingReplies((current) => ({ ...current, [replyTarget.commentId]: reply }));
        setReplyTarget(null);
        setContent("");
        onScrollToComment?.(replyTarget.commentId);
      }
      return;
    }

    const comment = await submitComment(currentContent);
    if (comment) {
      addComment(comment);
      setContent("");
      onCommentAdded?.();
      onScrollToListTop?.();
    }
  }, [
    addComment,
    incrementReplyCount,
    onCommentAdded,
    onScrollToComment,
    onScrollToListTop,
    replyTarget,
    submitComment,
    submitReply,
  ]);

  const handleCommentLike = useCallback(
    async (commentId: number) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      const result = await toggleCommentLike(commentId);
      if (result) {
        updateCommentLike(commentId, result.is_liked, result.like_count);
      }
    },
    [openLoginModal, toggleCommentLike, updateCommentLike, userId],
  );

  const handleCommentDelete = useCallback(
    async (commentId: number) => {
      const ok = await deleteComment(commentId);
      if (ok) {
        removeComment(commentId);
      }
      return ok;
    },
    [deleteComment, removeComment],
  );

  const handleReplyDelete = useCallback(
    async (commentId: number, replyId: number) => {
      const ok = await deleteReply(replyId);
      if (ok) {
        decrementReplyCount(commentId);
      }
      return ok;
    },
    [decrementReplyCount, deleteReply],
  );

  const handleChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  return {
    userId,
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    replyTarget,
    content,
    setContent,
    pendingReplies,
    isSubmitting,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  };
}
