"use client";

import { useDataTable } from "./hooks/use-data-table";
import { DataTableToolbar } from "./internal/toolbar";
import { DataTableView } from "./internal/view";
import { cn } from "../lib/utils";
import type { DataTableProps } from "./types";

export function DataTable<T extends object>({
  items,
  columns,
  getRowId,
  state,
  defaultState,
  onStateChange,
  search,
  emptyText = "暂无数据",
  loadingText = "加载中",
  isLoading = false,
  className,
  classNames,
  maxHeightClassName = "max-h-[480px]",
  ...labelProps
}: DataTableProps<T>) {
  const table = useDataTable({
    items,
    columns,
    state,
    defaultState,
    onStateChange,
    search,
    isLoading,
  });

  return (
    <div className={cn("grid gap-3", classNames?.root, className)}>
      <DataTableToolbar
        search={search}
        searchValue={table.tableState.searchValue}
        total={table.visibleItems.length}
        onSearchChange={table.onSearchChange}
        classNames={classNames}
      />

      <DataTableView
        labelProps={labelProps}
        columns={columns}
        rowItems={table.rowItems}
        getRowId={getRowId}
        tableState={table.tableState}
        emptyText={emptyText}
        loadingText={loadingText}
        isLoading={isLoading}
        classNames={classNames}
        maxHeightClassName={maxHeightClassName}
        onSortChange={table.onSortChange}
        onFilterChange={table.onFilterChange}
      />
    </div>
  );
}
