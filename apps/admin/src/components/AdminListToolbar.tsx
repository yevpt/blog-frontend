import type { ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, SearchField, cn } from "@repo/ui";

export interface AdminListToolbarProps {
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
  filters?: ReactNode;
  className?: string;
  searchClassName?: string;
  actionsClassName?: string;
}

export function AdminListToolbar({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  canClear = false,
  onClear,
  filters,
  className,
  searchClassName,
  actionsClassName,
}: AdminListToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <SearchField
        aria-label={searchLabel}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
        className={cn("w-full max-w-none sm:flex-1", searchClassName)}
      />

      {canClear || filters ? (
        <div className={cn("flex items-center gap-2 sm:shrink-0", actionsClassName)}>
          {canClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 px-2.5 text-muted-foreground hover:text-foreground"
              onPress={onClear}
            >
              <SvgIcon name="close" size={14} />
              清除筛选
            </Button>
          ) : null}
          {filters}
        </div>
      ) : null}
    </div>
  );
}
