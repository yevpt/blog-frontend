"use client";

import { memo, useCallback, useState } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { cn } from "@repo/ui";
import type { TargetType } from "@/hooks/use-comment-like";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
import { CommentReplies } from "./comment-replies";
import { InlineReplyEditor } from "../inputs/inline-reply-editor";
import { ReplyBanner } from "../inputs/reply-banner";
import {
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
} from "./thread-comment-item";

export interface EditTarget {
  type: "comment";
  id: number;
  initialContent: string;
  pendingReview?: boolean;
}

export interface ReplyEditTarget {
  type: "reply";
  id: number;
  commentId: number;
  parentReplyId: number;
  initialContent: string;
  pendingReview?: boolean;
}

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

/** 评论弹窗等「单底部输入框」场景下，当前激活的回复 / 编辑目标。 */
export type EditTargetValue = EditTarget | ReplyEditTarget;

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onEditComment?: (target: EditTarget) => void;
  onSubmitEditComment?: (commentId: number, content: string) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  onLike?: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
  editedReply?: CommentReplyResp | null;
  /** 单底部输入框场景：当前激活的回复目标，非 null 表示同 commentId 顶层回复处于展开态。 */
  activeReplyTarget?: ReplyTarget | null;
  /** 单底部输入框场景：当前激活的编辑目标，命中本评论时切换为「取消编辑」。 */
  activeEditTarget?: EditTargetValue | null;
  /** 单底部输入框场景：取消已激活的回复目标（点击「取消回复」时调用）。 */
  onCancelReply?: () => void;
  /** 单底部输入框场景：取消已激活的编辑目标（点击「取消编辑」时调用）。 */
  onCancelEdit?: () => void;
}

