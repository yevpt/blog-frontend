"use client";

import { Table as AriaTable } from "react-aria-components";
import { cn } from "../../lib/utils";
import { DataTableBody } from "./body";
import { DataTableHeader } from "./header";
import { DataTableOverlay } from "./overlay";
import { getMinTableWidth } from "../utils/column-size";
import type {
  DataTableAccessibleName,
  DataTableClassNames,
  DataTableColumn,
  DataTableProps,
  DataTableState,
} from "../types";

interface DataTableViewProps<T extends object> {
  columns: Array<DataTableColumn<T>>;
  rowItems: T[];
  getRowId: DataTableProps<T>["getRowId"];
  tableState: DataTableState;
  emptyState: DataTableProps<T>["emptyState"];
  emptyText: DataTableProps<T>["emptyText"];
  loadingText: DataTableProps<T>["loadingText"];
  showSkeleton: boolean;
  showOverlay: boolean;
  skeletonRows: number;
  classNames?: DataTableClassNames;
  maxHeightClassName?: string | false;
  embedded?: boolean;
  labelProps: DataTableAccessibleName;
  onSortChange: (column: DataTableColumn<T>) => void;
  onFilterChange: (columnId: string, value: string) => void;
}

export function DataTableView<T extends object>({
  columns,
  rowItems,
  getRowId,
  tableState,
  emptyState,
  emptyText,
  loadingText,
  showSkeleton,
  showOverlay,
  skeletonRows,
  classNames,
  maxHeightClassName,
  embedded = false,
  labelProps,
  onSortChange,
  onFilterChange,
}: DataTableViewProps<T>) {
  // 列宽改用纯 CSS（table-layout: fixed）而非 react-aria 的 ResizableTableContainer：
  // 后者会给表格强加 width: min-content，使每次渲染都对所有单元格做固有宽度量算，
  // 排序/翻页等无关 state 变化也会触发整表重排，导致交互 INP 飙高。
  const minTableWidth = getMinTableWidth(columns);

  const tableNode = (
    <AriaTable
      {...labelProps}
      // 容器更窄时由 minWidth 撑出横向滚动，避免内容被压缩裁切
      style={{ minWidth: minTableWidth || undefined }}
      className={cn(
        "w-full table-fixed border-separate border-spacing-0 box-border text-sm has-[>[data-empty]]:h-full",
        classNames?.table,
      )}
    >
      <DataTableHeader
        columns={columns}
        tableState={tableState}
        onSortChange={onSortChange}
        onFilterChange={onFilterChange}
        classNames={classNames}
      />
      <DataTableBody
        columns={columns}
        rowItems={rowItems}
        getRowId={getRowId}
        emptyState={emptyState}
        emptyText={emptyText}
        showSkeleton={showSkeleton}
        skeletonRows={skeletonRows}
        classNames={classNames}
      />
    </AriaTable>
  );

  if (embedded) {
    return (
      <div
        className={cn(
          "relative h-full min-h-0 min-w-0 w-full overflow-auto overscroll-none touch-pan-x touch-pan-y outline-none [-webkit-overflow-scrolling:auto] focus:outline-none focus-visible:outline-none",
          maxHeightClassName || undefined,
          classNames?.container,
        )}
      >
        {tableNode}
        {showOverlay ? <DataTableOverlay loadingText={loadingText} classNames={classNames} /> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full min-h-0 min-w-0 w-full overflow-hidden rounded-lg [contain:paint]",
        classNames?.clip,
      )}
    >
      <div
        className={cn(
          "w-full overflow-auto overscroll-none touch-pan-x touch-pan-y rounded-lg border border-border bg-card outline-none [-webkit-overflow-scrolling:auto] focus:outline-none focus-visible:outline-none",
          maxHeightClassName || undefined,
          classNames?.container,
        )}
      >
        {tableNode}
      </div>

      {showOverlay ? <DataTableOverlay loadingText={loadingText} classNames={classNames} /> : null}
    </div>
  );
}
