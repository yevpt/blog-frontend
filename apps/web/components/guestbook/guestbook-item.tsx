"use client";

import { useCallback, useMemo } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { markdownToHtmlSync } from "@repo/markdown";
import { UserAvatar } from "@/components/common/user-avatar";
import { PreviewableMarkdown } from "@/components/common/previewable-markdown";
import { formatRelativeTime } from "@/lib/format-time";
import { CommentReplies } from "@/components/comments/comment-replies";
import type { ReplyTarget } from "@/components/comments/comment-replies";

function getDisplayName(user: GuestbookItemResp["user"]): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function GuestbookBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <PreviewableMarkdown html={html} variant="comment" />;
}

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (id: number) => void;
  pendingReply?: CommentReplyResp | null;
}

export function GuestbookItem({ item, onReply, onLike, pendingReply }: GuestbookItemProps) {
  const displayName = getDisplayName(item.user);
  const time = formatRelativeTime(new Date(item.created_at));

  const handleLike = useCallback(() => onLike?.(item.id), [onLike, item.id]);
  const handleReply = useCallback(
    () => onReply?.({ commentId: item.id, toUsername: displayName }),
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
            <Button
              variant="text"
              onPress={handleLike}
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
            </Button>
          </div>

          <Button
            variant="text"
            onPress={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            回复
          </Button>

          {item.reply_count > 0 && (
            <CommentReplies
              commentId={item.id}
              targetType="guestbook"
              replyCount={item.reply_count}
              pendingReply={pendingReply}
              onReply={onReply ?? (() => undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
