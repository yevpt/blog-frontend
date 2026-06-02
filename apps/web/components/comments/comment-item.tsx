import { cn } from "@repo/ui";

interface CommentItemData {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  replyTo?: string;
  replies?: CommentItemData[];
}

interface CommentItemProps {
  comment: CommentItemData;
  level?: number;
}

export function CommentItem({ comment, level = 0 }: CommentItemProps) {
  return (
    <div className={cn("flex gap-3", level > 0 && "pl-8 border-l border-border/30 mt-2")}>
      <img
        src={comment.avatar}
        alt={comment.author}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{comment.author}</span>
          <span className="text-[10px] text-muted-foreground">{comment.time}</span>
        </div>
        {comment.replyTo && <span className="text-xs text-accent mr-1">@{comment.replyTo}</span>}
        <p className="text-sm text-foreground/80 leading-relaxed">{comment.text}</p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ❤ 回复
          </button>
        </div>

        {/* 嵌套回复 */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} level={level + 1} />
        ))}
      </div>
    </div>
  );
}

export type { CommentItemData };
