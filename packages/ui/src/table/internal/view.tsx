"use client";

import { Table as AriaTable, ResizableTableContainer } from "react-aria-components";
import { cn } from "../../lib/utils";
import { DataTableBody } from "./body";
import { DataTableHeader } from "./header";
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
  emptyText: DataTableProps<T>["emptyText"];
  loadingText: DataTableProps<T>["loadingText"];
  isLoading: boolean;
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
  emptyText,
  loadingText,
  isLoading,
  classNames,
  maxHeightClassName,
  labelProps,
  onSortChange,
  onFilterChange,
}: DataTableViewProps<T>) {
  return (
    <ResizableTableContainer
      className={cn(
        "relative w-full overflow-auto rounded-lg border border-border bg-card",
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
          emptyText={emptyText}
          loadingText={loadingText}
          isLoading={isLoading}
          classNames={classNames}
        />
      </AriaTable>
    </ResizableTableContainer>
  );
}
