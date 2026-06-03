import type { MomentItemResp } from "@repo/api";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";
import { SnippetActions } from "./snippet-actions";

interface SnippetCardProps {
  snippet: MomentItemResp;
}

// 单条碎语，无边框，通过间距分隔（与 ArticleCard 一致）
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";

  return (
    <article
      data-testid="snippet-card"
      className="border-b border-border py-3 last:border-b-0 last:pb-0"
    >
      <div className="flex items-center gap-2">
        <img
          src={authorAvatar}
          alt={authorName}
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold text-foreground">{authorName}</span>
            {authorBadge && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                {authorBadge}
              </span>
            )}
            <time className="ml-auto shrink-0 text-[10px] text-[var(--fg3)]">{relativeTime}</time>
          </div>
        </div>
      </div>

      <div className="pl-[27px]">
        <SnippetContent content={snippet.content} />
      </div>

      <div className="mt-1.5 flex items-center justify-between pl-[27px]">
        <div className="flex gap-3 text-[11px] text-[var(--fg3)]">
          <span>{snippet.like_count} 喜欢</span>
          <span>{snippet.comment_count} 评论</span>
        </div>
        <SnippetActions />
      </div>
    </article>
  );
}
