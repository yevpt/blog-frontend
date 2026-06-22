"use client";

import { useLoginModal } from "@/store/use-login-modal";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { CommentList } from "../parts/comment-list";
import { RichCommentInput } from "../inputs/rich-comment-input";
import { ReplyBanner } from "../inputs/reply-banner";

type TargetType = "article" | "moment";

interface InlineCommentsProps {
  targetType: TargetType;
  targetId: number;
  onCommentAdded?: () => void;
}

export function InlineComments({ targetType, targetId, onCommentAdded }: InlineCommentsProps) {
  const openLoginModal = useLoginModal((state) => state.open);

  const {
    userId,
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    replyTarget,
    content,
    pendingReplies,
    isSubmitting,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  } = useCommentSectionState({ targetType, targetId, onCommentAdded });

  return (
    <div className="flex flex-col gap-6">
      <RichCommentInput
        value={content}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder={replyTarget ? "写下你的回复..." : "写下你的评论..."}
      />
      {replyTarget && (
        <ReplyBanner toUsername={replyTarget.toUsername} onCancel={handleCancelReply} />
      )}
      <div>
        <CommentList
          comments={comments}
          isLoading={isLoading}
          error={error}
          hasMore={hasMore}
          pendingReplies={pendingReplies}
          targetType={targetType}
          onReply={handleReply}
          onLike={handleCommentLike}
          currentUserId={userId}
          onDelete={handleCommentDelete}
          onDeleteReply={handleReplyDelete}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
