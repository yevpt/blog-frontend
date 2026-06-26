import { Badge, Button, type DataTableEmptyState } from "@repo/ui";
import type { MomentRow } from "../model";

interface MomentMobileListProps {
  items: MomentRow[];
  isLoading: boolean;
  emptyState: DataTableEmptyState;
  onToggleTop: (moment: MomentRow) => void;
  onDelete: (moment: MomentRow) => void;
}

export function MomentMobileList({
  items,
  isLoading,
  emptyState,
  onToggleTop,
  onDelete,
}: MomentMobileListProps) {
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
      {items.map((moment) => (
        <article
          key={moment.id}
          className="min-w-0 rounded-md border border-border/70 bg-background px-3 py-3"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant={moment.status === 1 ? "success" : "secondary"}>
                {moment.statusLabel}
              </Badge>
              {moment.isTop ? <Badge variant="brand">置顶</Badge> : null}
              <span className="truncate text-sm font-medium text-foreground">
                {moment.authorName}
              </span>
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">{moment.content}</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{moment.imageCount} 图</span>
            <span className="truncate">
              {moment.readCount} 读 · {moment.likeCount} 赞 · {moment.commentCount} 评
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onPress={() => onToggleTop(moment)}
            >
              {moment.isTop ? "取消置顶" : "置顶"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => onDelete(moment)}
            >
              删除
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
