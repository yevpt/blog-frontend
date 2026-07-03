"use client";

import { useState, useCallback, useRef } from "react";
import type { CommentReplyResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { enrichCommentAuthor, enrichReplyFromAuthor } from "@/lib/enrich-ugc-author";
import { useLoginModal } from "@/store/use-login-modal";
import { useModalCommentEditorStore } from "@/store/use-modal-comment-editor-store";
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
  const { userId, profile } = useSession();
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

  // 跨路由导航保留：回复/编辑目标 + 已输入内容存在全局 store 里，key 按弹窗目标区分，
  // 不用组件内 useState——否则弹窗因导航被隐藏又恢复时（GlobalCommentModal 整体卸载重挂载）会丢失。
  const editorKey = `${targetType}:${targetId}`;
  const replyTarget = useModalCommentEditorStore((s) => s.entries[editorKey]?.replyTarget ?? null);
  const editTarget = useModalCommentEditorStore((s) => s.entries[editorKey]?.editTarget ?? null);
  const content = useModalCommentEditorStore((s) => s.entries[editorKey]?.content ?? "");
  const {
    startReply: startReplyEditor,
    startEdit: startEditEditor,
    setContent: setEditorContent,
    reset: resetEditor,
  } = useModalCommentEditorStore();
  const setContent = useCallback(
    (value: string) => setEditorContent(editorKey, value),
    [setEditorContent, editorKey],
  );
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
      startReplyEditor(editorKey, target);
      onScrollToEditor?.();
    },
    [onScrollToEditor, openLoginModal, userId, startReplyEditor, editorKey],
  );

  const handleCancelReply = useCallback(() => {
    resetEditor(editorKey);
  }, [resetEditor, editorKey]);

  const handleEditComment = useCallback(
    (target: CommentEditTarget) => {
      startEditEditor(editorKey, target);
      onScrollToEditor?.();
    },
    [onScrollToEditor, startEditEditor, editorKey],
  );

  const handleEditReply = useCallback(
    (target: ReplyEditTarget) => {
      startEditEditor(editorKey, target);
      onScrollToEditor?.();
    },
    [onScrollToEditor, startEditEditor, editorKey],
  );

  const handleCancelEdit = useCallback(() => {
    resetEditor(editorKey);
  }, [resetEditor, editorKey]);

  const handleSubmit = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent.trim()) {
      return;
    }

    if (editTarget) {
      if (editTarget.type === "comment") {
        const updated = await editComment(editTarget.id, currentContent);
        if (updated) {
          updateComment(enrichCommentAuthor(updated, userId, profile));
          resetEditor(editorKey);
          onScrollToComment?.(editTarget.id);
        }
        return;
      }
      const updated = await editReply(editTarget.id, editTarget.parentReplyId, currentContent);
      if (updated) {
        setEditedReplies((current) => ({
          ...current,
          [editTarget.commentId]: enrichReplyFromAuthor(updated, userId, profile),
        }));
        resetEditor(editorKey);
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
        setPendingReplies((current) => ({
          ...current,
          [replyTarget.commentId]: enrichReplyFromAuthor(reply, userId, profile),
        }));
        resetEditor(editorKey);
        onScrollToComment?.(replyTarget.commentId);
      }
      return;
    }

    const comment = await submitComment(currentContent);
    if (comment) {
      addComment(enrichCommentAuthor(comment, userId, profile));
      resetEditor(editorKey);
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
    profile,
    updateComment,
    userId,
    resetEditor,
    editorKey,
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

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
    },
    [setContent],
  );

  // 内联编辑器专用：不经过 replyTarget/editTarget，直接提交并处理副作用，返回是否成功。
  const handleReplySubmit = useCallback(
    async (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await submitReply(commentId, trimmed, parentReplyId);
      if (!reply) return false;
      incrementReplyCount(commentId);
      setPendingReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [incrementReplyCount, profile, submitReply, userId],
  );

  const handleEditCommentSubmit = useCallback(
    async (commentId: number, content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const updated = await editComment(commentId, trimmed);
      if (!updated) return false;
      updateComment(enrichCommentAuthor(updated, userId, profile));
      return true;
    },
    [editComment, profile, updateComment, userId],
  );

  const handleEditReplySubmit = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const updated = await editReply(replyId, parentReplyId, trimmed);
      if (!updated) return false;
      setEditedReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(updated, userId, profile),
      }));
      return true;
    },
    [editReply, profile, userId],
  );

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
    handleReplySubmit,
    handleEditCommentSubmit,
    handleEditReplySubmit,
  };
}
