import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

interface ArticleCardStatsProps {
  likes: number;
  comments: number;
  liked: boolean;
  onLikeToggle: () => void;
  onCommentClick: () => void;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(count);
}

export function ArticleCardStats({
  likes,
  comments,
  liked,
  onLikeToggle,
  onCommentClick,
}: ArticleCardStatsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {/* 爱心按钮：本地 toggle（不触发评论弹窗） */}
      <button
        type="button"
        onClick={onLikeToggle}
        aria-label={liked ? "取消喜欢" : "喜欢"}
        aria-pressed={liked}
        className={cn(
          "flex items-center gap-1 transition-colors duration-200",
          liked ? "text-red-500 [&_svg]:fill-red-500" : "hover:text-red-400",
        )}
      >
        <SvgIcon name="heart" size={14} />
        <span>{formatCount(likes + (liked ? 1 : 0))}</span>
      </button>

      {/* 评论按钮：触发评论弹窗 */}
      <button
        type="button"
        onClick={onCommentClick}
        aria-label="查看评论"
        className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
      >
        <SvgIcon name="message-circle" size={14} />
        <span>{formatCount(comments)}</span>
      </button>
    </div>
  );
}
