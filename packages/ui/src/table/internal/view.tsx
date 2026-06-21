"use client";

import { Table as AriaTable, ResizableTableContainer } from "react-aria-components";
import { cn } from "../../lib/utils";
import { DataTableBody } from "./body";
import { DataTableHeader } from "./header";
import { DataTableOverlay } from "./overlay";
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
  labelProps,
  onSortChange,
  onFilterChange,
}: DataTableViewProps<T>) {
  return (
    <div className="relative h-full min-h-0 min-w-0 w-full">
      <ResizableTableContainer
        className={cn(
          "w-full overflow-auto rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:outline-none",
          maxHeightClassName || undefined,
          classNames?.container,
        )}
      >
        <AriaTable
          {...labelProps}
          className={cn(
            "w-full border-separate border-spacing-0 box-border text-sm has-[>[data-empty]]:h-full",
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
      </ResizableTableContainer>

      {showOverlay ? <DataTableOverlay loadingText={loadingText} classNames={classNames} /> : null}
    </div>
  );
}
