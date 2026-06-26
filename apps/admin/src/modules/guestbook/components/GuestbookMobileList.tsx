import { Button, type DataTableEmptyState } from "@repo/ui";
import type { GuestbookRow } from "../model";

interface GuestbookMobileListProps {
  items: GuestbookRow[];
  isLoading: boolean;
  emptyState: DataTableEmptyState;
  onDelete: (message: GuestbookRow) => void;
}

export function GuestbookMobileList({
  items,
  isLoading,
  emptyState,
  onDelete,
}: GuestbookMobileListProps) {
  if (isLoading) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">加载中…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
        {emptyState.description ? (
          <p className="max-w-72 text-sm leading-6 text-muted-foreground">
            {emptyState.description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2 p-3">
      {items.map((message) => (
        <article
          key={message.id}
          className="min-w-0 rounded-md border border-border/70 bg-background px-3 py-3"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">
              {message.authorName}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => onDelete(message)}
            >
              删除
            </Button>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">{message.content}</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>给用户 #{message.ownerUserId}</span>
            <span className="truncate">
              {message.replyCount} 回复 · {message.likeCount} 赞 · {message.createdAt}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
