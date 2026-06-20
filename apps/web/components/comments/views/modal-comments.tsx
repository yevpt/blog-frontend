"use client";

import { useLayoutEffect, type RefObject } from "react";
import { useCommentSectionState } from "../hooks/use-comment-section-state";
import { useCommentScroll } from "../hooks/use-comment-scroll";
import { CommentList } from "../parts/comment-list";
import { PillCommentInput } from "../inputs/pill-comment-input";

type TargetType = "article" | "moment";

interface ModalCommentsProps {
  targetType: TargetType;
  targetId: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onCommentAdded?: () => void;
  /** 列表内容尺寸变化时回调，供外层弹窗同步高度动效 */
  onContentResize?: () => void;
}

export function ModalComments({
  targetType,
  targetId,
  scrollRef: externalScrollRef,
  onCommentAdded,
  onContentResize,
}: ModalCommentsProps) {
  const { scrollRef, scrollToListTop, scrollToComment } = useCommentScroll({
    externalScrollRef,
    onContentResize,
  });

  const {
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    replyTarget,
    content,
    setContent,
    pendingReplies,
    isSubmitting,
    submitError,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
  } = useCommentSectionState({
    targetType,
    targetId,
    onCommentAdded,
    onScrollToListTop: scrollToListTop,
    onScrollToComment: scrollToComment,
  });

  useLayoutEffect(() => {
    onContentResize?.();
  }, [comments.length, error, hasMore, isLoading, onContentResize, replyTarget]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[18px] py-4"
        style={{ overscrollBehavior: "contain" }}
      >
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
            onLoadMore={loadMore}
          />
        </div>
      </div>
      <PillCommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        replyTarget={replyTarget}
        onCancelReply={handleCancelReply}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
