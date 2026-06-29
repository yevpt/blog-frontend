"use client";

import { useCallback, useRef, useState } from "react";
import { useLoginModal } from "@/store/use-login-modal";
import { runAfterSmoothScroll, scrollIntoViewBelowFixedHeader } from "@/lib/scroll-into-view";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { CommentList } from "../parts/comment-list";
import { RichCommentInput } from "../inputs/rich-comment-input";
import { ReplyBanner } from "../inputs/reply-banner";

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
  const editorRef = useRef<HTMLDivElement>(null);
  const [focusNonce, setFocusNonce] = useState<number | null>(null);

  const scrollToEditor = useCallback(() => {
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      scrollIntoViewBelowFixedHeader(el);
      runAfterSmoothScroll(() => setFocusNonce((n) => (n ?? 0) + 1));
    });
  }, []);

  const {
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
    pendingReplies,
    editedReplies,
    isSubmitting,
    handleReply,
    handleCancelReply,
    handleCancelEdit,
    handleEditComment,
    handleEditReply,
    handleSubmit,
    handleCommentLike,
    handleCommentDelete,
    handleReplyDelete,
    handleChange,
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
    onScrollToEditor: scrollToEditor,
  });

  const placeholder = replyTarget
    ? `回复 @${replyTarget.toUsername}…`
    : editTarget
      ? "编辑内容..."
      : "写下你的评论...";

  const replyHeader = replyTarget ? (
    <ReplyBanner toUsername={replyTarget.toUsername} onCancel={handleCancelReply} />
  ) : editTarget ? (
    <ReplyBanner
      toUsername="编辑中"
      onCancel={handleCancelEdit}
      editing
      pendingReview={editTarget.pendingReview}
    />
  ) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div ref={editorRef}>
        <RichCommentInput
          value={content}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          placeholder={placeholder}
          header={replyHeader}
          focusTrigger={focusNonce}
          maxLength={2000}
          className="focus-within:border-foreground/15 transition-colors duration-200"
        />
      </div>
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
          onReply={handleReply}
          onLike={handleCommentLike}
          currentUserId={userId}
          onDelete={handleCommentDelete}
          onDeleteReply={handleReplyDelete}
          onEditComment={handleEditComment}
          onEditReply={handleEditReply}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
