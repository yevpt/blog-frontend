"use client";

import { memo, useCallback, useState } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { cn } from "@repo/ui";
import type { TargetType } from "@/hooks/use-comment-like";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
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
}: CommentItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasReplies = comment.reply_count > 0;
  const isOwnComment = currentUserId != null && currentUserId === comment.user_id;
  const displayName = comment.user?.nickname ?? comment.user?.username ?? "匿名";

  const canReply = Boolean(onSubmitReply || onReply);
  const canEdit = Boolean(onSubmitEditComment || onEditComment);

  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    if (!userId) {
      openLoginModal();
      return;
    }
    if (onSubmitReply) {
      setIsEditing(false);
      setIsReplying(true);
      return;
    }
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [userId, openLoginModal, onSubmitReply, onReply, comment.id, displayName]);

  const handleDelete = useCallback(() => {
    return onDelete?.(comment.id) ?? false;
  }, [onDelete, comment.id]);

  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(comment.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, comment.id],
  );

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(comment.id, undefined, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, comment.id],
  );

  // 编辑时优先使用待审版本：让作者编辑的是 pending_content 而非公开旧版本
  const pendingContent =
    comment.moderation?.pending_content?.trim() && comment.moderation!.pending_content!.length > 0
      ? comment.moderation!.pending_content!
      : comment.content;

  const handleEdit = useCallback(() => {
    if (!isOwnComment || !canEdit) return;
    if (onSubmitEditComment) {
      setIsReplying(false);
      setIsEditing(true);
      return;
    }
    onEditComment?.({
      type: "comment",
      id: comment.id,
      initialContent: pendingContent,
      pendingReview: Boolean(comment.moderation?.has_pending_revision),
    });
  }, [isOwnComment, canEdit, onSubmitEditComment, onEditComment, comment, pendingContent]);

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitEditComment?.(comment.id, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onSubmitEditComment, comment.id],
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
        onDelete={isOwnComment && onDelete ? handleDelete : undefined}
        onEdit={isOwnComment && canEdit ? handleEdit : undefined}
        deleteLabel="删除评论"
        deleteConfirmMessage="确定删除这条评论吗？"
        linkProfile
        moderation={comment.moderation}
      />

      {isEditing ? (
        <InlineReplyEditor
          initialValue={pendingContent}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => setIsEditing(false)}
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
          className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
          moderation={comment.moderation}
          isOwner={isOwnComment}
        />
      )}

      {isReplying && (
        <InlineReplyEditor
          placeholder={`回复 @${displayName}…`}
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
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
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