export const CommentItem = memo(function CommentItem({
  comment,
  targetType,
  onReply,
  onSubmitReply,
  onEditComment,
  onSubmitEditComment,
  onEditReply,
  onSubmitEditReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
  editedReply,
  activeReplyTarget,
  activeEditTarget,
  onCancelReply,
  onCancelEdit,
}: CommentItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const replyKey = `${targetType}-comment:${comment.id}:reply`;
  const editKey = `${targetType}-comment:${comment.id}:edit`;
  const inlineReplyOpen = useInlineEditorStore((s) => Boolean(s.editors[replyKey]?.isOpen));
  const inlineEditOpen = useInlineEditorStore((s) => Boolean(s.editors[editKey]?.isOpen));
  const replyContent = useInlineEditorStore((s) => s.editors[replyKey]?.content ?? "");
  const editContent = useInlineEditorStore((s) => s.editors[editKey]?.content ?? "");
  // 单底部输入框（弹窗）场景：内联编辑器未启用，激活态由 activeReplyTarget 联动顶部按钮显示「取消回复」。
  const legacyReplying =
    activeReplyTarget != null &&
    activeReplyTarget.commentId === comment.id &&
    activeReplyTarget.parentReplyId == null;
  const legacyEditing =
    activeEditTarget != null &&
    activeEditTarget.type === "comment" &&
    activeEditTarget.id === comment.id;
  const isReplying = inlineReplyOpen || (!onSubmitReply && legacyReplying);
  const isEditing = inlineEditOpen || (!onSubmitEditComment && legacyEditing);
  const {
    open: openEditor,
    setContent: setEditorContent,
    close: closeEditor,
    submitSuccess: editorSubmitSuccess,
  } = useInlineEditorStore();
  const hasReplies = comment.reply_count > 0;
  const isOwnComment = currentUserId != null && currentUserId === comment.user_id;
  const displayName = comment.user?.nickname ?? comment.user?.username ?? "匿名";

  const canReply = Boolean(onSubmitReply || onReply);
  const canEdit = Boolean(onSubmitEditComment || onEditComment);

  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        closeEditor(replyKey);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      closeEditor(editKey);
      openEditor(replyKey);
      return;
    }
    if (isReplying) {
      onCancelReply?.();
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [
    isReplying,
    userId,
    openLoginModal,
    onSubmitReply,
    onReply,
    comment.id,
    displayName,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
    onCancelReply,
  ]);

  const handleDelete = useCallback(() => {
    const result = onDelete?.(comment.id);
    result?.then((ok) => {
      if (ok) {
        closeEditor(replyKey);
        closeEditor(editKey);
      }
    });
    return result ?? false;
  }, [onDelete, comment.id, closeEditor, replyKey, editKey]);

  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(comment.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, comment.id],
  );

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(comment.id, undefined, content)) ?? false;
      if (ok) editorSubmitSuccess(replyKey);
      return ok;
    },
    [onSubmitReply, comment.id, editorSubmitSuccess, replyKey],
  );

  // 编辑时优先使用待审版本：让作者编辑的是 pending_content 而非公开旧版本
  const pendingContent =
    comment.moderation?.pending_content?.trim() && comment.moderation!.pending_content!.length > 0
      ? comment.moderation!.pending_content!
      : comment.content;

  const handleEdit = useCallback(() => {
    if (!isOwnComment || !canEdit) return;
    if (onSubmitEditComment) {
      if (isEditing) {
        closeEditor(editKey);
        return;
      }
      closeEditor(replyKey);
      openEditor(editKey, pendingContent);
      return;
    }
    if (isEditing) {
      onCancelEdit?.();
      return;
    }
    onEditComment?.({
      type: "comment",
      id: comment.id,
      initialContent: pendingContent,
      pendingReview: Boolean(comment.moderation?.has_pending_revision),
    });
  }, [
    isOwnComment,
    canEdit,
    isEditing,
    onSubmitEditComment,
    onEditComment,
    comment,
    pendingContent,
    closeEditor,
    openEditor,
    replyKey,
    editKey,
    onCancelEdit,
  ]);

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitEditComment?.(comment.id, content)) ?? false;
      if (ok) editorSubmitSuccess(editKey);
      return ok;
    },
    [onSubmitEditComment, comment.id, editorSubmitSuccess, editKey],
  );

  return (
    <div className="comment-item" data-comment-id={comment.id}>
      <ThreadCommentHeader
        user={comment.user}
        createdAt={comment.created_at}
        likeCount={comment.like_count}
        isLiked={comment.is_liked}
        onLike={handleLike}
        onReply={canReply ? handleReply : undefined}
        isReplying={isReplying}
        onDelete={isOwnComment && onDelete ? handleDelete : undefined}
        onEdit={isOwnComment && canEdit ? handleEdit : undefined}
        isEditing={isEditing}
        deleteLabel="删除评论"
        deleteConfirmMessage="确定删除这条评论吗？"
        linkProfile
        moderation={comment.moderation}
      />

      {inlineEditOpen ? (
        <InlineReplyEditor
          value={editContent}
          onChange={(value) => setEditorContent(editKey, value)}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => closeEditor(editKey)}
              editing
              pendingReview={Boolean(comment.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
        <ThreadCommentContent
          content={comment.content}
          className={cn(inlineReplyOpen ? "mb-4" : hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
          moderation={comment.moderation}
          isOwner={isOwnComment}
        />
      )}

      {inlineReplyOpen && (
        <InlineReplyEditor
          value={replyContent}
          onChange={(value) => setEditorContent(replyKey, value)}
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={displayName} onCancel={() => closeEditor(replyKey)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={comment.id}
            targetType={targetType}
            replyCount={comment.reply_count}
            pendingReply={pendingReply}
            editedReply={editedReply}
            onReply={onReply}
            onSubmitReply={onSubmitReply}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onEditReply={onEditReply}
            onSubmitEditReply={onSubmitEditReply}
            onOpenChange={setRepliesOpen}
            activeReplyTarget={activeReplyTarget}
            activeEditTarget={activeEditTarget}
            onCancelReply={onCancelReply}
            onCancelEdit={onCancelEdit}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
