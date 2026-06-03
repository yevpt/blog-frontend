"use client";

import { useState, useCallback } from "react";
import { Button } from "@repo/ui";
import { useCommentList } from "@/hooks/use-comment-list";
import { useCommentSubmit } from "@/hooks/use-comment-submit";
import { CommentInput } from "./comment-input";
import { CommentItem, type ReplyTarget } from "./comment-item";

interface CommentSectionProps {
  targetType: "article" | "moment" | "guestbook";
  targetId: number;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { comments, isLoading, hasMore, error, loadMore, addComment, addReply } = useCommentList(
    targetType,
    targetId,
  );
  const {
    isSubmitting,
    error: submitError,
    clearError,
    submitComment,
    submitReply,
  } = useCommentSubmit(targetType, targetId);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [content, setContent] = useState("");

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
        addReply(replyTarget.commentId, reply);
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
  }, [content, replyTarget, submitReply, submitComment, addReply, addComment]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-[18px] py-4">
        {isLoading && comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--fg3)]">加载中...</div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-[var(--fg3)]">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--fg3)]">暂无评论，来发表第一条吧</p>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
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
      </div>
      <CommentInput
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
