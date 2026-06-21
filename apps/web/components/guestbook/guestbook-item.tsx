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
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({ item, onReply, onLike, pendingReply }: GuestbookItemProps) {
  const displayName = getThreadDisplayName(item.user);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const hasReplies = item.reply_count > 0;

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ commentId: item.id, toUsername: displayName }),
    [onReply, item.id, displayName],
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
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
}
