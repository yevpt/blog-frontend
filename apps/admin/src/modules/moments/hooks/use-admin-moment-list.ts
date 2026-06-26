import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminMomentPageResp, AdminMomentStatusFilter } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapMomentToRow, type MomentRow } from "../model";

interface AdminMomentListFilters {
  status: AdminMomentStatusFilter;
  search: string;
}

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
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminMomentList(): UseAdminMomentListResult {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminMomentListFilters>({
    status: "all",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageData, setPageData] = useState<AdminMomentPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const previousDebouncedSearchRef = useRef(debouncedSearch);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) return;
    previousDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

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
        setError(err instanceof Error ? err : new Error("加载动态失败"));
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

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({ ...current, search: value }));
  }, []);

  const setStatus = useCallback((value: AdminMomentStatusFilter) => {
    setPage(1);
    setFilters((current) => ({ ...current, status: value }));
  }, []);

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
    refetch,
  };
}
