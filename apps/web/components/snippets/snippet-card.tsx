import type { MomentItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";

interface SnippetCardProps {
  snippet: MomentItemResp;
}

/**
 * 格式化数字：>= 1000 时显示带 k 后缀的简写，否则直接显示。
 * 与 ArticleCardStats 保持一致。
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(count);
}

// 单条碎语卡片：独立圆角卡片，双行 header + 图片网格 + ArticleCardStats 风格操作区
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";

  const images = snippet.images ?? [];
  const visibleImages = images.slice(0, 2);
  const hiddenCount = Math.max(0, images.length - 2);

  return (
    <article
      data-testid="snippet-card"
      className="rounded-[14px] bg-[#fafafa] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(124,58,237,0.08)] dark:bg-[#1f1f23]"
    >
      {/* Header: 双行布局 */}
      <div className="mb-2.5 flex items-start gap-2.5">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-9 w-9 shrink-0 rounded-full object-cover shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.2)]">
            {authorName.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{authorName}</span>
            {authorBadge && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary dark:bg-primary/15">
                {authorBadge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {snippet.user?.site && (
              <span className="min-w-0 truncate text-[11px] text-(--fg3)">{snippet.user.site}</span>
            )}
            <time className="ml-auto shrink-0 text-[11px] text-(--fg3)">{relativeTime}</time>
          </div>
        </div>
      </div>

      {/* 正文 */}
      <SnippetContent content={snippet.content} />

      {/* 图片网格 */}
      {visibleImages.length > 0 && (
        <div
          className={`mt-2.5 grid gap-1 overflow-hidden rounded-[10px] ${
            visibleImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {visibleImages.map((img) => (
            <img
              key={img.id}
              src={img.access_url}
              alt={img.name}
              className="max-h-[300px] w-full object-contain"
            />
          ))}
          {hiddenCount > 0 && (
            <div className="flex items-center justify-center bg-muted text-xs text-(--fg3)">
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      {/* 操作区：复用 ArticleCardStats 样式 */}
      <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-border/40 pt-2 text-xs text-(--fg3)">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="喜欢"
          aria-pressed={snippet.is_liked}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
            snippet.is_liked ? "text-red-500 hover:text-red-500" : "text-black/54 dark:text-(--fg3)"
          }`}
        >
          <span className="inline-flex animate-[heartbeat_3s_ease-in-out_infinite]">
            <SvgIcon name={snippet.is_liked ? "heart-fill" : "heart"} size={18} />
          </span>
          <span>{formatCount(snippet.like_count)}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="评论"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-black/54 transition-colors hover:bg-primary/10 hover:text-primary dark:text-(--fg3)"
        >
          <SvgIcon name="message-circle" size={18} />
          <span>{formatCount(snippet.comment_count)}</span>
        </Button>
      </div>
    </article>
  );
}
