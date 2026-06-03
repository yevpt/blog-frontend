import type { Snippet } from "../../app/_mock/types";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";
import { SnippetActions } from "./snippet-actions";

interface SnippetCardProps {
  snippet: Snippet;
}

// 单条碎语，无边框，通过间距分隔（与 ArticleCard 一致）
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(snippet.publishedAt);

  return (
    <article
      data-testid="snippet-card"
      className="border-b border-border py-3 last:border-b-0 last:pb-0"
    >
      <div className="flex items-center gap-2">
        <img
          src={snippet.author.avatar}
          alt={snippet.author.name}
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold text-foreground">
              {snippet.author.name}
            </span>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
              {snippet.author.badge}
            </span>
            <time className="ml-auto shrink-0 text-[10px] text-[var(--fg3)]">{relativeTime}</time>
          </div>
        </div>
      </div>

      <div className="pl-[27px]">
        <SnippetContent content={snippet.content} />
      </div>

      <div className="mt-1.5 flex items-center justify-between pl-[27px]">
        <div className="flex gap-3 text-[11px] text-[var(--fg3)]">
          <span>{snippet.likes} 喜欢</span>
          <span>{snippet.comments} 评论</span>
        </div>
        <SnippetActions />
      </div>
    </article>
  );
}
