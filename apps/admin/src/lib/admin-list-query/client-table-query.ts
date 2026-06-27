import type { DataTableState } from "@repo/ui";
import type { AdminListQueryCodec } from "./types";
import {
  hasActiveListSearch,
  hasActiveListSort,
  hasActiveStringFilters,
  parseListSearch,
  parseListSort,
  parseStringFilter,
  writeListSearch,
  writeListSort,
  writeStringFilter,
} from "./url-params";

export interface ClientTableQueryConfig {
  defaultState: DataTableState;
  sortColumns: readonly string[];
}

function getFilterDefaults(filters: DataTableState["filters"]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      Array.isArray(value) ? String(value[0] ?? "all") : String(value ?? "all"),
    ]),
  );
}

export function createClientTableQueryCodec(
  config: ClientTableQueryConfig,
): AdminListQueryCodec<DataTableState> {
  const { defaultState, sortColumns } = config;
  const filterDefaults = getFilterDefaults(defaultState.filters);

  return {
    defaultState,
    parse(params) {
      const filters = { ...defaultState.filters };
      for (const [key, defaultValue] of Object.entries(filterDefaults)) {
        filters[key] = parseStringFilter(params, key, defaultValue);
      }

      return {
        searchValue: parseListSearch(params, defaultState.searchValue),
        filters,
        sort: parseListSort(params, sortColumns, defaultState.sort),
      };
    },
    write(state) {
      const params = new URLSearchParams();
      writeListSearch(params, state.searchValue);
      writeListSort(params, state.sort, defaultState.sort);

      for (const [key, defaultValue] of Object.entries(filterDefaults)) {
        const value = state.filters[key];
        writeStringFilter(
          params,
          key,
          String(Array.isArray(value) ? (value[0] ?? defaultValue) : (value ?? defaultValue)),
          defaultValue,
        );
      }

      return params;
    },
    hasActive(state) {
      return (
        hasActiveListSearch(state.searchValue) ||
        hasActiveStringFilters(state.filters, filterDefaults) ||
        hasActiveListSort(state.sort, defaultState.sort)
      );
    },
  };
}
