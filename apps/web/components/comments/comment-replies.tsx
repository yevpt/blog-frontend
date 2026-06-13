// apps/web/components/comments/comment-replies.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentLike } from "@/hooks/use-comment-like";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import { markdownToHtmlSync, MarkdownContent } from "@repo/markdown";
import type { ReplyTarget } from "./comment-item";

export type { ReplyTarget };

const PAGE_SIZE = 5;

export type TargetType = "article" | "moment" | "guestbook";

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function replyUrl(targetType: TargetType, commentId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/comments/${commentId}/replies`
      : targetType === "moment"
        ? `/api/moments/comments/${commentId}/replies`
        : `/api/guestbook/comments/${commentId}/replies`;
  return `${base}?page=${page}&page_size=${PAGE_SIZE}`;
}

function ReplyBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <MarkdownContent html={html} variant="comment" />;
}

interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLikeResult?: (replyId: number, isLiked: boolean, likeCount: number) => void;
}

function ReplyItem({ reply, commentId, targetType, onReply, onLikeResult }: ReplyItemProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const { toggleReplyLike } = useCommentLike(targetType);

  const fromName = getDisplayName(reply.from_user);
  const toName = reply.to_user ? getDisplayName(reply.to_user) : null;
  const time = formatRelativeTime(new Date(reply.created_at));

  const handleLike = useCallback(async () => {
    if (!userId) {
      openLoginModal();
      return;
    }
    const result = await toggleReplyLike(commentId, reply.id);
    if (result) {
      onLikeResult?.(reply.id, result.is_liked, result.like_count);
    }
  }, [userId, openLoginModal, toggleReplyLike, commentId, reply.id, onLikeResult]);

  return (
    <div className="flex gap-2 [animation:replyFadeIn_0.2s_ease-out_both]">
      <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{fromName}</span>
          <span className="text-[11px] text-(--fg3)">{time}</span>
        </div>
        <div className="relative">
          <div className="min-w-0 pr-7.5 text-[13px] leading-[1.65] text-(--fg2)">
            {toName && (
              <span className="mr-1 text-[11px] font-semibold text-primary">@{toName}</span>
            )}
            <ReplyBody content={reply.content} />
          </div>
          <Button
            variant="text"
            type="button"
            onClick={handleLike}
            aria-label={reply.is_liked ? "取消点赞" : "点赞"}
            className={cn(
              "absolute top-0 right-1.75 flex shrink-0 flex-col items-center gap-0.5 self-start pt-0.5",
              reply.is_liked ? "text-red-500 hover:text-red-500" : "text-foreground/40",
            )}
          >
            <SvgIcon name={reply.is_liked ? "heart-fill" : "heart"} size={14} />
            {reply.like_count > 0 && (
              <span
                className={`text-[10px] font-medium ${reply.is_liked ? "text-red-500" : "text-(--fg3)"}`}
              >
                {reply.like_count}
              </span>
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="text"
          onPress={() => onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName })}
          className="mt-3 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
        >
          回复
        </Button>
      </div>
    </div>
  );
}

export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  onReply: (target: ReplyTarget) => void;
}

export function CommentReplies({
  commentId,
  targetType,
  replyCount,
  pendingReply,
  onReply,
}: CommentRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(replyUrl(targetType, commentId, pageNum));
        if (!res.ok) throw new Error("fetch failed");
        const data: CommentReplyPageResp = await res.json();
        setReplies((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
        if (!append) setIsOpen(true);
      } catch {
        setError("加载回复失败");
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, commentId],
  );

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setError(null);
      void fetchReplies(1, false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, fetchReplies]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) void fetchReplies(page + 1, true);
  }, [isLoading, hasMore, page, fetchReplies]);

  const updateReplyLike = useCallback((replyId: number, isLiked: boolean, likeCount: number) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, is_liked: isLiked, like_count: likeCount } : r)),
    );
  }, []);

  if (replyCount <= 0) return null;

  const displayReplies = pendingReply
    ? [...replies.filter((r) => r.id !== pendingReply.id), pendingReply]
    : replies;

  if (!isOpen) {
    return (
      <div>
        <Button
          variant="text"
          onClick={handleToggle}
          isDisabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-(--fg2) transition-colors"
        >
          <div className="h-px w-4 bg-accent-foreground/15"></div>
          {isLoading ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              加载中
            </>
          ) : (
            <>展开 {replyCount} 条回复</>
          )}
        </Button>
        {error && !isLoading && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3">
        {displayReplies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            commentId={commentId}
            targetType={targetType}
            onReply={onReply}
            onLikeResult={updateReplyLike}
          />
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex gap-3">
        {hasMore && (
          <Button
            variant="text"
            size="sm"
            isDisabled={isLoading}
            onPress={handleLoadMore}
            className="flex items-center gap-1 text-xs font-semibold text-(--fg2)"
          >
            {isLoading && (
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            )}
            {isLoading ? "加载中" : "查看更多回复"}
          </Button>
        )}
        <Button
          variant="text"
          size="sm"
          onPress={handleToggle}
          className="text-xs font-semibold text-(--fg2)"
        >
          收起回复
        </Button>
      </div>
    </div>
  );
}
