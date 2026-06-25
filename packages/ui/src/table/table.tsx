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
  actions,
  total,
  showTotal = true,
  showToolbar = true,
  emptyState,
  emptyText = "暂无数据",
  loadingText = "加载中",
  isLoading = false,
  skeletonRows = 5,
  className,
  classNames,
  maxHeightClassName = "max-h-[480px]",
  embedded = false,
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
  const hasToolbar =
    showToolbar && (Boolean(search) || Boolean(actions) || showTotal);

  return (
    <div
      // react-aria 的 Table/Container 会过滤 aria-busy，故在外层根节点标记加载态
      aria-busy={isLoading || undefined}
      className={cn("grid gap-3", classNames?.root, className)}
    >
      {hasToolbar ? (
        <DataTableToolbar
          search={search}
          searchValue={table.tableState.searchValue}
          total={total ?? table.visibleItems.length}
          showTotal={showTotal}
          actions={actions}
          onSearchChange={table.onSearchChange}
          classNames={classNames}
        />
      ) : null}

      <DataTableView
        labelProps={labelProps}
        columns={columns}
        rowItems={table.rowItems}
        getRowId={getRowId}
        tableState={table.tableState}
        emptyState={emptyState}
        emptyText={emptyText}
        loadingText={loadingText}
        showSkeleton={table.showSkeleton}
        showOverlay={table.showOverlay}
        skeletonRows={skeletonRows}
        classNames={classNames}
        maxHeightClassName={maxHeightClassName}
        embedded={embedded}
        onSortChange={table.onSortChange}
        onFilterChange={table.onFilterChange}
      />
    </div>
  );
}
