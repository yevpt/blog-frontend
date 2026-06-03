import { SvgIcon } from "@repo/icons";

export interface CommentThread {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  mention?: string;
  replies?: CommentThread[];
}

interface CommentItemProps {
  comment: CommentThread;
  isReply?: boolean;
}

export function CommentItem({ comment, isReply = false }: CommentItemProps) {
  return (
    <div className={isReply ? "reply-item" : "comment-item"}>
      <div className="flex gap-2.5">
        <img
          src={comment.avatar}
          alt={comment.author}
          className={isReply ? "h-[22px] w-[22px] rounded-full" : "h-7 w-7 rounded-full"}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{comment.author}</span>
            <span className="text-[11px] text-[var(--fg3)]">{comment.time}</span>
          </div>
          <p className="text-[13px] leading-[1.65] text-[var(--fg2)]">
            {comment.mention && (
              <span className="mr-1 text-[11px] font-semibold text-primary">
                @{comment.mention}
              </span>
            )}
            {comment.text}
          </p>
          <div className="mt-1.5 flex gap-0.5">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <SvgIcon name="heart" size={12} />
              {comment.likes}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
            >
              回复
            </button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3.5">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
