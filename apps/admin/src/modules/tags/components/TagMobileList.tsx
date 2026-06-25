import { SvgIcon } from "@repo/icons";
import { Button, cn, type DataTableEmptyState } from "@repo/ui";
import { TagNameCell } from "./TagNameCell";
import type { TagRow } from "../model";

interface TagMobileListProps {
  items: TagRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onEdit: (tag: TagRow) => void;
  onDelete: (tag: TagRow) => void;
}

function TagMobileListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 px-3 py-3.5">
          <div className="size-5 rounded bg-muted" />
          <div className="h-6 flex-1 rounded-full bg-muted" />
          <div className="h-4 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function TagMobileEmptyState({ emptyState }: { emptyState?: DataTableEmptyState }) {
  const title = emptyState?.title ?? "暂无数据";
  const description = emptyState?.description ?? "添加数据后会显示在这里。";

  const icon = emptyState?.icon;
  const iconNode =
    icon === false ? null : typeof icon === "string" ? (
      <SvgIcon name={icon} size={28} className="text-muted-foreground" />
    ) : (
      (icon ?? <SvgIcon name="folder" size={28} className="text-muted-foreground" />)
    );

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {iconNode}
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
      {emptyState?.action ? <div className="mt-5">{emptyState.action}</div> : null}
    </div>
  );
}

export function TagMobileList({
  items,
  isLoading = false,
  emptyState,
  onEdit,
  onDelete,
}: TagMobileListProps) {
  if (isLoading) {
    return <TagMobileListSkeleton />;
  }

  if (items.length === 0) {
    return <TagMobileEmptyState emptyState={emptyState} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((tag) => (
        <li key={tag.id} className="flex items-start gap-2.5 px-4 py-3">
          <span
            className={cn(
              "mt-1 w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {tag.seq}
          </span>

          <div className="min-w-0 flex-1">
            <TagNameCell tag={tag} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {tag.url ? `/${tag.url}` : "未设置别名"} · {tag.articleCount} 篇
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onPress={() => onEdit(tag)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => onDelete(tag)}
            >
              删除
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
