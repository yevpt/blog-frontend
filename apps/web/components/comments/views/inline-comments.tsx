"use client";

import { useLoginModal } from "@/store/use-login-modal";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { CommentList } from "../parts/comment-list";
import { RichCommentInput } from "../inputs/rich-comment-input";

type TargetType = "article" | "moment";

interface InlineCommentsProps {
  targetType: TargetType;
  targetId: number;
  /** SSR 或父级已知的评论总数，用于首屏加载占位 */
  expectedCommentCount?: number;
  onCommentAdded?: () => void;
}

export function InlineComments({
  targetType,
  targetId,
  expectedCommentCount,
  onCommentAdded,
}: InlineCommentsProps) {
  const openLoginModal = useLoginModal((state) => state.open);

  const {
    userId,
    comments,
    isLoading,
    hasLoaded,
    hasMore,
    error,
    loadMore,
    content,
    pendingReplies,
    editedReplies,
    isSubmitting,
    handleReplySubmit,
    handleEditCommentSubmit,
    handleEditReplySubmit,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
  });

  return (
    <div className="flex flex-col gap-6">
      <RichCommentInput
        value={content}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder="写下你的评论..."
        maxLength={2000}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
      <div className="px-3">
        <CommentList
          comments={comments}
          isLoading={isLoading}
          expectedCommentCount={expectedCommentCount}
          hasLoaded={hasLoaded}
          error={error}
          hasMore={hasMore}
          pendingReplies={pendingReplies}
          editedReplies={editedReplies}
          targetType={targetType}
          onSubmitReply={handleReplySubmit}
          onLike={handleCommentLike}
          currentUserId={userId}
          onDelete={handleCommentDelete}
          onDeleteReply={handleReplyDelete}
          onSubmitEditComment={handleEditCommentSubmit}
          onSubmitEditReply={handleEditReplySubmit}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
