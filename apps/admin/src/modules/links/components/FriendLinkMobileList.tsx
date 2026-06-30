import { SvgIcon } from "@repo/icons";
import { Button, type DataTableEmptyState } from "@repo/ui";
import { FriendLinkDeleteButton } from "./FriendLinkDeleteButton";
import { FriendLinkNameCell } from "./FriendLinkNameCell";
import { FriendLinkStatusBadge } from "./FriendLinkStatusBadge";
import type { FriendLinkRow } from "../model";

interface FriendLinkMobileListProps {
  items: FriendLinkRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onEdit: (link: FriendLinkRow) => void;
  deletingLinkId: string | null;
  onConfirmDelete: (linkId: string) => Promise<void>;
}

function FriendLinkMobileListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3.5">
          <div className="size-11 rounded-[10px] bg-muted" />
          <div className="h-6 flex-1 rounded-full bg-muted" />
          <div className="h-4 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function FriendLinkMobileEmptyState({ emptyState }: { emptyState?: DataTableEmptyState }) {
  const title = emptyState?.title ?? "暂无数据";
  const description = emptyState?.description ?? "添加数据后会显示在这里。";
  const icon = emptyState?.icon;
  const iconNode =
    icon === false ? null : typeof icon === "string" ? (
      <SvgIcon name={icon} size={28} className="text-muted-foreground" />
    ) : (
      (icon ?? <SvgIcon name="link" size={28} className="text-muted-foreground" />)
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

export function FriendLinkMobileList({
  items,
  isLoading = false,
  emptyState,
  onEdit,
  deletingLinkId,
  onConfirmDelete,
}: FriendLinkMobileListProps) {
  if (isLoading) {
    return <FriendLinkMobileListSkeleton />;
  }

  if (items.length === 0) {
    return <FriendLinkMobileEmptyState emptyState={emptyState} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((link) => (
        <li key={link.id} className="flex items-start gap-2 px-4 py-3">
          <span
            className="mt-3 w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {link.seq}
          </span>

          <div className="min-w-0 flex-1">
            <FriendLinkNameCell link={link} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <FriendLinkStatusBadge status={link.status} />
              <span className="truncate text-xs text-muted-foreground">{link.site}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onPress={() => onEdit(link)}
            >
              编辑
            </Button>
            <FriendLinkDeleteButton
              link={link}
              isDeleting={deletingLinkId === link.id}
              onConfirm={onConfirmDelete}
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
