import { SvgIcon } from "@repo/icons";

interface ArticleCardStatsProps {
  likes: number;
  comments: number;
  liked: boolean;
  likeDisabled?: boolean;
  onLike: () => void;
  onComment: () => void;
}

/**
 * 格式化数字：>= 1000 时显示带 k 后缀的简写，否则直接显示。
 * 例：1200 → "1.2k"，12000 → "12k"，999 → "999"
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    // 如果整除则不显示小数，否则保留一位小数
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(count);
}

// 文章统计数据：仅保留点赞与评论，阅读量不在新版卡片中展示。
export function ArticleCardStats({
  likes,
  comments,
  liked,
  likeDisabled = false,
  onLike,
  onComment,
}: ArticleCardStatsProps) {
  return (
    <div className="flex items-center gap-0.5 text-xs text-[var(--fg3)]">
      <button
        type="button"
        aria-label="喜欢"
        aria-pressed={liked}
        disabled={likeDisabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onLike();
        }}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
          liked ? "text-red-500 hover:text-red-500" : ""
        }`}
      >
        <span className="inline-flex animate-[heartbeat_1.5s_ease-in-out_infinite]">
          <SvgIcon name="heart" size={14} />
        </span>
        <span>{formatCount(likes)}</span>
      </button>

      <button
        type="button"
        aria-label="评论"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onComment();
        }}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <SvgIcon name="message-circle" size={14} />
        <span>{formatCount(comments)}</span>
      </button>
    </div>
  );
}
