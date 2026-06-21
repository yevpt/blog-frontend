"use client";

import { Column, TableHeader } from "react-aria-components";
import { cn } from "../../lib/utils";
import { DataTableHeaderCell } from "./header-cell";
import { toCssMinWidth, toCssWidth } from "../utils/column-size";
import type { DataTableClassNames, DataTableColumn, DataTableState } from "../types";

interface DataTableHeaderProps<T extends object> {
  columns: Array<DataTableColumn<T>>;
  tableState: DataTableState;
  onSortChange: (column: DataTableColumn<T>) => void;
  onFilterChange: (columnId: string, value: string) => void;
  classNames?: DataTableClassNames;
}

function getColumnAriaSort<T>(column: DataTableColumn<T>, state: DataTableState) {
  if (state.sort?.column !== column.id) return undefined;
  return state.sort.direction;
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest("button,a,input,select,textarea,[role='button'],[role='menuitem']"))
    : false;
}

export function DataTableHeader<T extends object>({
  columns,
  tableState,
  onSortChange,
  onFilterChange,
  classNames,
}: DataTableHeaderProps<T>) {
  return (
    <TableHeader
      className={cn("sticky top-0 z-30 bg-muted text-muted-foreground", classNames?.header)}
    >
      {columns.map((column) => (
        <Column
          key={column.id}
          id={column.id}
          isRowHeader={column.isRowHeader}
          // 列宽走 CSS（配合表格 table-layout: fixed），不用 react-aria 的列宽布局状态机
          style={{ width: toCssWidth(column.width), minWidth: toCssMinWidth(column.minWidth) }}
          aria-sort={getColumnAriaSort(column, tableState)}
          onClick={(event) => {
            // 表头整体可排序，但筛选/排序按钮自身的点击不应该冒泡成第二次排序。
            if (!column.sort || isInteractiveElement(event.target)) return;
            onSortChange(column);
          }}
          className={cn(
            "cursor-default border-b border-border px-3 py-2.5 text-start align-middle font-semibold text-muted-foreground outline-hidden",
            "focus-within:z-20 data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring",
            column.sort &&
              "cursor-pointer transition-colors hover:bg-accent/50 data-[pressed]:bg-accent/70",
            classNames?.headerCell,
            column.headerClassName,
          )}
        >
          <DataTableHeaderCell
            column={column}
            sort={tableState.sort}
            filterValue={tableState.filters[column.id]}
            onSortChange={onSortChange}
            onFilterChange={onFilterChange}
            classNames={classNames}
          />
        </Column>
      ))}
    </TableHeader>
  );
}
