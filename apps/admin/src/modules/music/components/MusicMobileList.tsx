import { SvgIcon } from "@repo/icons";
import { Button, type DataTableEmptyState } from "@repo/ui";
import { MusicArtwork } from "./MusicArtwork";
import { MusicStatusBadge } from "./MusicStatusBadge";
import { formatDuration, type MusicRow } from "../model";

interface MusicMobileListProps {
  items: MusicRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onEdit: (row: MusicRow) => void;
  onDelete: (row: MusicRow) => void;
}

function MusicMobileListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3.5">
          <div className="size-11 rounded-md bg-muted" />
          <div className="h-6 flex-1 rounded-full bg-muted" />
          <div className="h-4 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function MusicMobileEmptyState({ emptyState }: { emptyState?: DataTableEmptyState }) {
  const title = emptyState?.title ?? "暂无数据";
  const description = emptyState?.description ?? "添加数据后会显示在这里。";
  const icon = emptyState?.icon;
  const iconNode =
    icon === false ? null : typeof icon === "string" ? (
      <SvgIcon name={icon} size={28} className="text-muted-foreground" />
    ) : (
      (icon ?? <SvgIcon name="music" size={28} className="text-muted-foreground" />)
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

export function MusicMobileList({
  items,
  isLoading = false,
  emptyState,
  onEdit,
  onDelete,
}: MusicMobileListProps) {
  if (isLoading) return <MusicMobileListSkeleton />;
  if (items.length === 0) return <MusicMobileEmptyState emptyState={emptyState} />;

  return (
    <ul className="divide-y divide-border/60">
      {items.map((row) => (
        <li key={row.id} className="flex items-start gap-3 px-4 py-3">
          <MusicArtwork src={row.coverUrl} alt={`${row.name} 封面`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{row.artistDisplayName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MusicStatusBadge isPublic={row.isPublic} />
              <span className="text-xs text-muted-foreground">{formatDuration(row.duration)}</span>
              {row.albumName ? (
                <span className="max-w-32 truncate text-xs text-muted-foreground">
                  {row.albumName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onPress={() => onEdit(row)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => onDelete(row)}
            >
              删除
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
