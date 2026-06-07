// apps/web/components/comments/comment-section.tsx
"use client";

import { useState, useCallback, useRef, useLayoutEffect, type RefObject } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { useCommentLike } from "@/hooks/use-comment-like";
import { CommentInput } from "./comment-input";
import { RichCommentInput } from "./rich-comment-input";
import { CommentItem, type ReplyTarget } from "./comment-item";
import { CommentListSkeleton } from "./comment-skeleton";

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
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const {
    comments,
    isLoading,
    hasMore,
    error,
    loadMore,
    addComment,
    incrementReplyCount,
    updateCommentLike,
  } = useCommentList(targetType, targetId);
  const {
    isSubmitting,
    error: submitError,
    clearError,
    submitComment,
    submitReply,
  } = useCommentSubmit(targetType, targetId);
  const { toggleCommentLike } = useCommentLike(targetType);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const internalScrollRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onContentResizeRef = useRef(onContentResize);
  onContentResizeRef.current = onContentResize;

  useLayoutEffect(() => {
    onContentResize?.();
  }, [comments.length, isLoading, error, hasMore, replyTarget, onContentResize]);

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
        const ro = new ResizeObserver(() => {
          onContentResizeRef.current?.();
        });
        ro.observe(node);
        // modal layout 下 scrollable div 的 firstElementChild 是内容 wrapper，
        // 它不受 overflow 限制，自然高度随内容（展开回复等）变化
        const content = node.firstElementChild;
        if (content) ro.observe(content);
        resizeObserverRef.current = ro;
      }
    },
    [externalScrollRef],
  );

  const scrollToListTop = useCallback(() => {
    requestAnimationFrame(() => {
      internalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const scrollToComment = useCallback((commentId: number) => {
    requestAnimationFrame(() => {
      const el = internalScrollRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      setReplyTarget(target);
      setContent("");
      clearError();
    },
    [userId, openLoginModal, clearError],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setContent("");
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;

    if (replyTarget) {
      const reply = await submitReply(replyTarget.commentId, content, replyTarget.parentReplyId);
      if (reply) {
        incrementReplyCount(replyTarget.commentId);
        setPendingReplies((prev) => ({ ...prev, [replyTarget.commentId]: reply }));
        setReplyTarget(null);
        setContent("");
        scrollToComment(replyTarget.commentId);
      }
      return;
    }

    const comment = await submitComment(content);
    if (comment) {
      addComment(comment);
      setContent("");
      onCommentAdded?.();
      scrollToListTop();
    }
  }, [
    content,
    replyTarget,
    submitReply,
    submitComment,
    addComment,
    incrementReplyCount,
    scrollToListTop,
    scrollToComment,
    onCommentAdded,
  ]);

  const handleCommentLike = useCallback(
    async (commentId: number) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      const result = await toggleCommentLike(commentId);
      if (result) {
        updateCommentLike(commentId, result.is_liked, result.like_count);
      }
    },
    [userId, openLoginModal, toggleCommentLike, updateCommentLike],
  );

  const commentList = (
    <>
      {isLoading && comments.length === 0 ? (
        <CommentListSkeleton />
      ) : error ? (
        <p className="py-4 text-center text-sm text-(--fg3)">{error}</p>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-(--fg3)">暂无评论，来发表第一条吧</p>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetType={targetType}
              onReply={handleReply}
              onLike={handleCommentLike}
              pendingReply={pendingReplies[comment.id] ?? null}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            isDisabled={isLoading}
            onPress={loadMore}
            className="h-8 rounded-full px-[18px] text-xs font-semibold text-(--fg2) hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            {isLoading ? "加载中..." : "查看更多评论"}
          </Button>
        </div>
      )}
    </>
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

  // modal layout：列表可滚动在上，输入框固定在下
  if (layout === "modal") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          ref={mergeRef}
          className="flex-1 overflow-y-auto px-[18px] py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* wrapper div 用于 ResizeObserver 监听自然高度变化（不受 overflow 限制） */}
          <div>{commentList}</div>
        </div>
        {input}
      </div>
    );
  }

  // inline layout：输入框在上，列表自然流（页面整体可滚动）
  return (
    <div className="flex flex-col gap-6">
      <RichCommentInput
        value={content}
        onChange={(v) => {
          setContent(v);
          clearError();
        }}
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
