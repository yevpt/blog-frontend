import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";

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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="喜欢"
        aria-pressed={liked}
        isDisabled={likeDisabled}
        onPress={() => {
          onLike();
        }}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
          liked ? "text-red-500 hover:text-red-500" : "text-black/54 dark:text-[var(--fg3)]"
        }`}
      >
        <span className="inline-flex animate-[heartbeat_1.3s_ease-in-out_infinite]">
          <SvgIcon name="heart" size={21} />
        </span>
        <span>{formatCount(likes)}</span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="评论"
        onPress={() => {
          onComment();
        }}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary text-black/54 dark:text-[var(--fg3)]"
      >
        <SvgIcon name="message-circle" size={21} />
        <span>{formatCount(comments)}</span>
      </Button>
    </div>
  );
}
