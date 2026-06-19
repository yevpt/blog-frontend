"use client";

import { useMemo, useState } from "react";
import {
  getDefaultTableState,
  getFilteredSortedRows,
  getNextSort,
  mergeTableState,
} from "../utils/table-state";
import type { DataTableColumn, DataTableProps, DataTableState } from "../types";

interface UseDataTableParams<T extends object> {
  items: T[];
  columns: Array<DataTableColumn<T>>;
  state?: DataTableState;
  defaultState?: DataTableProps<T>["defaultState"];
  onStateChange?: DataTableProps<T>["onStateChange"];
  search?: DataTableProps<T>["search"];
  isLoading: boolean;
}

export function useDataTable<T extends object>({
  items,
  columns,
  state,
  defaultState,
  onStateChange,
  search,
  isLoading,
}: UseDataTableParams<T>) {
  const [internalState, setInternalState] = useState<DataTableState>(() =>
    getDefaultTableState({ columns, defaultState, search }),
  );

  // DataTable 同时支持受控与非受控；search.value 优先级最高，便于外部接管搜索框。
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
    // 受控模式只通知外部，不写内部 state，避免内外状态短暂分叉。
    if (!state) {
      setInternalState(nextState);
    }
    onStateChange?.(nextState);
  }

  function onSearchChange(value: string) {
    search?.onChange?.(value);
    updateTableState({ searchValue: value });
  }

  function onSortChange(column: DataTableColumn<T>) {
    updateTableState({ sort: getNextSort({ current: tableState.sort, column }) });
  }

  function onFilterChange(columnId: string, value: string) {
    const column = columns.find((item) => item.id === columnId);
    // 列级回调先触发，方便业务方同步自己的筛选条件，再统一抛出完整表格状态。
    column?.filter?.onChange?.(value);
    updateTableState({ filters: { [columnId]: value } });
  }

  return {
    rowItems,
    tableState,
    visibleItems,
    onFilterChange,
    onSearchChange,
    onSortChange,
  };
}
