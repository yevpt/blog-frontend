import type { ReactNode } from "react";

export type DataTableSortDirection = "ascending" | "descending";

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
  width?: number;
  minWidth?: number;
  className?: string;
  headerClassName?: string;
  isRowHeader?: boolean;
  sort?: boolean | DataTableSort<T>;
  filter?: DataTableFilter<T>;
}

type DataTableAccessibleName =
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
  maxHeightClassName?: string | false;
};
