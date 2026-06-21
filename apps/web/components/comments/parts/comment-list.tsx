"use client";

import { Button } from "@repo/ui";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import type { TargetType } from "@/hooks/use-comment-like";
import { CommentItem, type ReplyTarget } from "./comment-item";
import { CommentListSkeleton } from "./comment-skeleton";

export interface CommentListProps {
  comments: CommentItemResp[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  pendingReplies: Record<number, CommentReplyResp | null>;
  targetType: TargetType;
  onReply: (target: ReplyTarget) => void;
  onLike: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  onLoadMore: () => void;
}

export function CommentList({
  comments,
  isLoading,
  error,
  hasMore,
  pendingReplies,
  targetType,
  onReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onLoadMore,
}: CommentListProps) {
  if (isLoading && comments.length === 0) {
    return <CommentListSkeleton />;
  }

  if (error) {
    return <p className="py-4 text-center text-sm text-(--fg3)">{error}</p>;
  }

  if (comments.length === 0) {
    return <p className="py-8 text-center text-sm text-(--fg3)">暂无评论，来发表第一条吧</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-[18px]">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            targetType={targetType}
            onReply={onReply}
            onLike={onLike}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onDeleteReply={onDeleteReply}
            pendingReply={pendingReplies[comment.id] ?? null}
          />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            isDisabled={isLoading}
            onPress={onLoadMore}
            className="h-8 rounded-full px-[18px] text-xs font-semibold text-(--fg2) hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            {isLoading ? "加载中..." : "查看更多评论"}
          </Button>
        </div>
      )}
    </>
  );
}
