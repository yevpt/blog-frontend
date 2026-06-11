"use client";

import { useCallback } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useMarkdown, MarkdownContent } from "@repo/markdown";
import { renderMarkdown } from "@/app/actions/markdown";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatRelativeTime } from "@/lib/format-time";
import { GuestbookReplies } from "./guestbook-replies";

export interface GuestbookReplyTarget {
  guestbookId: number;
  parentReplyId?: number;
  toUsername: string;
}

function getDisplayName(user: GuestbookItemResp["user"]): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

/** 留言正文：异步渲染 Markdown，加载期间展示纯文本 */
function GuestbookBody({ content }: { content: string }) {
  const { html, isLoading } = useMarkdown(content, renderMarkdown);
  if (isLoading || !html) {
    return <span>{content}</span>;
  }
  return <MarkdownContent html={html} variant="comment" />;
}

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: GuestbookReplyTarget) => void;
  onLike?: (id: number) => void;
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({ item, onReply, onLike, pendingReply }: GuestbookItemProps) {
  const displayName = getDisplayName(item.user);
  const time = formatRelativeTime(new Date(item.created_at));

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ guestbookId: item.id, toUsername: displayName }),
    [onReply, item.id, displayName],
  );

  return (
    <div className="py-4">
      <div className="flex gap-2.5">
        <UserAvatar src={item.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            {item.user?.mark && (
              <span className="rounded-full bg-primary/10 px-2 text-[10px] font-semibold text-primary">
                {item.user.mark}
              </span>
            )}
            {item.user?.site && (
              <a
                href={item.user.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-(--fg3) transition-colors hover:text-primary"
              >
                {item.user.site.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>

          <div className="relative flex gap-2">
            <div className="min-w-0 flex-1 pr-7.5 text-[12px] text-(--fg1)">
              <GuestbookBody content={item.content} />
            </div>
            <button
              type="button"
              onClick={handleLike}
              aria-label={item.is_liked ? "取消点赞" : "点赞"}
              className={cn(
                "absolute right-1.75 top-0 flex shrink-0 flex-col items-center gap-0.5",
                item.is_liked ? "text-red-500" : "text-foreground/40",
              )}
            >
              <SvgIcon name={item.is_liked ? "heart-fill" : "heart"} size={16} />
              {item.like_count > 0 && (
                <span className="text-[10px] font-medium">{item.like_count}</span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            回复
          </button>

          {item.reply_count > 0 && (
            <GuestbookReplies
              guestbookId={item.id}
              replyCount={item.reply_count}
              pendingReply={pendingReply ?? null}
              onReply={onReply ?? (() => undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
