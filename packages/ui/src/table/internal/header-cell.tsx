"use client";

import type { ReactNode } from "react";
import { DataTableFilterMenu } from "./header-controls/filter-menu";
import { DataTableSortButton } from "./header-controls/sort-button";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableColumn, DataTableSortState } from "../types";

function getHeaderText(header: ReactNode, fallback: string) {
  // 非字符串表头无法稳定拼进 aria-label，用 column.id 做无障碍文案兜底。
  return typeof header === "string" ? header : fallback;
}

export function DataTableHeaderCell<T extends object>({
  column,
  sort,
  filterValue,
  onSortChange,
  onFilterChange,
  classNames,
}: {
  column: DataTableColumn<T>;
  sort?: DataTableSortState;
  filterValue?: string | string[];
  onSortChange: (column: DataTableColumn<T>) => void;
  onFilterChange: (columnId: string, value: string) => void;
  classNames?: DataTableClassNames;
}) {
  const headerText = getHeaderText(column.header, column.id);
  const isSortedColumn = sort?.column === column.id;
  const sortDirection = isSortedColumn ? sort.direction : undefined;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", classNames?.headerCellContent)}>
      <span className="truncate">{column.header}</span>
      {column.sort && (
        <DataTableSortButton
          column={column}
          headerText={headerText}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          className={classNames?.sortButton}
        />
      )}
      <DataTableFilterMenu
        column={column}
        headerText={headerText}
        filterValue={filterValue}
        onFilterChange={onFilterChange}
        classNames={classNames}
      />
    </div>
  );
}
