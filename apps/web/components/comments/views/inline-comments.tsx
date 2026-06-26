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
  onCommentAdded?: () => void;
}

export function InlineComments({ targetType, targetId, onCommentAdded }: InlineCommentsProps) {
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
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
    onScrollToEditor: scrollToEditor,
  });

  const placeholder = replyTarget ? `回复 @${replyTarget.toUsername}…` : "写下你的评论...";

  const replyHeader = replyTarget ? (
    <ReplyBanner toUsername={replyTarget.toUsername} onCancel={handleCancelReply} />
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
