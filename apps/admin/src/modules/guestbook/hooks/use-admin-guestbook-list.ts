import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminGuestbookPageResp } from "@repo/api";
import { useAdminListQuery, useDebouncedValue } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  guestbookListQueryCodec,
  mapGuestbookToRow,
  type AdminGuestbookListFilters,
  type GuestbookRow,
} from "../model";

export type { AdminGuestbookListFilters };

export interface UseAdminGuestbookListResult {
  rows: GuestbookRow[];
  pageData: AdminGuestbookPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminGuestbookListFilters;
  setSearch: (value: string) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminGuestbookList(): UseAdminGuestbookListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(guestbookListQueryCodec);
  const { page, filters } = state;
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);
  const [pageData, setPageData] = useState<AdminGuestbookPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGuestbook() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.guestbook.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载留言失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadGuestbook();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, reloadToken]);

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
        filters: { search: value },
      }));
    },
    [patchState],
  );

  const rows = useMemo(() => pageData?.list.map(mapGuestbookToRow) ?? [], [pageData]);

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
