"use client";

import type { MomentItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Avatar, Badge, Button, Card, CardContent } from "@repo/ui";
import { LoadingImage } from "@/components/common/loading-image";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";

export type SnippetCardLayout = "standalone" | "embedded";

interface SnippetCardProps {
  snippet: MomentItemResp;
  /** standalone：碎语页独立卡片；embedded：首页区块内嵌条目（无 Card 包裹） */
  layout?: SnippetCardLayout;
  onLike?: (snippet: MomentItemResp) => void;
  likeDisabled?: boolean;
  onComment?: (snippet: MomentItemResp) => void;
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

// 单条碎语：双行 header + 图片网格 + ArticleCardStats 风格操作区
export function SnippetCard({
  snippet,
  layout = "standalone",
  onLike,
  likeDisabled = false,
  onComment,
}: SnippetCardProps) {
  const relativeTime = formatRelativeTime(new Date(snippet.created_at));
  const authorName = snippet.user?.nickname ?? snippet.user?.username ?? "匿名";
  const authorAvatar = snippet.user?.avatar_url ?? "";
  const authorBadge = snippet.user?.mark ?? "";
  const authorInitial = authorName[0]?.toUpperCase() ?? "?";

  const images = snippet.images ?? [];
  const visibleImages = images.slice(0, 2);
  const hiddenCount = Math.max(0, images.length - 2);

  const body = (
    <>
      <div className="mb-2.5 flex items-start gap-2.5">
        <Avatar
          src={authorAvatar || undefined}
          alt={authorName}
          initials={authorInitial}
          size="sm"
          className="size-9 shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{authorName}</span>
            <time className="ml-auto shrink-0 text-[11px] text-(--fg3)">{relativeTime}</time>
          </div>
          {authorBadge && (
            <Badge
              variant="outline"
              className="mt-0.5 rounded-none border-0 bg-transparent px-0 py-0.5 text-[11px] font-normal text-muted-foreground"
            >
              {authorBadge}
            </Badge>
          )}
        </div>
      </div>

      <SnippetContent content={snippet.content} />

      {visibleImages.length > 0 && (
        <div
          className={`mt-2.5 grid gap-1 overflow-hidden rounded-[10px] ${
            visibleImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {visibleImages.map((img) => (
            <div
              key={img.id}
              className="relative aspect-[3/2] w-full overflow-hidden rounded-[6px]"
            >
              <LoadingImage
                src={img.access_url}
                alt={img.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="flex items-center justify-center bg-muted text-xs text-(--fg3)">
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-0.5 text-xs text-(--fg3)">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="喜欢"
          aria-pressed={snippet.is_liked}
          isDisabled={likeDisabled}
          onPress={() => {
            onLike?.(snippet);
          }}
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
          onPress={() => {
            onComment?.(snippet);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-black/54 transition-colors hover:bg-primary/10 hover:text-primary dark:text-(--fg3)"
        >
          <SvgIcon name="message-circle" size={18} />
          <span>{formatCount(snippet.comment_count)}</span>
        </Button>
      </div>
    </>
  );

  if (layout === "embedded") {
    return (
      <article
        data-testid="snippet-card"
        data-layout="embedded"
        className="min-w-0 border-b border-border/40 px-1 py-3 last:border-b-0"
      >
        {body}
      </article>
    );
  }

  return (
    <Card
      data-testid="snippet-card"
      data-layout="standalone"
      className="snippet-card-raised min-w-0 overflow-hidden rounded-2xl border border-border p-0 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]"
    >
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  );
}
