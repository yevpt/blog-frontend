import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminMomentPageResp, AdminMomentStatusFilter } from "@repo/api";
import { useAdminListQuery, useDebouncedValue } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  mapMomentToRow,
  momentListQueryCodec,
  type AdminMomentListFilters,
  type MomentRow,
} from "../model";

export type { AdminMomentListFilters };

export interface UseAdminMomentListResult {
  rows: MomentRow[];
  pageData: AdminMomentPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminMomentListFilters;
  setSearch: (value: string) => void;
  setStatus: (value: AdminMomentStatusFilter) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminMomentList(): UseAdminMomentListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(momentListQueryCodec);
  const { page, filters } = state;
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);
  const [pageData, setPageData] = useState<AdminMomentPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMoments() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.moments.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          status: filters.status,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载碎语失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadMoments();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filters.status, page, reloadToken]);

  const setPage = useCallback(
    (nextPage: number) => {
      patchState((previous) => ({ ...previous, page: nextPage }));
    },
    [patchState],
  );

  const setSearch = useCallback(
    (value: string) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, search: value },
      }));
    },
    [patchState],
  );

  const setStatus = useCallback(
    (value: AdminMomentStatusFilter) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, status: value },
      }));
    },
    [patchState],
  );

  const rows = useMemo(() => pageData?.list.map(mapMomentToRow) ?? [], [pageData]);

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    setStatus,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
