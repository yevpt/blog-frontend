// apps/web/components/comments/comment-section.tsx
"use client";

import { useCallback, useRef, useLayoutEffect, type RefObject } from "react";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentSectionState } from "@/hooks/use-comment-section-state";
import { CommentInput } from "./comment-input";
import { RichCommentInput } from "./rich-comment-input";
import { CommentList } from "./parts/comment-list";

type TargetType = "article" | "moment";

interface CommentSectionProps {
  targetType: TargetType;
  targetId: number;
  layout?: "modal" | "inline";
  scrollRef?: RefObject<HTMLDivElement | null>;
  onCommentAdded?: () => void;
  /** 列表内容尺寸变化时回调，供外层弹窗同步高度动效 */
  onContentResize?: () => void;
}

export function CommentSection({
  targetType,
  targetId,
  layout = "modal",
  scrollRef: externalScrollRef,
  onCommentAdded,
  onContentResize,
}: CommentSectionProps) {
  const openLoginModal = useLoginModal((state) => state.open);

  const internalScrollRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onContentResizeRef = useRef(onContentResize);
  onContentResizeRef.current = onContentResize;

  const scrollToListTop = useCallback(() => {
    requestAnimationFrame(() => {
      internalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const scrollToComment = useCallback((commentId: number) => {
    requestAnimationFrame(() => {
      const element = internalScrollRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    setContent,
    pendingReplies,
    isSubmitting,
    submitError,
    handleReply,
    handleCancelReply,
    handleSubmit,
    handleCommentLike,
    handleChange,
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

  const mergeRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      internalScrollRef.current = node;
      if (externalScrollRef) {
        externalScrollRef.current = node;
      }

      if (node && typeof window !== "undefined" && "ResizeObserver" in window) {
        const observer = new ResizeObserver(() => {
          onContentResizeRef.current?.();
        });
        observer.observe(node);
        const contentNode = node.firstElementChild;
        if (contentNode) {
          observer.observe(contentNode);
        }
        resizeObserverRef.current = observer;
      }
    },
    [externalScrollRef],
  );

  const commentList = (
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
  );

  const input = (
    <CommentInput
      value={content}
      onChange={setContent}
      onSubmit={handleSubmit}
      replyTarget={replyTarget}
      onCancelReply={handleCancelReply}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );

  if (layout === "modal") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          ref={mergeRef}
          className="flex-1 overflow-y-auto px-[18px] py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          <div>{commentList}</div>
        </div>
        {input}
      </div>
    );
  }

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
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-(--fg3)">正在回复</span>
          <span className="font-semibold text-primary">@{replyTarget.toUsername}</span>
          <button
            type="button"
            onClick={handleCancelReply}
            className="text-[11px] text-(--fg3) hover:text-foreground"
          >
            取消
          </button>
        </div>
      )}
      <div>{commentList}</div>
    </div>
  );
}
