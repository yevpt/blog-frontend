"use client";

import { useCallback } from "react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { formatRelativeTime } from "@/lib/format-time";
import { UserAvatar } from "@/components/common/user-avatar";
import { CommentReplies } from "./comment-replies";

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

type TargetType = "article" | "moment";

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

interface CommentItemProps {
  comment: CommentItemResp;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (commentId: number) => void;
  pendingReply?: CommentReplyResp | null;
}

export function CommentItem({
  comment,
  targetType,
  onReply,
  onLike,
  pendingReply,
}: CommentItemProps) {
  const displayName = getDisplayName(comment.user);
  const time = formatRelativeTime(new Date(comment.created_at));

  const handleLike = useCallback(() => {
    onLike?.(comment.id);
  }, [onLike, comment.id]);

  const handleReply = useCallback(() => {
    onReply?.({ commentId: comment.id, toUsername: displayName });
  }, [onReply, comment.id, displayName]);

  return (
    <div className="comment-item" data-comment-id={comment.id}>
      <div className="flex gap-2.5">
        <UserAvatar src={comment.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          {/* 用户信息行 */}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            <span className="text-[11px] text-(--fg3)">{time}</span>
          </div>

          {/* 评论正文 + 右侧点赞区 */}
          <div className="flex gap-2 relative">
            <p className="min-w-0 pr-7.5 flex-1 text-[12px] text-(--fg1)">{comment.content}</p>
            {/* INS 风格点赞按钮 */}
            <Button
              variant="text"
              type="button"
              onClick={handleLike}
              aria-label={comment.is_liked ? "取消点赞" : "点赞"}
              className={cn(
                "absolute top-0 right-1.75 flex shrink-0 flex-col items-center gap-0.5 self-start pt-0.5",
                comment.is_liked
                  ? "text-red-500 hover:text-red-500"
                  : "text-black/54 dark:text-(--fg3)",
              )}
            >
              <SvgIcon
                className="animate-[heartbeat_3s_ease-in-out_infinite]"
                name={comment.is_liked ? "heart-fill" : "heart"}
                size={16}
              />
              {comment.like_count > 0 && (
                <span
                  className={`text-[10px] font-medium ${comment.is_liked ? "text-red-500" : "text-(--fg3)"}`}
                >
                  {comment.like_count}
                </span>
              )}
            </Button>
          </div>

          {/* 回复按钮 */}
          <Button
            type="button"
            variant="text"
            onPress={handleReply}
            className="mt-1.5 text-[11px] font-medium text-(--fg3) transition-colors"
          >
            回复
          </Button>

          {/* 回复子列表（懒加载） */}
          <CommentReplies
            commentId={comment.id}
            targetType={targetType}
            replyCount={comment.reply_count}
            pendingReply={pendingReply}
            onReply={onReply ?? (() => undefined)}
          />
        </div>
      </div>
    </div>
  );
}
