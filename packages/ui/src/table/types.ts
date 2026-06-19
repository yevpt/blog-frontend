import type { ReactNode } from "react";

export type DataTableSortDirection = "ascending" | "descending";

/**
 * 列宽，对齐 react-aria `ColumnSize`：
 * - 数字 / `${n}` / `${n}%` 为静态宽度，不参与剩余空间分配；
 * - `${n}fr` 为弹性宽度，按比例吸收容器的剩余宽度（类似 CSS grid 的 fr）。
 * 一张表至少留一个 `fr` 列，固定列之和小于容器时才不会留白。
 */
export type DataTableColumnSize = number | `${number}` | `${number}%` | `${number}fr`;

/** 静态宽度，用于 `minWidth`（弹性单位不可作为下限）。 */
export type DataTableColumnStaticSize = number | `${number}` | `${number}%`;

export interface DataTableSortState {
  column: string;
  direction: DataTableSortDirection;
}

export interface DataTableState {
  searchValue: string;
  filters: Record<string, string | string[]>;
  sort?: DataTableSortState;
}

export interface DataTableOption {
  value: string;
  label: string;
}

export interface DataTableSearch<T> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  match: (item: T, keyword: string) => boolean;
}

export interface DataTableSort<T> {
  defaultDirection?: DataTableSortDirection;
  value: (item: T) => string | number | Date | null | undefined;
}

export interface DataTableFilter<T> {
  type: "single";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: DataTableOption[];
  match: (item: T, value: string) => boolean;
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  width?: DataTableColumnSize;
  minWidth?: DataTableColumnStaticSize;
  className?: string;
  headerClassName?: string;
  isRowHeader?: boolean;
  sort?: boolean | DataTableSort<T>;
  filter?: DataTableFilter<T>;
}

export interface DataTableClassNames {
  root?: string;
  toolbar?: string;
  search?: string;
  resultCount?: string;
  container?: string;
  table?: string;
  header?: string;
  headerCell?: string;
  headerCellContent?: string;
  body?: string;
  row?: string;
  cell?: string;
  sortButton?: string;
  filterButton?: string;
  filterPopover?: string;
  filterMenu?: string;
  filterMenuTitle?: string;
  filterMenuItem?: string;
}

export type DataTableAccessibleName =
  | {
      "aria-label": string;
      "aria-labelledby"?: never;
    }
  | {
      "aria-label"?: never;
      "aria-labelledby": string;
    };

export type DataTableProps<T> = DataTableAccessibleName & {
  items: T[];
  columns: Array<DataTableColumn<T>>;
  getRowId: (item: T) => string;
  state?: DataTableState;
  defaultState?: Partial<DataTableState>;
  onStateChange?: (state: DataTableState) => void;
  search?: DataTableSearch<T>;
  emptyText?: ReactNode;
  loadingText?: ReactNode;
  isLoading?: boolean;
  className?: string;
  classNames?: DataTableClassNames;
  maxHeightClassName?: string | false;
};
