import { SvgIcon } from "@repo/icons";

interface ArticleCardStatsProps {
  views: number;
  likes: number;
  comments: number;
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

// 文章统计数据：阅读量、点赞数、评论数
export function ArticleCardStats({ views, likes, comments }: ArticleCardStatsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {/* 阅读量 */}
      <span className="flex items-center gap-1">
        <SvgIcon name="eye" size={14} />
        <span>{formatCount(views)}</span>
      </span>

      {/* 点赞数：心形图标带持续跳动动效 */}
      <span className="flex items-center gap-1">
        <span className="animate-[heartbeat_1.5s_ease-in-out_infinite] inline-flex">
          <SvgIcon name="heart" size={14} />
        </span>
        <span>{formatCount(likes)}</span>
      </span>

      {/* 评论数 */}
      <span className="flex items-center gap-1">
        <SvgIcon name="message-circle" size={14} />
        <span>{formatCount(comments)}</span>
      </span>
    </div>
  );
}
