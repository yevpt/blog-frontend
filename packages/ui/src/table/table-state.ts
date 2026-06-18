import type {
  DataTableColumn,
  DataTableSearch,
  DataTableSort,
  DataTableSortDirection,
  DataTableState,
} from "./types";

function isSortConfig<T>(sort: DataTableColumn<T>["sort"]): sort is DataTableSort<T> {
  return typeof sort === "object" && sort !== null;
}

function getSortConfig<T>(column?: DataTableColumn<T>): DataTableSort<T> | undefined {
  if (!column?.sort || column.sort === true) return undefined;
  return column.sort;
}

function normalizeComparableValue(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return value.getTime();
  if (value == null) return "";
  return value;
}

function compareValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
) {
  const normalizedA = normalizeComparableValue(a);
  const normalizedB = normalizeComparableValue(b);

  if (typeof normalizedA === "number" && typeof normalizedB === "number") {
    return normalizedA - normalizedB;
  }

  return String(normalizedA).localeCompare(String(normalizedB), "zh-Hans-CN");
}

export function getDefaultTableState<T>({
  columns,
  defaultState,
  search,
}: {
  columns: Array<DataTableColumn<T>>;
  defaultState?: Partial<DataTableState>;
  search?: DataTableSearch<T>;
}): DataTableState {
  const filters = columns.reduce<Record<string, string | string[]>>((result, column) => {
    if (column.filter) {
      result[column.id] = column.filter.value ?? column.filter.defaultValue ?? "all";
    }
    return result;
  }, {});

  const defaultSortColumn = columns.find((column) => isSortConfig(column.sort));
  const defaultSort = defaultSortColumn
    ? {
        column: defaultSortColumn.id,
        direction: getSortConfig(defaultSortColumn)?.defaultDirection ?? "ascending",
      }
    : undefined;

  return {
    searchValue: search?.value ?? search?.defaultValue ?? defaultState?.searchValue ?? "",
    filters: { ...filters, ...defaultState?.filters },
    sort: defaultState?.sort ?? defaultSort,
  };
}

export function mergeTableState(
  current: DataTableState,
  patch: Partial<DataTableState>,
): DataTableState {
  return {
    ...current,
    ...patch,
    filters: patch.filters ? { ...current.filters, ...patch.filters } : current.filters,
  };
}

export function getNextSort<T>({
  current,
  column,
}: {
  current?: DataTableState["sort"];
  column: DataTableColumn<T>;
}): DataTableState["sort"] {
  if (!column.sort) return current;

  const fallbackDirection: DataTableSortDirection =
    getSortConfig(column)?.defaultDirection ?? "ascending";

  if (current?.column !== column.id) {
    return { column: column.id, direction: fallbackDirection };
  }

  return {
    column: column.id,
    direction: current.direction === "ascending" ? "descending" : "ascending",
  };
}

export function getFilteredSortedRows<T>({
  items,
  columns,
  state,
  search,
}: {
  items: T[];
  columns: Array<DataTableColumn<T>>;
  state: DataTableState;
  search?: DataTableSearch<T>;
}) {
  const keyword = state.searchValue.trim();

  const filteredItems = items.filter((item) => {
    if (keyword && search && !search.match(item, keyword)) {
      return false;
    }

    return columns.every((column) => {
      if (!column.filter) return true;
      const value = state.filters[column.id];
      if (Array.isArray(value)) {
        return (
          value.length === 0 || value.some((itemValue) => column.filter?.match(item, itemValue))
        );
      }
      return column.filter.match(item, value ?? column.filter.defaultValue ?? "all");
    });
  });

  const sortColumn = columns.find((column) => column.id === state.sort?.column);
  const sortConfig = getSortConfig(sortColumn);

  if (!sortConfig || !state.sort) {
    return filteredItems;
  }

  return [...filteredItems].sort((a, b) => {
    const result = compareValues(sortConfig.value(a), sortConfig.value(b));
    return state.sort?.direction === "descending" ? -result : result;
  });
}
