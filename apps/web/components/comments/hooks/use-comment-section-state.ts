"use client";

import { useState, useCallback, useRef } from "react";
import type { CommentReplyResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { useCommentLike } from "@/hooks/use-comment-like";
import { useCommentDelete } from "@/hooks/use-comment-delete";
import { useCommentEdit } from "@/hooks/use-comment-edit";
import type {
  EditTarget as CommentEditTarget,
  ReplyEditTarget,
  ReplyTarget,
} from "@/components/comments/parts/comment-item";

export type CommentSectionTargetType = "article" | "moment";

export type EditTargetValue = CommentEditTarget | ReplyEditTarget;

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
    hasLoaded,
    hasMore,
    error,
    loadMore,
    addComment,
    incrementReplyCount,
    decrementReplyCount,
    updateCommentLike,
    removeComment,
    updateComment,
  } = useCommentList(targetType, targetId);

  const { isSubmitting, submitComment, submitReply } = useCommentSubmit(targetType, targetId);
  const { isEditing, editComment, editReply } = useCommentEdit(targetType);

  const { toggleCommentLike } = useCommentLike(targetType);
  const { deleteComment, deleteReply } = useCommentDelete(targetType);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTargetValue | null>(null);
  const [content, setContent] = useState("");
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});
  // 编辑回复成功后存储按 commentId 索引的最新回复，父组件把它传给 CommentReplies.editedReply 触发原位替换。
  const [editedReplies, setEditedReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const contentRef = useRef(content);
  contentRef.current = content;

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      setReplyTarget(target);
      setEditTarget(null);
      setContent("");
      onScrollToEditor?.();
    },
    [onScrollToEditor, openLoginModal, userId],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setContent("");
  }, []);

  const handleEditComment = useCallback(
    (target: CommentEditTarget) => {
      setReplyTarget(null);
      setEditTarget(target);
      setContent(target.initialContent);
      onScrollToEditor?.();
    },
    [onScrollToEditor],
  );

  const handleEditReply = useCallback(
    (target: ReplyEditTarget) => {
      setReplyTarget(null);
      setEditTarget(target);
      setContent(target.initialContent);
      onScrollToEditor?.();
    },
    [onScrollToEditor],
  );

  const handleCancelEdit = useCallback(() => {
    setEditTarget(null);
    setContent("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent.trim()) {
      return;
    }

    if (editTarget) {
      if (editTarget.type === "comment") {
        const updated = await editComment(editTarget.id, currentContent);
        if (updated) {
          updateComment(updated);
          setEditTarget(null);
          setContent("");
          onScrollToComment?.(editTarget.id);
        }
        return;
      }
      const updated = await editReply(editTarget.id, editTarget.parentReplyId, currentContent);
      if (updated) {
        setEditedReplies((current) => ({
          ...current,
          [editTarget.commentId]: updated,
        }));
        setEditTarget(null);
        setContent("");
        onScrollToComment?.(editTarget.commentId);
      }
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
    editComment,
    editReply,
    incrementReplyCount,
    onCommentAdded,
    onScrollToComment,
    onScrollToListTop,
    replyTarget,
    submitComment,
    submitReply,
    editTarget,
    updateComment,
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
    hasLoaded,
    hasMore,
    error,
    loadMore,
    replyTarget,
    editTarget,
    content,
    setContent,
    pendingReplies,
    editedReplies,
    isSubmitting: isSubmitting || isEditing,
    handleReply,
    handleCancelReply,
    handleEditComment,
    handleEditReply,
    handleCancelEdit,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  };
}
