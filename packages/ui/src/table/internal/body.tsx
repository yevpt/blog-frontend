"use client";

import { Cell, Row, TableBody } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableColumn, DataTableProps } from "../types";

interface DataTableBodyProps<T extends object> {
  columns: Array<DataTableColumn<T>>;
  rowItems: T[];
  getRowId: DataTableProps<T>["getRowId"];
  emptyText: DataTableProps<T>["emptyText"];
  loadingText: DataTableProps<T>["loadingText"];
  isLoading: boolean;
  classNames?: DataTableClassNames;
}

export function DataTableBody<T extends object>({
  columns,
  rowItems,
  getRowId,
  emptyText,
  loadingText,
  isLoading,
  classNames,
}: DataTableBodyProps<T>) {
  return (
    <TableBody
      renderEmptyState={() => (isLoading ? loadingText : emptyText)}
      className={cn(
        "data-[empty]:text-center data-[empty]:text-sm data-[empty]:italic",
        classNames?.body,
      )}
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
            classNames?.row,
          )}
        >
          {columns.map((column) => (
            <Cell
              key={column.id}
              className={cn(
                "truncate border-b border-border px-3 py-2.5 align-middle outline-hidden",
                "group-last/row:border-b-0",
                "data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-ring",
                classNames?.cell,
                column.className,
              )}
            >
              {column.cell(item)}
            </Cell>
          ))}
        </Row>
      ))}
    </TableBody>
  );
}
