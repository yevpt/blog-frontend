"use client";

import { useState, useCallback, useMemo } from "react";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { markdownToHtmlSync, MarkdownContent } from "@repo/markdown";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatRelativeTime } from "@/lib/format-time";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import type { ReplyTarget } from "@/components/comments/comment-replies";

const PAGE_SIZE = 5;

function ReplyBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <MarkdownContent html={html} variant="comment" />;
}

function getReplyDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

interface GuestbookRepliesProps {
  guestbookId: number;
  replyCount: number;
  pendingReply: CommentReplyResp | null;
  onReply: (target: ReplyTarget) => void;
}

export function GuestbookReplies({
  guestbookId,
  replyCount,
  pendingReply,
  onReply,
}: GuestbookRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const { toggleReplyLike } = useGuestbookLike();

  const fetchReplies = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/guestbook/comments/${guestbookId}/replies?page=${pageNum}&page_size=${PAGE_SIZE}`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as CommentReplyPageResp;
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
    [guestbookId],
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

  const handleReplyLike = useCallback(
    async (replyId: number) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      const result = await toggleReplyLike(guestbookId, replyId);
      if (result) {
        setReplies((prev) =>
          prev.map((r) =>
            r.id === replyId
              ? { ...r, is_liked: result.is_liked, like_count: result.like_count }
              : r,
          ),
        );
      }
    },
    [userId, openLoginModal, toggleReplyLike, guestbookId],
  );

  if (replyCount <= 0) return null;

  // pendingReply 去重后追加到列表末尾
  const displayReplies = pendingReply
    ? [...replies.filter((r) => r.id !== pendingReply.id), pendingReply]
    : replies;

  if (!isOpen) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-(--fg2)"
        >
          <div className="h-px w-4 bg-accent-foreground/15" />
          {isLoading ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              加载中
            </>
          ) : (
            <>展开 {replyCount} 条回复</>
          )}
        </button>
        {error && !isLoading && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {displayReplies.map((reply) => {
        const fromName = getReplyDisplayName(reply.from_user);
        const toName = reply.to_user ? getReplyDisplayName(reply.to_user) : null;
        const time = formatRelativeTime(new Date(reply.created_at));
        return (
          <div key={reply.id} className="flex gap-2 [animation:replyFadeIn_0.2s_ease-out_both]">
            <UserAvatar src={reply.from_user?.avatar_url} name={fromName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => void handleReplyLike(reply.id)}
                  aria-label={reply.is_liked ? "取消点赞" : "点赞"}
                  className={cn(
                    "absolute right-1.75 top-0 flex shrink-0 flex-col items-center gap-0.5",
                    reply.is_liked ? "text-red-500" : "text-foreground/40",
                  )}
                >
                  <SvgIcon name={reply.is_liked ? "heart-fill" : "heart"} size={14} />
                  {reply.like_count > 0 && (
                    <span className="text-[10px] font-medium">{reply.like_count}</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  onReply({ commentId: guestbookId, parentReplyId: reply.id, toUsername: fromName })
                }
                className="mt-3 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
              >
                回复
              </button>
            </div>
          </div>
        );
      })}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        {hasMore && (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleLoadMore}
            className="text-xs font-semibold text-(--fg2) disabled:opacity-50"
          >
            {isLoading ? "加载中…" : "查看更多回复"}
          </button>
        )}
        <button type="button" onClick={handleToggle} className="text-xs font-semibold text-(--fg2)">
          收起回复
        </button>
      </div>
    </div>
  );
}
