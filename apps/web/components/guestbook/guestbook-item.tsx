"use client";

import { useCallback, useState } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import {
  CommentReplies,
  getThreadDisplayName,
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
  type ReplyTarget,
} from "@/components/comments";

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({
  item,
  onReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
}: GuestbookItemProps) {
  const displayName = getThreadDisplayName(item.user);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const hasReplies = item.reply_count > 0;
  const isOwnItem = currentUserId != null && currentUserId === item.from_user_id;

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ commentId: item.id, toUsername: displayName }),
    [onReply, item.id, displayName],
  );
  const handleDelete = useCallback(() => onDelete?.(item.id) ?? false, [onDelete, item.id]);
  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(item.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, item.id],
  );

  return (
    <div className={cn("pt-4", hasReplies ? "pb-5" : "pb-2")}>
      <ThreadCommentHeader
        user={item.user}
        createdAt={item.created_at}
        likeCount={item.like_count}
        isLiked={item.is_liked}
        onLike={handleLike}
        onReply={onReply ? handleReply : undefined}
        onDelete={isOwnItem && onDelete ? handleDelete : undefined}
        deleteLabel="删除留言"
        deleteConfirmMessage="确定删除这条留言吗？"
        linkProfile
      />

      <ThreadCommentContent
        content={item.content}
        className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
      />

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={item.id}
            targetType="guestbook"
            replyCount={item.reply_count}
            pendingReply={pendingReply}
            onReply={onReply ?? (() => undefined)}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
}
