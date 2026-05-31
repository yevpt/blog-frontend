import type { Snippet } from "../../app/_mock/types";
import { formatRelativeTime } from "../../lib/format-time";
import { SnippetContent } from "./snippet-content";
import { SnippetActions } from "./snippet-actions";

interface SnippetCardProps {
  snippet: Snippet;
}

// 单条碎语卡片，不需要 'use client'（子组件处理所有交互）
export function SnippetCard({ snippet }: SnippetCardProps) {
  const relativeTime = formatRelativeTime(snippet.publishedAt);

  return (
    <article className="rounded-xl p-4 bg-card border border-border/50">
      {/* 头部：头像 + 作者信息 */}
      <div className="flex items-start gap-3">
        <img
          src={snippet.author.avatar}
          alt={snippet.author.name}
          className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{snippet.author.name}</span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              {snippet.author.badge}
            </span>
          </div>
          <time className="text-xs text-muted-foreground">{relativeTime}</time>
        </div>
      </div>

      {/* 正文：截断+展开 */}
      <SnippetContent content={snippet.content} />

      {/* 统计数据 + 操作按钮 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{snippet.likes} 喜欢</span>
          <span>{snippet.comments} 评论</span>
        </div>
        <SnippetActions />
      </div>
    </article>
  );
}
