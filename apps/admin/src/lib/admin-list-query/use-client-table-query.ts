import { useCallback } from "react";
import type { DataTableState } from "@repo/ui";
import type { AdminListQueryCodec } from "./types";
import { useAdminListQuery } from "./use-admin-list-query";

export function useClientTableQuery(codec: AdminListQueryCodec<DataTableState>) {
  const { state, patchState, resetListQuery, hasActiveListQuery } = useAdminListQuery(codec);

  const setTableState = useCallback(
    (next: DataTableState | ((previous: DataTableState) => DataTableState)) => {
      patchState((previous) => (typeof next === "function" ? next(previous) : next));
    },
    [patchState],
  );

  const handleSearchChange = useCallback(
    (searchValue: string) => {
      patchState((previous) => ({ ...previous, searchValue }));
    },
    [patchState],
  );

  const handleTableStateChange = useCallback(
    (nextState: DataTableState) => {
      patchState(() => nextState);
    },
    [patchState],
  );

  const setStringFilter = useCallback(
    (key: string, value: string) => {
      patchState((previous) => ({
        ...previous,
        filters: { ...previous.filters, [key]: value },
      }));
    },
    [patchState],
  );

  return {
    tableState: state,
    setTableState,
    handleSearchChange,
    handleTableStateChange,
    setStringFilter,
    resetListQuery,
    hasActiveListQuery,
  };
}
