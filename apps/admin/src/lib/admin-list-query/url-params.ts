import type { DataTableSortDirection, DataTableSortState } from "@repo/ui";

export const LIST_QUERY_KEYS = {
  page: "page",
  search: "q",
  sort: "sort",
  order: "order",
} as const;

export function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseListPage(params: URLSearchParams, defaultPage = 1): number {
  return parsePositiveInt(params.get(LIST_QUERY_KEYS.page)) ?? defaultPage;
}

export function writeListPage(params: URLSearchParams, page: number, defaultPage = 1): void {
  if (page > defaultPage) {
    params.set(LIST_QUERY_KEYS.page, String(page));
  }
}

export function parseListSearch(params: URLSearchParams, defaultSearch = ""): string {
  return params.get(LIST_QUERY_KEYS.search) ?? defaultSearch;
}

export function writeListSearch(params: URLSearchParams, search: string): void {
  if (search) {
    params.set(LIST_QUERY_KEYS.search, search);
  }
}

export function parseListSort<TColumn extends string>(
  params: URLSearchParams,
  validColumns: readonly TColumn[],
  defaultSort?: DataTableSortState,
): DataTableSortState | undefined {
  const sortColumn = params.get(LIST_QUERY_KEYS.sort);
  const sortOrder = params.get(LIST_QUERY_KEYS.order);

  if (
    sortColumn &&
    validColumns.includes(sortColumn as TColumn) &&
    (sortOrder === "asc" || sortOrder === "desc")
  ) {
    return {
      column: sortColumn,
      direction: sortOrder === "asc" ? "ascending" : "descending",
    };
  }

  return defaultSort;
}

export function writeListSort(
  params: URLSearchParams,
  sort: DataTableSortState | undefined,
  defaultSort?: DataTableSortState,
): void {
  if (!sort) return;
  if (
    defaultSort &&
    sort.column === defaultSort.column &&
    sort.direction === defaultSort.direction
  ) {
    return;
  }

  params.set(LIST_QUERY_KEYS.sort, sort.column);
  params.set(LIST_QUERY_KEYS.order, sort.direction === "ascending" ? "asc" : "desc");
}

export function parseStringFilter(
  params: URLSearchParams,
  key: string,
  defaultValue: string,
): string {
  return params.get(key) ?? defaultValue;
}

export function writeStringFilter(
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
): void {
  if (value !== defaultValue) {
    params.set(key, value);
  }
}

export function hasActiveListSearch(search: string): boolean {
  return search.trim().length > 0;
}

export function hasActiveListPage(page: number, defaultPage = 1): boolean {
  return page > defaultPage;
}

export function hasActiveListSort(
  sort: DataTableSortState | undefined,
  defaultSort?: DataTableSortState,
): boolean {
  if (!sort) return false;
  if (!defaultSort) return true;
  return sort.column !== defaultSort.column || sort.direction !== defaultSort.direction;
}

export function hasActiveStringFilters(
  filters: Record<string, string | string[] | undefined>,
  defaults: Record<string, string>,
): boolean {
  return Object.entries(defaults).some(([key, defaultValue]) => {
    const value = filters[key];
    return String(Array.isArray(value) ? value[0] : (value ?? defaultValue)) !== defaultValue;
  });
}

export function toSortDirection(order: "asc" | "desc"): DataTableSortDirection {
  return order === "asc" ? "ascending" : "descending";
}
