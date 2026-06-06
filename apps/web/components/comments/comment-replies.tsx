// apps/web/components/comments/comment-replies.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import type { ReplyTarget } from "./comment-item";

const PAGE_SIZE = 5;

type TargetType = "article" | "moment";

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function replyUrl(targetType: TargetType, commentId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/comments/${commentId}/replies`
      : `/api/moments/comments/${commentId}/replies`;
  return `${base}?page=${page}&page_size=${PAGE_SIZE}`;
}

interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  onReply?: (target: ReplyTarget) => void;
}

function ReplyItem({ reply, commentId, onReply }: ReplyItemProps) {
  const fromName = getDisplayName(reply.from_user);
  const toName = reply.to_user ? getDisplayName(reply.to_user) : null;
  const time = formatRelativeTime(new Date(reply.created_at));

  return (
    <div className="flex gap-2">
      <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{fromName}</span>
          <span className="text-[11px] text-[var(--fg3)]">{time}</span>
        </div>
        <p className="text-[13px] leading-[1.65] text-[var(--fg2)]">
          {toName && <span className="mr-1 text-[11px] font-semibold text-primary">@{toName}</span>}
          {reply.content}
        </p>
        <Button
          type="button"
          variant="ghost"
          onPress={() => onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName })}
          className="mt-1 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
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
  onLike: (commentId: number, replyId: number) => void;
}

export function CommentReplies({
  commentId,
  targetType,
  replyCount,
  pendingReply,
  onReply,
  onLike: _onLike,
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
      setIsOpen(true);
      void fetchReplies(1, false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, fetchReplies]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) void fetchReplies(page + 1, true);
  }, [isLoading, hasMore, page, fetchReplies]);

  if (replyCount <= 0) return null;

  // pendingReply 去重后追加到列表末尾
  const displayReplies = pendingReply
    ? [...replies.filter((r) => r.id !== pendingReply.id), pendingReply]
    : replies;

  if (!isOpen) {
    return (
      <div className="mt-3 border-l-2 border-border pl-3.5">
        <button
          type="button"
          onClick={handleToggle}
          className="text-xs font-semibold text-[var(--fg3)] transition-colors hover:text-primary"
        >
          --- 展开 {replyCount} 条回复
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 border-l-2 border-border pl-3.5">
      <div className="flex flex-col gap-3">
        {displayReplies.map((reply) => (
          <ReplyItem key={reply.id} reply={reply} commentId={commentId} onReply={onReply} />
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex gap-3">
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            isDisabled={isLoading}
            onPress={handleLoadMore}
            className="h-auto p-0 text-xs font-semibold text-[var(--fg3)] hover:text-primary"
          >
            {isLoading ? "加载中..." : "查看更多回复"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onPress={handleToggle}
          className="h-auto p-0 text-xs font-semibold text-[var(--fg3)] hover:text-primary"
        >
          收起回复
        </Button>
      </div>
    </div>
  );
}
