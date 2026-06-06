// apps/web/components/comments/comment-section.tsx
"use client";

import { useState, useCallback, type RefObject } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp } from "@repo/api";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { useCommentLike } from "@/hooks/use-comment-like";
import { CommentInput } from "./comment-input";
import { CommentItem, type ReplyTarget } from "./comment-item";

type TargetType = "article" | "moment";

interface CommentSectionProps {
  targetType: TargetType;
  targetId: number;
  /** modal：输入框在底部（默认）；inline：输入框在顶部，列表自然流 */
  layout?: "modal" | "inline";
  /** modal layout 时由 CommentModal 传入，供 useSheetGesture 读取 scrollTop */
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export function CommentSection({
  targetType,
  targetId,
  layout = "modal",
  scrollRef: _scrollRef,
}: CommentSectionProps) {
  const { comments, isLoading, hasMore, error, loadMore, addComment, incrementReplyCount } =
    useCommentList(targetType, targetId);
  const { isSubmitting, error: submitError, clearError, submitComment, submitReply } =
    useCommentSubmit(targetType, targetId);
  const { toggleCommentLike, toggleReplyLike } = useCommentLike(targetType);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");
  // 每个评论最新待展示的回复（由 CommentReplies 的 pendingReply prop 消费）
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      setReplyTarget(target);
      setContent("");
      clearError();
    },
    [clearError],
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
      }
      return;
    }

    const comment = await submitComment(content);
    if (comment) {
      addComment(comment);
      setContent("");
    }
  }, [content, replyTarget, submitReply, submitComment, addComment, incrementReplyCount]);

  const handleCommentLike = useCallback(
    async (commentId: number) => {
      await toggleCommentLike(commentId);
    },
    [toggleCommentLike],
  );

  const handleReplyLike = useCallback(
    async (commentId: number, replyId: number) => {
      await toggleReplyLike(commentId, replyId);
    },
    [toggleReplyLike],
  );

  const commentList = (
    <>
      {isLoading && comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--fg3)]">加载中...</div>
      ) : error ? (
        <p className="py-4 text-center text-sm text-[var(--fg3)]">{error}</p>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--fg3)]">暂无评论，来发表第一条吧</p>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetType={targetType}
              onReply={handleReply}
              onLike={handleCommentLike}
              onReplyLike={handleReplyLike}
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
            className="h-8 rounded-full px-[18px] text-xs font-semibold text-[var(--fg2)] hover:border-primary hover:bg-primary/10 hover:text-primary"
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
          ref={_scrollRef}
          className="flex-1 overflow-y-auto px-[18px] py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {commentList}
        </div>
        {input}
      </div>
    );
  }

  // inline layout：输入框在上，列表自然流（页面整体可滚动）
  return (
    <div className="flex flex-col gap-6">
      {input}
      <div>{commentList}</div>
    </div>
  );
}
