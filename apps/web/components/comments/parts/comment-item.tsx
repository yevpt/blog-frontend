"use client";

import { memo, useCallback, useState } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { cn } from "@repo/ui";
import type { TargetType } from "@/hooks/use-comment-like";
import { CommentReplies } from "./comment-replies";
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

const NOOP_REPLY = () => undefined;

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  onEditComment?: (target: EditTarget) => void;
  onEditReply?: (target: ReplyEditTarget) => void;
  pendingReply?: CommentReplyResp | null;
  editedReply?: CommentReplyResp | null;
}

export const CommentItem = memo(function CommentItem({
  comment,
  targetType,
  onReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onEditComment,
  onEditReply,
  pendingReply,
  editedReply,
}: CommentItemProps) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const hasReplies = comment.reply_count > 0;
  const isOwnComment = currentUserId != null && currentUserId === comment.user_id;
  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    const displayName = comment.user?.nickname ?? comment.user?.username ?? "匿名";
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [onReply, comment.id, comment.user]);

  const handleDelete = useCallback(() => {
    return onDelete?.(comment.id) ?? false;
  }, [onDelete, comment.id]);

  const handleEdit = useCallback(() => {
    if (!isOwnComment || !onEditComment) return;
    // 编辑时优先使用待审版本：让作者编辑的是 pending_content 而非公开旧版本
    const pendingContent =
      comment.moderation?.pending_content?.trim() && comment.moderation!.pending_content!.length > 0
        ? comment.moderation!.pending_content!
        : comment.content;
    onEditComment({
      type: "comment",
      id: comment.id,
      initialContent: pendingContent,
      pendingReview: Boolean(comment.moderation?.has_pending_revision),
    });
  }, [isOwnComment, onEditComment, comment]);

  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(comment.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, comment.id],
  );

  return (
    <div className="comment-item" data-comment-id={comment.id}>
      <ThreadCommentHeader
        user={comment.user}
        createdAt={comment.created_at}
        likeCount={comment.like_count}
        isLiked={comment.is_liked}
        onLike={handleLike}
        onReply={onReply ? handleReply : undefined}
        onDelete={isOwnComment && onDelete ? handleDelete : undefined}
        onEdit={isOwnComment && onEditComment ? handleEdit : undefined}
        deleteLabel="删除评论"
        deleteConfirmMessage="确定删除这条评论吗？"
        linkProfile
        moderation={comment.moderation}
      />

      <ThreadCommentContent
        content={comment.content}
        className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
        moderation={comment.moderation}
      />

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={comment.id}
            targetType={targetType}
            replyCount={comment.reply_count}
            pendingReply={pendingReply}
            editedReply={editedReply}
            onReply={onReply ?? NOOP_REPLY}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onEditReply={onEditReply}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
