"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Column,
  Row,
  Table as AriaTable,
  TableBody,
  TableHeader,
  ResizableTableContainer,
} from "react-aria-components";
import { SearchField } from "../search-field";
import { cn } from "../lib/utils";
import { DataTableHeaderCell } from "./table-header-cell";
import {
  getDefaultTableState,
  getFilteredSortedRows,
  getNextSort,
  mergeTableState,
} from "./table-state";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableProps,
  DataTableSearch,
  DataTableSort,
  DataTableState,
} from "./types";

function getColumnAriaSort<T>(column: DataTableColumn<T>, state: DataTableState) {
  if (state.sort?.column !== column.id) return undefined;
  return state.sort.direction;
}

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
  maxHeightClassName = "max-h-[480px]",
  ...labelProps
}: DataTableProps<T>) {
  const [internalState, setInternalState] = useState<DataTableState>(() =>
    getDefaultTableState({ columns, defaultState, search }),
  );
  const tableState = useMemo(
    () => ({
      ...(state ?? internalState),
      searchValue: search?.value ?? state?.searchValue ?? internalState.searchValue,
    }),
    [internalState, search?.value, state],
  );

  const visibleItems = useMemo(
    () => getFilteredSortedRows({ items, columns, state: tableState, search }),
    [columns, items, search, tableState],
  );
  const rowItems = isLoading ? [] : visibleItems;

  function updateTableState(patch: Partial<DataTableState>) {
    const nextState = mergeTableState(tableState, patch);
    if (!state) {
      setInternalState(nextState);
    }
    onStateChange?.(nextState);
  }

  function handleSearchChange(value: string) {
    search?.onChange?.(value);
    updateTableState({ searchValue: value });
  }

  function handleSortChange(column: DataTableColumn<T>) {
    updateTableState({ sort: getNextSort({ current: tableState.sort, column }) });
  }

  function handleFilterChange(columnId: string, value: string) {
    const column = columns.find((item) => item.id === columnId);
    column?.filter?.onChange?.(value);
    updateTableState({ filters: { [columnId]: value } });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {search ? (
          <SearchField
            aria-label={search.placeholder ?? "搜索"}
            placeholder={search.placeholder ?? "搜索"}
            value={tableState.searchValue}
            onChange={handleSearchChange}
            className="max-w-md"
          />
        ) : (
          <span aria-hidden="true" />
        )}
        <p className="text-sm text-muted-foreground">共 {visibleItems.length} 条</p>
      </div>

      <ResizableTableContainer
        className={cn(
          "relative w-full overflow-auto rounded-lg border border-border bg-card",
          maxHeightClassName || undefined,
          className,
        )}
      >
        <AriaTable
          {...labelProps}
          className="w-full border-separate border-spacing-0 box-border text-sm has-[>[data-empty]]:h-full"
        >
          <TableHeader className="sticky top-0 z-10 bg-muted text-muted-foreground">
            {columns.map((column) => (
              <Column
                key={column.id}
                id={column.id}
                isRowHeader={column.isRowHeader}
                width={column.width}
                minWidth={column.minWidth}
                aria-sort={getColumnAriaSort(column, tableState)}
                className={cn(
                  "cursor-default border-b border-border px-3 py-2.5 text-start align-middle font-semibold text-muted-foreground outline-hidden",
                  "focus-within:z-20 data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring",
                  column.headerClassName,
                )}
              >
                <DataTableHeaderCell
                  column={column}
                  sort={tableState.sort}
                  filterValue={tableState.filters[column.id]}
                  onSortChange={handleSortChange}
                  onFilterChange={handleFilterChange}
                />
              </Column>
            ))}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (isLoading ? loadingText : emptyText)}
            className="data-[empty]:text-center data-[empty]:text-sm data-[empty]:italic"
          >
            {rowItems.map((item) => (
              <Row
                key={getRowId(item)}
                id={getRowId(item)}
                className={cn(
                  "group/row cursor-default select-none text-foreground outline-hidden",
                  "hover:bg-muted/60 data-[pressed]:bg-muted",
                  "data-[disabled]:text-muted-foreground",
                  "data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-ring",
                )}
              >
                {columns.map((column) => (
                  <Cell
                    key={column.id}
                    className={cn(
                      "truncate border-b border-border px-3 py-2.5 align-middle outline-hidden",
                      "group-last/row:border-b-0",
                      "data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-ring",
                      column.className,
                    )}
                  >
                    {column.cell(item)}
                  </Cell>
                ))}
              </Row>
            ))}
          </TableBody>
        </AriaTable>
      </ResizableTableContainer>
    </div>
  );
}

export type {
  DataTableColumn,
  DataTableFilter,
  DataTableProps,
  DataTableSearch,
  DataTableSort,
  DataTableState,
};
