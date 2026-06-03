import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { formatRelativeTime } from "@/lib/format-time";

export interface ReplyTarget {
  commentId: number;
  parentReplyId?: number;
  toUsername: string;
}

interface CommentItemProps {
  comment: CommentItemResp;
  onReply?: (target: ReplyTarget) => void;
}

function getDisplayName(user: { username: string; nickname?: string } | undefined): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function Avatar({ url, name, size }: { url?: string; name: string; size: "sm" | "md" }) {
  const className =
    size === "md" ? "h-7 w-7 shrink-0 rounded-full" : "h-[22px] w-[22px] shrink-0 rounded-full";
  const textClassName = size === "md" ? "text-xs" : "text-[10px]";

  if (url) return <img src={url} alt={name} className={className} />;
  return (
    <div
      className={`${className} flex items-center justify-center bg-border font-bold text-[var(--fg2)] ${textClassName}`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
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
      <Avatar url={reply.from_user?.avatar_url} name={fromName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{fromName}</span>
          <span className="text-[11px] text-[var(--fg3)]">{time}</span>
        </div>
        <p className="text-[13px] leading-[1.65] text-[var(--fg2)]">
          {toName && <span className="mr-1 text-[11px] font-semibold text-primary">@{toName}</span>}
          {reply.content}
        </p>
        <button
          type="button"
          onClick={() => onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName })}
          className="mt-1 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
        >
          回复
        </button>
      </div>
    </div>
  );
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
  const displayName = getDisplayName(comment.user);
  const time = formatRelativeTime(new Date(comment.created_at));

  return (
    <div className="comment-item">
      <div className="flex gap-2.5">
        <Avatar url={comment.user?.avatar_url} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{displayName}</span>
            <span className="text-[11px] text-[var(--fg3)]">{time}</span>
          </div>
          <p className="text-[13px] leading-[1.65] text-[var(--fg2)]">{comment.content}</p>
          <button
            type="button"
            onClick={() => onReply?.({ commentId: comment.id, toUsername: displayName })}
            className="mt-1.5 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
          >
            回复
          </button>
          {comment.replies.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3.5">
              {comment.replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} commentId={comment.id} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
