"use client";

import { Button } from "@repo/ui";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import type { TargetType } from "@/hooks/use-comment-like";
import { CommentItem } from "./comment-item";
import type { EditTarget, EditTargetValue, ReplyEditTarget, ReplyTarget } from "./comment-item";
import { CommentListSkeleton } from "./comment-skeleton";

const COMMENT_PAGE_SIZE = 10;

/** 根据已知评论总数计算首屏骨架屏条数 */
export function getCommentListSkeletonCount(expectedCommentCount?: number): number {
  if (expectedCommentCount === undefined || expectedCommentCount <= 0) {
    return 3;
  }
  return Math.min(expectedCommentCount, COMMENT_PAGE_SIZE);
}

export interface CommentListProps {
  comments: CommentItemResp[];
  isLoading: boolean;
  /** SSR 或父级已知的评论总数，用于首屏加载占位 */
  expectedCommentCount?: number;
  /** 是否已完成至少一次列表请求 */
  hasLoaded?: boolean;
  error: string | null;
  hasMore: boolean;
  pendingReplies: Record<number, CommentReplyResp | null>;
  /** 编辑成功后按 commentId 索引的最新回复，触发对应评论回复列表原位替换 */
  editedReplies?: Record<number, CommentReplyResp | null>;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLike: (commentId: number) => void;
  currentUserId?: number | null;
  onDelete?: (commentId: number) => Promise<boolean>;
  onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  onEditComment?: (target: EditTarget) => void;
  onSubmitEditComment?: (commentId: number, content: string) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  onLoadMore: () => void;
  /** 单底部输入框（弹窗）场景：当前激活的回复目标，命中顶层评论时按钮显示「取消回复」。 */
  activeReplyTarget?: ReplyTarget | null;
  /** 单底部输入框场景：当前激活的编辑目标，命中对应评论/回复时按钮显示「取消编辑」。 */
  activeEditTarget?: EditTargetValue | null;
  /** 取消激活的回复目标（与 activeReplyTarget 配对的「取消回复」回调）。 */
  onCancelReply?: () => void;
  /** 取消激活的编辑目标（与 activeEditTarget 配对的「取消编辑」回调）。 */
  onCancelEdit?: () => void;
}

export function CommentList({
  comments,
  isLoading,
  expectedCommentCount,
  hasLoaded = true,
  error,
  hasMore,
  pendingReplies,
  editedReplies,
  targetType,
  onReply,
  onSubmitReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onEditComment,
  onSubmitEditComment,
  onEditReply,
  onSubmitEditReply,
  onLoadMore,
  activeReplyTarget,
  activeEditTarget,
  onCancelReply,
  onCancelEdit,
}: CommentListProps) {
  if (error) {
    return <p className="py-4 text-center text-sm text-(--fg3)">{error}</p>;
  }

  if (comments.length === 0) {
    const awaitingInitialData =
      isLoading || (expectedCommentCount !== undefined && expectedCommentCount > 0 && !hasLoaded);

    if (awaitingInitialData) {
      return <CommentListSkeleton count={getCommentListSkeletonCount(expectedCommentCount)} />;
    }

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
            onSubmitReply={onSubmitReply}
            onLike={onLike}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onDeleteReply={onDeleteReply}
            onEditComment={onEditComment}
            onSubmitEditComment={onSubmitEditComment}
            onEditReply={onEditReply}
            onSubmitEditReply={onSubmitEditReply}
            pendingReply={pendingReplies[comment.id] ?? null}
            editedReply={editedReplies?.[comment.id] ?? null}
            activeReplyTarget={activeReplyTarget}
            activeEditTarget={activeEditTarget}
            onCancelReply={onCancelReply}
            onCancelEdit={onCancelEdit}
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
