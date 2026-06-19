"use client";

import { SvgIcon } from "@repo/icons";
import { ButtonUtility } from "../../../button-utility/button-utility";
import { cn } from "../../../lib/utils";
import { dataTableHeaderControlClassName } from "./control-class-name";
import type { DataTableColumn, DataTableSortState } from "../../types";

interface DataTableSortButtonProps<T extends object> {
  column: DataTableColumn<T>;
  headerText: string;
  sortDirection?: DataTableSortState["direction"];
  onSortChange: (column: DataTableColumn<T>) => void;
  className?: string;
}

export function DataTableSortButton<T extends object>({
  column,
  headerText,
  sortDirection,
  onSortChange,
  className,
}: DataTableSortButtonProps<T>) {
  const label =
    sortDirection === "ascending"
      ? `${headerText}排序：升序，点击切换为降序`
      : sortDirection === "descending"
        ? `${headerText}排序：降序，点击切换为升序`
        : `${headerText}排序：未排序，点击排序`;

  return (
    <ButtonUtility
      aria-label={label}
      type="button"
      size="xs"
      color="tertiary"
      icon={
        <span
          className={cn(
            "text-muted-foreground transition-colors",
            !sortDirection && "text-muted-foreground/70",
            sortDirection === "ascending" && "text-primary",
            sortDirection === "descending" && "rotate-180 text-primary",
          )}
        >
          <SvgIcon name={sortDirection ? "arrow-up" : "arrow-up-down"} size={14} />
        </span>
      }
      onClick={(event) => {
        // 表头本身也可点击排序，按钮点击需要留在按钮内部，避免触发两次切换。
        event.stopPropagation();
        onSortChange(column);
      }}
      className={cn(dataTableHeaderControlClassName, className)}
    />
  );
}
